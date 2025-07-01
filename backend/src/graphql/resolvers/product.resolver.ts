import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { PrismaClient } from '@prisma/client';
import { checkPermission } from '../../middleware/auth.middleware';
import DataLoader from 'dataloader';

const prisma = new PrismaClient();

// DataLoader for batch loading
const createProductLoader = () => new DataLoader<string, any>(async (ids) => {
  const products = await prisma.product.findMany({
    where: { id: { in: ids as string[] } },
    include: {
      subscriptions: true,
      reviews: true,
    },
  });
  
  const productMap = new Map(products.map(p => [p.id, p]));
  return ids.map(id => productMap.get(id));
});

export default {
  Query: {
    product: async (_: any, { id }: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const product = await context.loaders.product.load(id);
      
      if (!product) {
        throw new UserInputError('Product not found');
      }

      return product;
    },

    products: async (_: any, { filter, pagination }: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      const where: any = {};
      
      // Apply filters
      if (filter?.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
        ];
      }
      
      if (filter?.type) {
        where.type = filter.type;
      }
      
      if (filter?.status) {
        where.status = filter.status;
      }
      
      if (filter?.minPrice !== undefined || filter?.maxPrice !== undefined) {
        where.pricing = {};
        if (filter.minPrice !== undefined) {
          where.pricing.monthly = { gte: filter.minPrice };
        }
        if (filter.maxPrice !== undefined) {
          where.pricing.monthly = { ...where.pricing.monthly, lte: filter.maxPrice };
        }
      }

      // Pagination
      const page = pagination?.page || 1;
      const limit = Math.min(pagination?.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Sorting
      const orderBy: any = {};
      if (pagination?.sortBy) {
        orderBy[pagination.sortBy] = pagination.sortOrder || 'asc';
      } else {
        orderBy.createdAt = 'desc';
      }

      // Execute queries
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            subscriptions: true,
            reviews: true,
          },
        }),
        prisma.product.count({ where }),
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        edges: products.map((product, index) => ({
          node: product,
          cursor: Buffer.from(`${skip + index}`).toString('base64'),
        })),
        pageInfo: {
          hasNextPage,
          hasPreviousPage,
          startCursor: products.length > 0 ? Buffer.from(`${skip}`).toString('base64') : null,
          endCursor: products.length > 0 ? Buffer.from(`${skip + products.length - 1}`).toString('base64') : null,
        },
        totalCount,
      };
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: any, context: any) => {
      // Check admin permission
      checkPermission(context.user, 'ADMIN');

      // Validate input
      if (!input.name || !input.description) {
        throw new UserInputError('Name and description are required');
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          features: input.features,
          pricing: input.pricing,
          limits: input.limits || {},
          status: 'ACTIVE',
          metadata: {},
        },
      });

      // Emit event
      context.pubsub.publish('PRODUCT_CREATED', { product });

      return product;
    },

    updateProduct: async (_: any, { id, input }: any, context: any) => {
      // Check admin permission
      checkPermission(context.user, 'ADMIN');

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new UserInputError('Product not found');
      }

      // Update product
      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description && { description: input.description }),
          ...(input.type && { type: input.type }),
          ...(input.features && { features: input.features }),
          ...(input.pricing && { pricing: input.pricing }),
          ...(input.limits && { limits: input.limits }),
          ...(input.status && { status: input.status }),
        },
      });

      // Clear cache
      context.loaders.product.clear(id);

      // Emit event
      context.pubsub.publish('PRODUCT_UPDATED', { product });

      return product;
    },

    deleteProduct: async (_: any, { id }: any, context: any) => {
      // Check admin permission
      checkPermission(context.user, 'ADMIN');

      // Check if product exists and has no active subscriptions
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      if (!product) {
        throw new UserInputError('Product not found');
      }

      if (product.subscriptions.length > 0) {
        throw new UserInputError('Cannot delete product with active subscriptions');
      }

      // Soft delete (set status to INACTIVE)
      await prisma.product.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      // Clear cache
      context.loaders.product.clear(id);

      // Emit event
      context.pubsub.publish('PRODUCT_DELETED', { productId: id });

      return true;
    },

    configureProduct: async (_: any, { id, configuration }: any, context: any) => {
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      // Check if user has access to this product
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: context.user.id,
          productId: id,
          status: 'ACTIVE',
        },
      });

      if (!subscription) {
        throw new ForbiddenError('No active subscription for this product');
      }

      // Update configuration
      const product = await prisma.product.update({
        where: { id },
        data: {
          metadata: {
            ...configuration,
            configuredBy: context.user.id,
            configuredAt: new Date(),
          },
        },
      });

      // Clear cache
      context.loaders.product.clear(id);

      return product;
    },
  },

  Product: {
    averageRating: async (product: any) => {
      if (!product.reviews || product.reviews.length === 0) {
        return null;
      }

      const totalRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
      return totalRating / product.reviews.length;
    },

    pricing: (product: any) => ({
      ...product.pricing,
      currency: product.pricing.currency || 'USD',
    }),

    subscriptions: async (product: any, _: any, context: any) => {
      // Only admins can see all subscriptions
      if (context.user.role !== 'ADMIN' && context.user.role !== 'SUPER_ADMIN') {
        // Regular users can only see their own subscriptions
        return prisma.subscription.findMany({
          where: {
            productId: product.id,
            userId: context.user.id,
          },
        });
      }

      return product.subscriptions || [];
    },
  },
};

// Export loader creator for context
export { createProductLoader };