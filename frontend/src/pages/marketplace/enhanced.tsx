import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Dynamic import for Chart.js
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface AIBot {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  features: string[];
  icon: string;
  color: string;
  badge?: string;
}

const aiBotsData: AIBot[] = [
  {
    id: '1',
    name: 'CodeMaster Pro',
    description: 'Advanced AI assistant for software development with real-time code analysis',
    category: 'Development',
    price: 299,
    rating: 4.9,
    reviews: 1250,
    features: ['Code Generation', 'Bug Detection', 'Performance Optimization', 'Multi-language Support'],
    icon: 'fas fa-code',
    color: '#4870FF',
    badge: 'BESTSELLER'
  },
  {
    id: '2',
    name: 'DataMind Analytics',
    description: 'Powerful data analysis and visualization AI with predictive capabilities',
    category: 'Analytics',
    price: 399,
    rating: 4.8,
    reviews: 856,
    features: ['Real-time Analytics', 'Predictive Modeling', 'Custom Dashboards', 'API Integration'],
    icon: 'fas fa-chart-line',
    color: '#00F6FF'
  },
  {
    id: '3',
    name: 'ContentGenius',
    description: 'Creative AI for content generation, SEO optimization, and marketing',
    category: 'Marketing',
    price: 199,
    rating: 4.7,
    reviews: 2100,
    features: ['Content Creation', 'SEO Optimization', 'A/B Testing', 'Social Media Integration'],
    icon: 'fas fa-pen-fancy',
    color: '#FFD700',
    badge: 'NEW'
  },
  {
    id: '4',
    name: 'SecureShield AI',
    description: 'Enterprise-grade security AI with quantum-resistant encryption',
    category: 'Security',
    price: 599,
    rating: 5.0,
    reviews: 432,
    features: ['Threat Detection', 'Quantum Encryption', 'Compliance Monitoring', '24/7 Protection'],
    icon: 'fas fa-shield-alt',
    color: '#FF5757'
  },
  {
    id: '5',
    name: 'VoiceAssist Pro',
    description: 'Natural language processing AI with multi-lingual voice capabilities',
    category: 'Communication',
    price: 149,
    rating: 4.6,
    reviews: 1890,
    features: ['Voice Recognition', '50+ Languages', 'Real-time Translation', 'Custom Commands'],
    icon: 'fas fa-microphone',
    color: '#47FF88'
  },
  {
    id: '6',
    name: 'AutomateFlow',
    description: 'Workflow automation AI that streamlines business processes',
    category: 'Automation',
    price: 349,
    rating: 4.8,
    reviews: 567,
    features: ['Process Automation', 'Integration Hub', 'Custom Workflows', 'Performance Analytics'],
    icon: 'fas fa-robot',
    color: '#FF47FF'
  }
];

const categories = ['All', 'Development', 'Analytics', 'Marketing', 'Security', 'Communication', 'Automation'];

