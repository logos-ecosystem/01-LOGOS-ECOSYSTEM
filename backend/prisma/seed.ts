import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: {
        name: 'SUPER_ADMIN',
        description: 'Full system access'
      }
    }),
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Administrative access'
      }
    }),
    prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: {
        name: 'USER',
        description: 'Standard user access'
      }
    }),
    prisma.role.upsert({
      where: { name: 'SUPPORT' },
      update: {},
      create: {
        name: 'SUPPORT',
        description: 'Support team access'
      }
    })
  ]);

  console.log('✅ Roles created');

  // Create default permissions
  const permissions = [
    // Product permissions
    { name: 'products:read', resource: 'products', action: 'read', description: 'View products' },
    { name: 'products:create', resource: 'products', action: 'create', description: 'Create products' },
    { name: 'products:update', resource: 'products', action: 'update', description: 'Update products' },
    { name: 'products:delete', resource: 'products', action: 'delete', description: 'Delete products' },
    
    // User permissions
    { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
    { name: 'users:create', resource: 'users', action: 'create', description: 'Create users' },
    { name: 'users:update', resource: 'users', action: 'update', description: 'Update users' },
    { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },
    
    // Subscription permissions
    { name: 'subscriptions:read', resource: 'subscriptions', action: 'read', description: 'View subscriptions' },
    { name: 'subscriptions:manage', resource: 'subscriptions', action: 'manage', description: 'Manage subscriptions' },
    
    // Support permissions
    { name: 'tickets:read', resource: 'tickets', action: 'read', description: 'View support tickets' },
    { name: 'tickets:create', resource: 'tickets', action: 'create', description: 'Create support tickets' },
    { name: 'tickets:update', resource: 'tickets', action: 'update', description: 'Update support tickets' },
    { name: 'tickets:assign', resource: 'tickets', action: 'assign', description: 'Assign support tickets' },
    
    // API permissions
    { name: 'api:read', resource: 'api', action: 'read', description: 'Read API data' },
    { name: 'api:write', resource: 'api', action: 'write', description: 'Write API data' },
    { name: 'api:admin', resource: 'api', action: 'admin', description: 'Admin API access' },
    
    // Analytics permissions
    { name: 'analytics:read', resource: 'analytics', action: 'read', description: 'View analytics' },
    { name: 'analytics:export', resource: 'analytics', action: 'export', description: 'Export analytics' },
    
    // System permissions
    { name: 'system:read', resource: 'system', action: 'read', description: 'View system info' },
    { name: 'system:manage', resource: 'system', action: 'manage', description: 'Manage system' },
    { name: 'system:debug', resource: 'system', action: 'debug', description: 'Debug access' }
  ];

  const createdPermissions = await Promise.all(
    permissions.map(perm =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm
      })
    )
  );

  console.log('✅ Permissions created');

  // Assign permissions to roles
  const userRole = roles.find(r => r.name === 'USER')!;
  const adminRole = roles.find(r => r.name === 'ADMIN')!;
  const superAdminRole = roles.find(r => r.name === 'SUPER_ADMIN')!;
  const supportRole = roles.find(r => r.name === 'SUPPORT')!;

  // User permissions
  await prisma.role.update({
    where: { id: userRole.id },
    data: {
      permissions: {
        connect: createdPermissions
          .filter(p => ['products:read', 'products:create', 'products:update', 'tickets:read', 'tickets:create', 'api:read', 'api:write', 'analytics:read'].includes(p.name))
          .map(p => ({ id: p.id }))
      }
    }
  });

  // Support permissions
  await prisma.role.update({
    where: { id: supportRole.id },
    data: {
      permissions: {
        connect: createdPermissions
          .filter(p => p.name.startsWith('tickets:') || ['users:read', 'products:read'].includes(p.name))
          .map(p => ({ id: p.id }))
      }
    }
  });

  // Admin gets all permissions except system:debug
  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
      permissions: {
        connect: createdPermissions
          .filter(p => p.name !== 'system:debug')
          .map(p => ({ id: p.id }))
      }
    }
  });

  // Super Admin gets ALL permissions
  await prisma.role.update({
    where: { id: superAdminRole.id },
    data: {
      permissions: {
        connect: createdPermissions.map(p => ({ id: p.id }))
      }
    }
  });

  console.log('✅ Permissions assigned to roles');

  // Create subscription plans
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: 'Free' },
      update: {},
      create: {
        name: 'Free',
        description: 'Perfecto para comenzar',
        price: 0,
        currency: 'usd',
        interval: 'monthly',
        stripePriceId: 'price_free',
        stripeProductId: 'prod_free',
        features: [
          '1 Bot básico',
          '1,000 llamadas API/mes',
          '1GB almacenamiento',
          'Soporte por email',
          'Actualizaciones básicas'
        ],
        limits: {
          maxBots: 1,
          maxApiCalls: 1000,
          maxStorageGB: 1,
          maxTeamMembers: 1,
          customIntegrations: false,
          prioritySupport: false,
          dedicatedAccount: false
        },
        apiRateLimit: 100
      }
    }),
    prisma.plan.upsert({
      where: { name: 'Starter' },
      update: {},
      create: {
        name: 'Starter',
        description: 'Para equipos pequeños',
        price: 29,
        currency: 'usd',
        interval: 'monthly',
        stripePriceId: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter',
        stripeProductId: 'prod_starter',
        features: [
          '5 Bots personalizados',
          '10,000 llamadas API/mes',
          '10GB almacenamiento',
          'Integraciones básicas',
          'Soporte prioritario',
          'Analytics básico'
        ],
        limits: {
          maxBots: 5,
          maxApiCalls: 10000,
          maxStorageGB: 10,
          maxTeamMembers: 3,
          customIntegrations: true,
          prioritySupport: true,
          dedicatedAccount: false
        },
        apiRateLimit: 500
      }
    }),
    prisma.plan.upsert({
      where: { name: 'Professional' },
      update: {},
      create: {
        name: 'Professional',
        description: 'Para empresas en crecimiento',
        price: 99,
        currency: 'usd',
        interval: 'monthly',
        stripePriceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional',
        stripeProductId: 'prod_professional',
        features: [
          '20 Bots avanzados',
          '100,000 llamadas API/mes',
          '100GB almacenamiento',
          'Integraciones ilimitadas',
          'Soporte 24/7',
          'Analytics avanzado',
          'API personalizada',
          'Webhooks ilimitados'
        ],
        limits: {
          maxBots: 20,
          maxApiCalls: 100000,
          maxStorageGB: 100,
          maxTeamMembers: 10,
          customIntegrations: true,
          prioritySupport: true,
          dedicatedAccount: false
        },
        apiRateLimit: 2000
      }
    }),
    prisma.plan.upsert({
      where: { name: 'Enterprise' },
      update: {},
      create: {
        name: 'Enterprise',
        description: 'Solución completa empresarial',
        price: 299,
        currency: 'usd',
        interval: 'monthly',
        stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise',
        stripeProductId: 'prod_enterprise',
        features: [
          'Bots ilimitados',
          'Llamadas API ilimitadas',
          '1TB almacenamiento',
          'Integraciones empresariales',
          'Soporte dedicado',
          'SLA garantizado',
          'Capacitación personalizada',
          'Desarrollo a medida',
          'Seguridad avanzada'
        ],
        limits: {
          maxBots: -1, // Unlimited
          maxApiCalls: -1, // Unlimited
          maxStorageGB: 1000,
          maxTeamMembers: -1, // Unlimited
          customIntegrations: true,
          prioritySupport: true,
          dedicatedAccount: true
        },
        apiRateLimit: 10000
      }
    })
  ]);

  console.log('✅ Subscription plans created');

  // Create demo admin user (only in development)
  if (process.env.NODE_ENV === 'development') {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@logos-ecosystem.com' },
      update: {},
      create: {
        email: 'admin@logos-ecosystem.com',
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
        roleId: adminRole.id,
        isActive: true,
        isVerified: true,
        emailVerified: true
      }
    });

    console.log('✅ Demo admin user created');
    console.log('   Email: admin@logos-ecosystem.com');
    console.log('   Password: admin123');
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });