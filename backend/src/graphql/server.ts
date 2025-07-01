import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import depthLimit from 'graphql-depth-limit';
import { createRateLimitDirective } from 'graphql-rate-limit';
import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { Express } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Import resolvers and loaders
import resolvers from './resolvers';
import { createProductLoader } from './resolvers/product.resolver';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';

// Initialize Prisma
const prisma = new PrismaClient();

// Create PubSub instance (Redis for production, in-memory for development)
const pubsub = process.env.REDIS_HOST
  ? new RedisPubSub({
      publisher: new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      }),
      subscriber: new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      }),
    })
  : new PubSub();

// Rate limit directive
const rateLimitDirective = createRateLimitDirective({
  identifyContext: (ctx) => ctx.user?.id || ctx.ip,
  store: new Map(), // Use Redis in production
});

// Load schema
const typeDefs = readFileSync(
  join(__dirname, 'schema.graphql'),
  'utf-8'
);

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Context function
async function createContext({ req, connection }: any) {
  // For subscriptions
  if (connection) {
    return {
      ...connection.context,
      pubsub,
      prisma,
    };
  }

  // For queries and mutations
  let user = null;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
    } catch (error) {
      // Invalid token
    }
  }

  // Create DataLoaders
  const loaders = {
    product: createProductLoader(),
    // Add more loaders as needed
  };

  return {
    user,
    prisma,
    pubsub,
    loaders,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

// Apollo Server configuration
const apolloServerConfig = {
  schema,
  context: createContext,
  validationRules: [
    depthLimit(5), // Limit query depth
  ],
  formatError: (err: GraphQLError) => {
    // Log errors
    logger.error('GraphQL Error:', err);

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && err.message.includes('Internal server error')) {
      return new GraphQLError('An error occurred');
    }

    return err;
  },
  plugins: [
    {
      async serverWillStart() {
        logger.info('GraphQL server starting...');
      },
      async requestDidStart() {
        return {
          async willSendResponse(requestContext: any) {
            // Log slow queries
            const duration = Date.now() - requestContext.request.http.startTime;
            if (duration > 1000) {
              logger.warn(`Slow GraphQL query (${duration}ms):`, {
                query: requestContext.request.query,
                variables: requestContext.request.variables,
              });
            }
          },
          async didEncounterErrors(requestContext: any) {
            // Log errors with context
            logger.error('GraphQL request error:', {
              errors: requestContext.errors,
              query: requestContext.request.query,
              variables: requestContext.request.variables,
              user: requestContext.context.user?.id,
            });
          },
        };
      },
    },
  ],
  introspection: process.env.NODE_ENV !== 'production', // Disable in production
  playground: process.env.NODE_ENV !== 'production', // Disable in production
};

// Setup GraphQL server with Express
export async function setupGraphQLServer(app: Express, httpServer: any) {
  // Create Apollo Server
  const apolloServer = new ApolloServer(apolloServerConfig);

  // Start Apollo Server
  await apolloServer.start();

  // Apply middleware to Express
  apolloServer.applyMiddleware({
    app,
    path: '/graphql',
    cors: false, // We handle CORS at the app level
  });

  // Setup WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Setup GraphQL WebSocket server
  useServer(
    {
      schema,
      context: async (ctx) => {
        // Get auth token from connection params
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
        let user = null;

        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            user = await prisma.user.findUnique({
              where: { id: decoded.userId },
            });
          } catch (error) {
            throw new Error('Invalid authentication token');
          }
        }

        return {
          user,
          prisma,
          pubsub,
        };
      },
      onConnect: async (ctx) => {
        logger.info('GraphQL WebSocket client connected');
      },
      onDisconnect: async (ctx) => {
        logger.info('GraphQL WebSocket client disconnected');
      },
      onSubscribe: async (ctx, msg) => {
        logger.info('GraphQL subscription:', { subscription: msg });
      },
      onError: async (ctx, msg, errors) => {
        logger.error('GraphQL WebSocket error:', errors);
      },
    },
    wsServer
  );

  logger.info(`🚀 GraphQL server ready at /graphql`);
  logger.info(`🔌 GraphQL subscriptions ready at ws://localhost:${process.env.PORT || 8000}/graphql`);

  return apolloServer;
}

// GraphQL health check
export async function graphQLHealthCheck() {
  try {
    // Simple introspection query
    const result = await apolloServer.executeOperation({
      query: '{ __typename }',
    });

    return {
      status: result.errors ? 'unhealthy' : 'healthy',
      message: result.errors ? result.errors[0].message : 'GraphQL server is healthy',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown
export async function shutdownGraphQLServer() {
  logger.info('Shutting down GraphQL server...');
  
  // Close PubSub connections
  if (pubsub instanceof RedisPubSub) {
    await pubsub.close();
  }
  
  // Close Prisma connection
  await prisma.$disconnect();
  
  logger.info('GraphQL server shut down complete');
}