export default function EnhancedMarketplace() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [filteredBots, setFilteredBots] = useState(aiBotsData);
  const [cart, setCart] = useState<string[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ title: '', message: '' });

  useEffect(() => {
    // Create matrix rain effect
    createMatrixRain();
    // Create particles
    createParticles();
    // Filter and sort bots
    filterAndSortBots();
  }, [selectedCategory, searchQuery, sortBy]);

  const createMatrixRain = () => {
    const matrixBg = document.getElementById('marketplaceMatrix');
    if (!matrixBg) return;
    
    const columns = Math.floor(window.innerWidth / 20);
    
    for (let i = 0; i < columns; i++) {
      const column = document.createElement('div');
      column.className = 'matrix-column';
      column.style.left = i * 20 + 'px';
      column.style.animationDelay = Math.random() * 20 + 's';
      column.textContent = generateRandomChars(50);
      matrixBg.appendChild(column);
    }
  };

  const generateRandomChars = (length: number) => {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createParticles = () => {
    const particlesContainer = document.getElementById('marketplaceParticles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      particlesContainer.appendChild(particle);
    }
  };

  const filterAndSortBots = () => {
    let filtered = aiBotsData;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(bot => bot.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(bot => 
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        filtered.sort((a, b) => b.reviews - a.reviews);
        break;
      default:
        // Featured (default order)
        break;
    }

    setFilteredBots(filtered);
  };

  const showNotificationFunc = (title: string, message: string) => {
    setNotification({ title, message });
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  };

  const addToCart = (botId: string) => {
    if (!cart.includes(botId)) {
      setCart([...cart, botId]);
      const bot = aiBotsData.find(b => b.id === botId);
      showNotificationFunc('Added to Cart', `${bot?.name} has been added to your cart!`);
    } else {
      showNotificationFunc('Already in Cart', 'This item is already in your cart');
    }
  };

  const buyNow = (botId: string) => {
    const bot = aiBotsData.find(b => b.id === botId);
    showNotificationFunc('Proceeding to Checkout', `Purchasing ${bot?.name}...`);
    // Redirect to checkout
    setTimeout(() => {
      router.push(`/checkout?bot=${botId}`);
    }, 1000);
  };

  return (
    <>
      <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" />
      
      {/* Matrix Background */}
      <div className="matrix-bg" id="marketplaceMatrix"></div>
      
      {/* Hero Section */}
      <section className="marketplace-hero">
        <div className="hero-bg"></div>
        <div className="particles" id="marketplaceParticles"></div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">LOGOS AI Marketplace</h1>
            <p className="hero-subtitle">Discover powerful AI agents to transform your business</p>
            
            {/* Search Bar */}
            <div className="search-container">
              <input
                type="text"
                className="marketplace-search"
                placeholder="Search for AI agents, features, or capabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="search-button">
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="container">
          <div className="filters-container">
            <div className="category-filters">
              {categories.map(category => (
                <button
                  key={category}
                  className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="sort-controls">
              <select 
                className="sort-select" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>
          </div>
          
          <div className="results-info">
            <span>{filteredBots.length} AI agents found</span>
            {cart.length > 0 && (
              <span className="cart-info">
                <i className="fas fa-shopping-cart"></i> {cart.length} items in cart
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="container">
          <div className="products-grid">
            {filteredBots.map((bot) => (
              <div key={bot.id} className="product-card">
                {bot.badge && <div className="product-badge">{bot.badge}</div>}
                
                <div className="product-icon" style={{ background: bot.color }}>
                  <i className={bot.icon}></i>
                </div>
                
                <h3 className="product-name">{bot.name}</h3>
                <p className="product-description">{bot.description}</p>
                
                <div className="product-category">{bot.category}</div>
                
                <div className="product-features">
                  {bot.features.slice(0, 3).map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                  {bot.features.length > 3 && (
                    <span className="feature-tag">+{bot.features.length - 3} more</span>
                  )}
                </div>
                
                <div className="product-stats">
                  <div className="rating">
                    <i className="fas fa-star"></i>
                    <span>{bot.rating}</span>
                  </div>
                  <div className="reviews">({bot.reviews} reviews)</div>
                </div>
                
                <div className="product-price">
                  <span className="currency">$</span>
                  <span className="amount">{bot.price}</span>
                  <span className="period">/month</span>
                </div>
                
                <div className="product-actions">
                  <button className="btn-add-cart" onClick={() => addToCart(bot.id)}>
                    <i className="fas fa-cart-plus"></i> Add to Cart
                  </button>
                  <button className="btn-buy-now" onClick={() => buyNow(bot.id)}>
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredBots.length === 0 && (
            <div className="empty-state">
              <i className="fas fa-search" style={{ fontSize: '4rem', opacity: 0.3 }}></i>
              <h3>No AI agents found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="marketplace-stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-robot"></i></div>
              <div className="stat-value">150+</div>
              <div className="stat-label">AI Agents</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-users"></i></div>
              <div className="stat-value">50K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-star"></i></div>
              <div className="stat-value">4.8/5</div>
              <div className="stat-label">Average Rating</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon"><i className="fas fa-shield-alt"></i></div>
              <div className="stat-value">100%</div>
              <div className="stat-label">Secure</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="marketplace-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to transform your business with AI?</h2>
            <p>Join thousands of companies already using LOGOS AI agents</p>
            <button className="cta-button" onClick={() => router.push('/auth/register')}>
              <i className="fas fa-rocket"></i> Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Notification */}
      <div className={`notification ${showNotification ? 'show' : ''}`}>
        <div className="notification-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="notification-content">
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
        </div>
      </div>

      <style jsx>{`
        /* Marketplace Hero */
        .marketplace-hero {
          min-height: 60vh;
          display: flex;
          align-items: center;
          padding-top: 80px;
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at center, rgba(72, 112, 255, 0.1) 0%, transparent 50%);
        }

        .hero-content {
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 800;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient 5s ease infinite;
          background-size: 200% 200%;
        }

        .hero-subtitle {
          font-size: 1.5rem;
          opacity: 0.8;
          margin-bottom: 3rem;
        }

        /* Search Container */
        .search-container {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }

        .marketplace-search {
          width: 100%;
          padding: 1.25rem 4rem 1.25rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.3);
          border-radius: 50px;
          font-size: 1.1rem;
          color: var(--text-dark);
          transition: all 0.3s;
        }

        .marketplace-search:focus {
          outline: none;
          border-color: var(--secondary);
          box-shadow: 0 0 30px rgba(0, 246, 255, 0.3);
          background: rgba(255, 255, 255, 0.08);
        }

        .search-button {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .search-button:hover {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 5px 20px rgba(72, 112, 255, 0.4);
        }

        /* Filters Section */
        .filters-section {
          padding: 3rem 0;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(72, 112, 255, 0.1);
          border-bottom: 1px solid rgba(72, 112, 255, 0.1);
        }

        .filters-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        .category-filters {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 25px;
          color: var(--text-dark);
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.95rem;
        }

        .filter-button:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: var(--primary);
        }

        .filter-button.active {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 15px rgba(72, 112, 255, 0.3);
        }

        .sort-select {
          padding: 0.75rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: var(--text-dark);
          cursor: pointer;
          font-size: 0.95rem;
        }

        .results-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-secondary);
        }

        .cart-info {
          color: var(--secondary);
        }

        /* Products Section */
        .products-section {
          padding: 4rem 0;
          min-height: 60vh;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .product-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .product-card:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.4);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .product-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .product-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          color: white;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .product-name {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .product-description {
          color: var(--text-secondary);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .product-category {
          display: inline-block;
          background: rgba(72, 112, 255, 0.1);
          color: var(--primary);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .product-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .feature-tag {
          background: rgba(0, 246, 255, 0.1);
          color: var(--secondary);
          padding: 0.25rem 0.75rem;
          border-radius: 15px;
          font-size: 0.75rem;
        }

        .product-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--accent);
        }

        .reviews {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .product-price {
          display: flex;
          align-items: baseline;
          margin-bottom: 1.5rem;
        }

        .currency {
          font-size: 1.25rem;
          opacity: 0.7;
        }

        .amount {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
          margin: 0 0.25rem;
        }

        .period {
          opacity: 0.7;
        }

        .product-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .btn-add-cart,
        .btn-buy-now {
          padding: 0.875rem 1.5rem;
          border-radius: 25px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-add-cart {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid var(--primary);
          color: var(--primary);
        }

        .btn-add-cart:hover {
          background: rgba(72, 112, 255, 0.1);
          transform: translateY(-2px);
        }

        .btn-buy-now {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(72, 112, 255, 0.3);
        }

        .btn-buy-now:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(72, 112, 255, 0.4);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem;
        }

        .empty-state h3 {
          margin: 1rem 0;
          color: var(--text-secondary);
        }

        .empty-state p {
          color: var(--text-secondary);
          opacity: 0.7;
        }

        /* Stats Section */
        .marketplace-stats {
          padding: 4rem 0;
          background: rgba(72, 112, 255, 0.02);
          border-top: 1px solid rgba(72, 112, 255, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid rgba(72, 112, 255, 0.1);
          transition: all 0.3s;
        }

        .stat-item:hover {
          transform: translateY(-5px);
          border-color: rgba(72, 112, 255, 0.3);
        }

        .stat-icon {
          font-size: 2.5rem;
          color: var(--primary);
          margin-bottom: 1rem;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: var(--text-secondary);
        }

        /* CTA Section */
        .marketplace-cta {
          padding: 6rem 0;
          text-align: center;
          background: radial-gradient(circle at center, rgba(0, 246, 255, 0.1) 0%, transparent 50%);
        }

        .cta-content h2 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .cta-content p {
          font-size: 1.25rem;
          opacity: 0.8;
          margin-bottom: 2rem;
        }

        /* Notification */
        .notification {
          position: fixed;
          top: 100px;
          right: 2rem;
          background: rgba(72, 112, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0, 246, 255, 0.5);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          display: none;
          animation: slideIn 0.3s ease;
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.5);
          z-index: 1001;
          max-width: 300px;
        }

        .notification.show {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .notification-icon {
          font-size: 1.5rem;
          color: white;
        }

        .notification-content {
          flex: 1;
          color: white;
        }

        .notification-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .notification-message {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1.2rem;
          }

          .filters-container {
            flex-direction: column;
            align-items: stretch;
          }

          .category-filters {
            justify-content: center;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .product-actions {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </>
  );
}