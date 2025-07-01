import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@logos-ecosystem.com' },
    update: {},
    create: {
      email: 'admin@logos-ecosystem.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      notificationPreferences: JSON.stringify({
        email: true,
        browser: true,
        categories: {
          system: true,
          payment: true,
          security: true,
          bot: true,
          support: true,
          usage: true
        }
      })
    }
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create test user
  const testPassword = await bcrypt.hash('test123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@logos-ecosystem.com' },
    update: {},
    create: {
      email: 'test@logos-ecosystem.com',
      username: 'testuser',
      password: testPassword,
      role: 'USER',
      isActive: true,
      isVerified: true,
      stripeCustomerId: 'cus_test_' + uuidv4().substring(0, 14)
    }
  });

  console.log('✅ Test user created:', testUser.email);

  // Create products
  const products = [
    {
      name: 'LOGOS AI Expert Bot - Starter',
      description: 'Perfect for small teams getting started with AI',
      features: [
        '1 AI Bot Instance',
        '1,000 requests/month',
        'Basic analytics',
        'Email support',
        'API access'
      ],
      price: 29,
      currency: 'USD',
      isActive: true,
      stripeProductId: 'prod_starter_' + uuidv4().substring(0, 8),
      stripePriceId: 'price_starter_' + uuidv4().substring(0, 8)
    },
    {
      name: 'LOGOS AI Expert Bot - Professional',
      description: 'For growing businesses that need more power',
      features: [
        '5 AI Bot Instances',
        '10,000 requests/month',
        'Advanced analytics',
        'Priority support',
        'Custom integrations',
        'Webhook support'
      ],
      price: 99,
      currency: 'USD',
      isActive: true,
      stripeProductId: 'prod_pro_' + uuidv4().substring(0, 8),
      stripePriceId: 'price_pro_' + uuidv4().substring(0, 8)
    },
    {
      name: 'LOGOS AI Expert Bot - Enterprise',
      description: 'Unlimited power for large organizations',
      features: [
        'Unlimited AI Bot Instances',
        'Unlimited requests',
        'Real-time analytics',
        '24/7 dedicated support',
        'Custom AI models',
        'On-premise deployment',
        'SLA guarantee'
      ],
      price: 499,
      currency: 'USD',
      isActive: true,
      stripeProductId: 'prod_enterprise_' + uuidv4().substring(0, 8),
      stripePriceId: 'price_enterprise_' + uuidv4().substring(0, 8)
    }
  ];

  for (const productData of products) {
    const product = await prisma.product.upsert({
      where: { name: productData.name },
      update: productData,
      create: {
        ...productData,
        userId: adminUser.id,
        features: JSON.stringify(productData.features)
      }
    });
    console.log('✅ Product created:', product.name);
  }

  // Create sample notifications
  const notifications = [
    {
      userId: testUser.id,
      type: 'info',
      category: 'system',
      title: 'Welcome to LOGOS Ecosystem!',
      message: 'Thank you for joining. Explore our AI-powered solutions.',
      priority: 'medium',
      read: false
    },
    {
      userId: testUser.id,
      type: 'success',
      category: 'payment',
      title: 'Payment Method Added',
      message: 'Your payment method has been successfully added.',
      priority: 'low',
      read: true
    }
  ];

  for (const notificationData of notifications) {
    await prisma.notification.create({
      data: notificationData
    });
  }
  console.log('✅ Sample notifications created');

  // Create initial usage record for test user
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  await prisma.usage.upsert({
    where: {
      userId_period: {
        userId: testUser.id,
        period: currentMonth
      }
    },
    update: {},
    create: {
      userId: testUser.id,
      period: currentMonth,
      apiCalls: JSON.stringify({ used: 0, limit: 1000 }),
      storage: JSON.stringify({ used: 0, limit: 5000 }),
      bandwidth: JSON.stringify({ used: 0, limit: 10000 }),
      aiTokens: JSON.stringify({ used: 0, limit: 100000 })
    }
  });
  console.log('✅ Initial usage record created');

  // Create sample API key
  await prisma.apiKey.create({
    data: {
      userId: testUser.id,
      name: 'Development API Key',
      key: 'sk_test_' + uuidv4().replace(/-/g, ''),
      permissions: ['read', 'write'],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  });
  console.log('✅ Sample API key created');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });