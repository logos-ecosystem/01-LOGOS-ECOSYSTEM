/**
 * LOGOS Ecosystem SDK - Quick Start Examples
 * 
 * This file demonstrates basic usage of the LOGOS Ecosystem SDK
 */

const LogosEcosystemSDK = require('../javascript/logos-ecosystem-sdk');

// Initialize SDK
const logos = new LogosEcosystemSDK({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.logos-ecosystem.com', // or http://localhost:8000 for development
  debug: true // Enable debug logging
});

async function quickStart() {
  try {
    console.log('🚀 LOGOS Ecosystem SDK Quick Start\n');

    // 1. Authentication
    console.log('1️⃣ Authenticating...');
    const authResult = await logos.auth.login('demo@logos-ecosystem.com', 'demo123');
    console.log('✅ Logged in successfully:', authResult.data.user.email);
    console.log();

    // 2. List Available Products
    console.log('2️⃣ Fetching available products...');
    const products = await logos.products.list({ status: 'active' });
    console.log(`✅ Found ${products.data.length} products:`);
    products.data.forEach(product => {
      console.log(`   - ${product.name}: $${product.pricing.monthly}/mo`);
    });
    console.log();

    // 3. Create a Subscription
    console.log('3️⃣ Creating a subscription...');
    const subscription = await logos.subscriptions.create({
      productId: products.data[0].id,
      billingCycle: 'monthly',
      paymentMethodId: 'pm_card_visa' // Test payment method
    });
    console.log('✅ Subscription created:', subscription.data.id);
    console.log();

    // 4. Create an AI Bot
    console.log('4️⃣ Creating an AI bot...');
    const bot = await logos.ai.createBot({
      name: 'Customer Support Bot',
      model: 'gpt-4',
      description: 'AI bot for customer support',
      configuration: {
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful customer support assistant.'
      }
    });
    console.log('✅ AI Bot created:', bot.data.name);
    console.log();

    // 5. Chat with the Bot
    console.log('5️⃣ Chatting with AI bot...');
    const chatResponse = await logos.ai.chat(bot.data.id, 'Hello! How can I get started?');
    console.log('🤖 Bot response:', chatResponse.data.message);
    console.log();

    // 6. Get Analytics Dashboard
    console.log('6️⃣ Fetching analytics...');
    const analytics = await logos.analytics.getDashboard('7d');
    console.log('✅ Analytics for last 7 days:');
    console.log(`   - Total API calls: ${analytics.data.apiCalls}`);
    console.log(`   - Active bots: ${analytics.data.activeBots}`);
    console.log(`   - Storage used: ${analytics.data.storageUsed} GB`);
    console.log();

    // 7. Create a Support Ticket
    console.log('7️⃣ Creating support ticket...');
    const ticket = await logos.support.createTicket({
      subject: 'Need help with API integration',
      description: 'I\'m having trouble connecting to the WebSocket endpoint',
      category: 'technical',
      priority: 'medium'
    });
    console.log('✅ Support ticket created:', ticket.data.ticketNumber);
    console.log();

    // 8. Set up Webhook
    console.log('8️⃣ Setting up webhook...');
    const webhook = await logos.webhooks.create({
      url: 'https://your-app.com/webhooks/logos',
      events: ['subscription.created', 'subscription.cancelled', 'invoice.paid'],
      secret: 'your-webhook-secret'
    });
    console.log('✅ Webhook created:', webhook.data.id);
    console.log();

    // 9. Real-time Updates with WebSocket
    console.log('9️⃣ Connecting to WebSocket for real-time updates...');
    const ws = logos.connectWebSocket();
    
    ws.on('connected', () => {
      console.log('✅ WebSocket connected');
      
      // Subscribe to events
      ws.send('subscribe', {
        events: ['notification', 'bot.update', 'usage.alert']
      });
    });

    ws.on('notification', (data) => {
      console.log('📬 New notification:', data.message);
    });

    ws.on('bot.update', (data) => {
      console.log('🤖 Bot update:', data);
    });

    ws.on('usage.alert', (data) => {
      console.log('⚠️ Usage alert:', data);
    });

    // Connect WebSocket
    ws.connect();

    // 10. Export Data
    console.log('\n🔟 Exporting usage data...');
    const exportData = await logos.analytics.exportData('usage', 'csv', {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log('✅ Data export URL:', exportData.data.downloadUrl);

    console.log('\n✨ Quick start completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Advanced Examples
async function advancedExamples() {
  console.log('\n📚 Advanced Examples\n');

  // Pagination
  console.log('📄 Paginated requests:');
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const invoices = await logos.invoices.list({
      page,
      limit: 10,
      status: 'paid'
    });
    
    console.log(`Page ${page}: ${invoices.data.length} invoices`);
    
    hasMore = page < invoices.pagination.totalPages;
    page++;
  }

  // Error Handling
  console.log('\n❌ Error handling:');
  try {
    await logos.products.get('invalid-id');
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('Product not found');
    } else if (error.statusCode === 401) {
      console.log('Authentication required');
      // Refresh token or re-login
    } else if (error.statusCode === 429) {
      console.log('Rate limit exceeded, retry after:', error.response.details.retryAfter);
    }
  }

  // Batch Operations
  console.log('\n🔄 Batch operations:');
  const productIds = ['prod_1', 'prod_2', 'prod_3'];
  const productPromises = productIds.map(id => logos.products.get(id));
  const products = await Promise.all(productPromises);
  console.log(`Fetched ${products.length} products in parallel`);

  // File Uploads
  console.log('\n📤 File upload example:');
  const formData = new FormData();
  formData.append('file', fileBlob, 'document.pdf');
  formData.append('description', 'Invoice attachment');
  
  const upload = await logos.request('POST', '/api/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  console.log('File uploaded:', upload.data.url);
}

// Webhook Handler Example
function webhookHandler(req, res) {
  const signature = req.headers['x-logos-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(payload, signature, 'your-webhook-secret');
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Handle different event types
  switch (payload.event) {
    case 'subscription.created':
      console.log('New subscription:', payload.data);
      // Handle new subscription
      break;
      
    case 'subscription.cancelled':
      console.log('Subscription cancelled:', payload.data);
      // Handle cancellation
      break;
      
    case 'invoice.paid':
      console.log('Invoice paid:', payload.data);
      // Handle payment
      break;
      
    default:
      console.log('Unknown event:', payload.event);
  }
  
  res.status(200).json({ received: true });
}

// Utility function to verify webhook signatures
function verifyWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// Run examples
if (require.main === module) {
  quickStart()
    .then(() => advancedExamples())
    .catch(console.error);
}

module.exports = {
  quickStart,
  advancedExamples,
  webhookHandler
};