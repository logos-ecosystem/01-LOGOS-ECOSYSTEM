import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import { loadStripe } from '@stripe/stripe-js';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { ssr: false });

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// PayPal SDK will be loaded dynamically when needed
declare global {
  interface Window {
    paypal: any;
  }
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'paypal';
  brand?: string;
  last4?: string;
  email?: string; // For PayPal accounts
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  created: string;
  provider: 'stripe' | 'paypal';
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'draft';
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  downloadUrl: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Subscription {
  id: string;
  product: string;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  amount: number;
  interval: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

interface UsageMetrics {
  apiCalls: { used: number; limit: number };
  storage: { used: number; limit: number };
  bandwidth: { used: number; limit: number };
  aiTokens: { used: number; limit: number };
}

const BillingPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'methods' | 'invoices' | 'usage'>('overview');
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm_1',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2025,
      isDefault: true,
      created: '2024-01-15',
      provider: 'stripe'
    },
    {
      id: 'pm_2',
      type: 'card',
      brand: 'mastercard',
      last4: '5555',
      expMonth: 6,
      expYear: 2026,
      isDefault: false,
      created: '2024-03-20',
      provider: 'stripe'
    },
    {
      id: 'pm_3',
      type: 'paypal',
      email: 'user@example.com',
      isDefault: false,
      created: '2024-04-10',
      provider: 'paypal'
    }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv_1',
      number: 'INV-2024-001',
      amount: 299.00,
      status: 'paid',
      date: '2024-12-01',
      dueDate: '2024-12-15',
      items: [
        { description: 'CodeMaster Pro - Monthly', quantity: 1, unitPrice: 299.00, total: 299.00 }
      ],
      downloadUrl: '#'
    },
    {
      id: 'inv_2',
      number: 'INV-2024-002',
      amount: 399.00,
      status: 'paid',
      date: '2024-11-01',
      dueDate: '2024-11-15',
      items: [
        { description: 'DataMind Analytics - Monthly', quantity: 1, unitPrice: 399.00, total: 399.00 }
      ],
      downloadUrl: '#'
    }
  ]);

  const [currentSubscriptions, setCurrentSubscriptions] = useState<Subscription[]>([
    {
      id: 'sub_1',
      product: 'CodeMaster Pro',
      plan: 'Professional',
      status: 'active',
      amount: 299,
      interval: 'monthly',
      currentPeriodStart: '2024-12-01',
      currentPeriodEnd: '2025-01-01',
      cancelAtPeriodEnd: false
    },
    {
      id: 'sub_2',
      product: 'DataMind Analytics',
      plan: 'Enterprise',
      status: 'active',
      amount: 399,
      interval: 'monthly',
      currentPeriodStart: '2024-12-15',
      currentPeriodEnd: '2025-01-15',
      cancelAtPeriodEnd: false
    }
  ]);

  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    apiCalls: { used: 85420, limit: 100000 },
    storage: { used: 62.5, limit: 100 },
    bandwidth: { used: 480, limit: 1000 },
    aiTokens: { used: 750000, limit: 1000000 }
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'stripe' | 'paypal'>('stripe');

  useEffect(() => {
    // Initialize payment data
    fetchBillingData();
    // Load PayPal SDK
    loadPayPalSDK();
  }, []);

  const loadPayPalSDK = () => {
    if (!window.paypal && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD`;
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const fetchBillingData = async () => {
    try {
      // Fetch billing data from API
      const response = await fetch('/api/billing/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update state with fetched data
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
  };

  const handleAddPaymentMethod = async () => {
    setLoading(true);
    try {
      if (selectedPaymentProvider === 'stripe') {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe not loaded');

        // Create setup intent
        const response = await fetch('/api/billing/create-setup-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        const { clientSecret } = await response.json();

        // Confirm the setup intent with Stripe
        // This would open Stripe's payment element
        
      } else if (selectedPaymentProvider === 'paypal') {
        // Handle PayPal payment method
        await handlePayPalSetup();
      }
      
      setShowAddPaymentModal(false);
      // Refresh payment methods
      await fetchBillingData();
    } catch (error) {
      console.error('Error adding payment method:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalSetup = async () => {
    if (!window.paypal) {
      throw new Error('PayPal SDK not loaded');
    }

    return new Promise((resolve, reject) => {
      window.paypal.Buttons({
        createOrder: async () => {
          const response = await fetch('/api/billing/paypal/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              type: 'setup',
              returnUrl: window.location.origin + '/dashboard/billing'
            })
          });
          
          const data = await response.json();
          return data.id;
        },
        onApprove: async (data: any) => {
          const response = await fetch('/api/billing/paypal/capture-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ orderId: data.orderID })
          });
          
          if (response.ok) {
            resolve(true);
          } else {
            reject(new Error('Failed to capture PayPal order'));
          }
        },
        onError: (err: any) => {
          reject(err);
        }
      }).render('#paypal-button-container');
    });
  };

  const handleUpdateSubscription = async (subscriptionId: string, action: 'upgrade' | 'downgrade' | 'cancel') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/billing/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ action, planId: selectedPlan })
      });

      if (response.ok) {
        await fetchBillingData();
        setShowUpgradeModal(false);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalSpending = () => {
    return currentSubscriptions.reduce((total, sub) => total + sub.amount, 0);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  // Chart data
  const spendingData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Monthly Spending',
      data: [580, 580, 620, 698, 698, 698, 698, 698, 698, 698, 698, 698],
      borderColor: '#4870FF',
      backgroundColor: 'rgba(72, 112, 255, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  const usageData = {
    labels: ['API Calls', 'Storage', 'Bandwidth', 'AI Tokens'],
    datasets: [{
      label: 'Usage %',
      data: [
        getUsagePercentage(usageMetrics.apiCalls.used, usageMetrics.apiCalls.limit),
        getUsagePercentage(usageMetrics.storage.used, usageMetrics.storage.limit),
        getUsagePercentage(usageMetrics.bandwidth.used, usageMetrics.bandwidth.limit),
        getUsagePercentage(usageMetrics.aiTokens.used, usageMetrics.aiTokens.limit)
      ],
      backgroundColor: ['#4870FF', '#00F6FF', '#FFD700', '#47FF88']
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)'
        }
      }
    }
  };

  return (
    <>
      <div className="billing-page">
        {/* Header */}
        <div className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <i className="fas fa-credit-card"></i> Billing & Subscriptions
            </h1>
            <p className="page-subtitle">
              Manage your payment methods, subscriptions, and invoices
            </p>
          </div>
          
          <div className="header-actions">
            <button 
              className="action-button"
              onClick={() => setShowAddPaymentModal(true)}
            >
              <i className="fas fa-plus"></i> Add Payment Method
            </button>
            <button 
              className="action-button primary"
              onClick={() => setShowUpgradeModal(true)}
            >
              <i className="fas fa-rocket"></i> Upgrade Plan
            </button>
          </div>
        </div>

        {/* Billing Overview Cards */}
        <div className="billing-stats">
          <div className="stat-card">
            <div className="stat-icon spending">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">Current Monthly Spend</span>
              <span className="stat-value">${calculateTotalSpending()}</span>
              <span className="stat-change positive">
                <i className="fas fa-arrow-up"></i> 12% from last month
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon subscriptions">
              <i className="fas fa-sync-alt"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Subscriptions</span>
              <span className="stat-value">{currentSubscriptions.filter(s => s.status === 'active').length}</span>
              <span className="stat-detail">Next renewal in 5 days</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon payment">
              <i className="fas fa-credit-card"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">Payment Methods</span>
              <span className="stat-value">{paymentMethods.length}</span>
              <span className="stat-detail">
                {paymentMethods.filter(pm => pm.isDefault).length} default
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon invoices">
              <i className="fas fa-file-invoice"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Invoices</span>
              <span className="stat-value">{invoices.length}</span>
              <span className="stat-detail">All paid</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="billing-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-chart-line"></i> Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'methods' ? 'active' : ''}`}
            onClick={() => setActiveTab('methods')}
          >
            <i className="fas fa-credit-card"></i> Payment Methods
          </button>
          <button 
            className={`tab-button ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <i className="fas fa-file-invoice"></i> Invoices
          </button>
          <button 
            className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
          >
            <i className="fas fa-chart-bar"></i> Usage & Limits
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="overview-grid">
              {/* Spending Chart */}
              <div className="overview-card">
                <h3 className="card-title">
                  <i className="fas fa-chart-line"></i> Spending Trend
                </h3>
                <div className="chart-container" style={{ height: '300px' }}>
                  <Line data={spendingData} options={chartOptions} />
                </div>
              </div>

              {/* Active Subscriptions */}
              <div className="overview-card">
                <h3 className="card-title">
                  <i className="fas fa-sync-alt"></i> Active Subscriptions
                </h3>
                <div className="subscriptions-list">
                  {currentSubscriptions.map(sub => (
                    <div key={sub.id} className="subscription-item">
                      <div className="subscription-header">
                        <div className="subscription-info">
                          <h4>{sub.product}</h4>
                          <p>{sub.plan} Plan</p>
                        </div>
                        <div className="subscription-price">
                          <span className="price">${sub.amount}</span>
                          <span className="interval">/{sub.interval}</span>
                        </div>
                      </div>
                      
                      <div className="subscription-details">
                        <div className="detail">
                          <span className="label">Status:</span>
                          <span className={`status ${sub.status}`}>{sub.status}</span>
                        </div>
                        <div className="detail">
                          <span className="label">Next billing:</span>
                          <span>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="subscription-actions">
                        <button className="manage-button">
                          <i className="fas fa-cog"></i> Manage
                        </button>
                        <button className="upgrade-button">
                          <i className="fas fa-arrow-up"></i> Upgrade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Cycle Toggle */}
              <div className="overview-card">
                <h3 className="card-title">
                  <i className="fas fa-calendar-alt"></i> Billing Cycle
                </h3>
                <div className="billing-cycle-toggle">
                  <button 
                    className={`cycle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly Billing
                  </button>
                  <button 
                    className={`cycle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('yearly')}
                  >
                    Yearly Billing
                    <span className="savings">Save 20%</span>
                  </button>
                </div>
                
                <div className="cycle-benefits">
                  {billingCycle === 'yearly' && (
                    <>
                      <div className="benefit">
                        <i className="fas fa-check"></i>
                        <span>2 months free with annual billing</span>
                      </div>
                      <div className="benefit">
                        <i className="fas fa-check"></i>
                        <span>Priority support included</span>
                      </div>
                      <div className="benefit">
                        <i className="fas fa-check"></i>
                        <span>Advanced features unlocked</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="overview-card">
                <h3 className="card-title">
                  <i className="fas fa-bolt"></i> Quick Actions
                </h3>
                <div className="quick-actions">
                  <button className="quick-action">
                    <i className="fas fa-download"></i>
                    <span>Download All Invoices</span>
                  </button>
                  <button className="quick-action">
                    <i className="fas fa-receipt"></i>
                    <span>Request Tax Document</span>
                  </button>
                  <button className="quick-action">
                    <i className="fas fa-chart-pie"></i>
                    <span>Export Usage Report</span>
                  </button>
                  <button className="quick-action">
                    <i className="fas fa-bell"></i>
                    <span>Billing Alerts</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'methods' && (
          <div className="methods-section">
            <div className="methods-grid">
              {paymentMethods.map(method => (
                <div key={method.id} className={`payment-method-card ${method.isDefault ? 'default' : ''}`}>
                  <div className="method-header">
                    <div className="method-icon">
                      {method.type === 'card' ? (
                        <i className={`fab fa-cc-${method.brand}`}></i>
                      ) : method.type === 'paypal' ? (
                        <i className="fab fa-paypal" style={{ color: '#00457C' }}></i>
                      ) : (
                        <i className="fas fa-university"></i>
                      )}
                    </div>
                    {method.isDefault && (
                      <span className="default-badge">Default</span>
                    )}
                  </div>
                  
                  <div className="method-details">
                    <h4>
                      {method.type === 'paypal' ? (
                        <>PayPal - {method.email}</>
                      ) : (
                        <>
                          {method.brand && method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} 
                          {' '}ending in {method.last4}
                        </>
                      )}
                    </h4>
                    {method.expMonth && method.expYear && (
                      <p>Expires {method.expMonth}/{method.expYear}</p>
                    )}
                    <p className="added-date">Added {new Date(method.created).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="method-actions">
                    {!method.isDefault && (
                      <button className="set-default-btn">
                        Set as Default
                      </button>
                    )}
                    <button className="remove-btn">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="add-method-card" onClick={() => setShowAddPaymentModal(true)}>
                <i className="fas fa-plus-circle"></i>
                <span>Add New Payment Method</span>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="invoices-section">
            <div className="invoices-header">
              <div className="invoice-filters">
                <select className="filter-select">
                  <option>All Invoices</option>
                  <option>Paid</option>
                  <option>Pending</option>
                  <option>Failed</option>
                </select>
                
                <input 
                  type="text" 
                  placeholder="Search invoices..." 
                  className="invoice-search"
                />
              </div>
              
              <button className="download-all-btn">
                <i className="fas fa-download"></i> Download All
              </button>
            </div>
            
            <div className="invoices-table">
              <table>
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>{invoice.number}</td>
                      <td>{new Date(invoice.date).toLocaleDateString()}</td>
                      <td>${invoice.amount.toFixed(2)}</td>
                      <td>
                        <span className={`invoice-status ${invoice.status}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>
                        <div className="invoice-actions">
                          <button className="view-btn">
                            <i className="fas fa-eye"></i>
                          </button>
                          <button className="download-btn">
                            <i className="fas fa-download"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="usage-section">
            <div className="usage-grid">
              {/* Usage Overview */}
              <div className="usage-card">
                <h3 className="card-title">
                  <i className="fas fa-chart-bar"></i> Current Usage
                </h3>
                <div className="chart-container" style={{ height: '300px' }}>
                  <Bar data={usageData} options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false
                      }
                    }
                  }} />
                </div>
              </div>

              {/* Detailed Usage Metrics */}
              <div className="usage-details-card">
                <h3 className="card-title">
                  <i className="fas fa-info-circle"></i> Usage Details
                </h3>
                
                <div className="usage-metric">
                  <div className="metric-header">
                    <div className="metric-info">
                      <i className="fas fa-exchange-alt"></i>
                      <span>API Calls</span>
                    </div>
                    <span className="metric-percentage">
                      {getUsagePercentage(usageMetrics.apiCalls.used, usageMetrics.apiCalls.limit)}%
                    </span>
                  </div>
                  <div className="usage-bar">
                    <div 
                      className="usage-progress"
                      style={{ 
                        width: `${getUsagePercentage(usageMetrics.apiCalls.used, usageMetrics.apiCalls.limit)}%`,
                        backgroundColor: '#4870FF'
                      }}
                    ></div>
                  </div>
                  <div className="usage-numbers">
                    <span>{usageMetrics.apiCalls.used.toLocaleString()}</span>
                    <span>{usageMetrics.apiCalls.limit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="usage-metric">
                  <div className="metric-header">
                    <div className="metric-info">
                      <i className="fas fa-hdd"></i>
                      <span>Storage</span>
                    </div>
                    <span className="metric-percentage">
                      {getUsagePercentage(usageMetrics.storage.used, usageMetrics.storage.limit)}%
                    </span>
                  </div>
                  <div className="usage-bar">
                    <div 
                      className="usage-progress"
                      style={{ 
                        width: `${getUsagePercentage(usageMetrics.storage.used, usageMetrics.storage.limit)}%`,
                        backgroundColor: '#00F6FF'
                      }}
                    ></div>
                  </div>
                  <div className="usage-numbers">
                    <span>{usageMetrics.storage.used} GB</span>
                    <span>{usageMetrics.storage.limit} GB</span>
                  </div>
                </div>

                <div className="usage-metric">
                  <div className="metric-header">
                    <div className="metric-info">
                      <i className="fas fa-network-wired"></i>
                      <span>Bandwidth</span>
                    </div>
                    <span className="metric-percentage">
                      {getUsagePercentage(usageMetrics.bandwidth.used, usageMetrics.bandwidth.limit)}%
                    </span>
                  </div>
                  <div className="usage-bar">
                    <div 
                      className="usage-progress"
                      style={{ 
                        width: `${getUsagePercentage(usageMetrics.bandwidth.used, usageMetrics.bandwidth.limit)}%`,
                        backgroundColor: '#FFD700'
                      }}
                    ></div>
                  </div>
                  <div className="usage-numbers">
                    <span>{usageMetrics.bandwidth.used} GB</span>
                    <span>{usageMetrics.bandwidth.limit} GB</span>
                  </div>
                </div>

                <div className="usage-metric">
                  <div className="metric-header">
                    <div className="metric-info">
                      <i className="fas fa-brain"></i>
                      <span>AI Tokens</span>
                    </div>
                    <span className="metric-percentage">
                      {getUsagePercentage(usageMetrics.aiTokens.used, usageMetrics.aiTokens.limit)}%
                    </span>
                  </div>
                  <div className="usage-bar">
                    <div 
                      className="usage-progress"
                      style={{ 
                        width: `${getUsagePercentage(usageMetrics.aiTokens.used, usageMetrics.aiTokens.limit)}%`,
                        backgroundColor: '#47FF88'
                      }}
                    ></div>
                  </div>
                  <div className="usage-numbers">
                    <span>{(usageMetrics.aiTokens.used / 1000).toFixed(0)}K</span>
                    <span>{(usageMetrics.aiTokens.limit / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              </div>

              {/* Usage Alerts */}
              <div className="usage-alerts-card">
                <h3 className="card-title">
                  <i className="fas fa-bell"></i> Usage Alerts
                </h3>
                
                <div className="alert-settings">
                  <div className="alert-setting">
                    <label className="toggle-label">
                      <input type="checkbox" defaultChecked />
                      <span>Alert at 80% usage</span>
                    </label>
                  </div>
                  <div className="alert-setting">
                    <label className="toggle-label">
                      <input type="checkbox" defaultChecked />
                      <span>Alert at 90% usage</span>
                    </label>
                  </div>
                  <div className="alert-setting">
                    <label className="toggle-label">
                      <input type="checkbox" />
                      <span>Daily usage summary</span>
                    </label>
                  </div>
                  <div className="alert-setting">
                    <label className="toggle-label">
                      <input type="checkbox" />
                      <span>Auto-upgrade at limit</span>
                    </label>
                  </div>
                </div>
                
                <button className="save-alerts-btn">
                  Save Alert Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Method Modal */}
        {showAddPaymentModal && (
          <div className="modal-overlay" onClick={() => setShowAddPaymentModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Payment Method</h2>
                <button className="modal-close" onClick={() => setShowAddPaymentModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="payment-provider-selector">
                  <h3>Select Payment Provider</h3>
                  <div className="provider-options">
                    <button 
                      className={`provider-btn ${selectedPaymentProvider === 'stripe' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentProvider('stripe')}
                    >
                      <i className="fab fa-stripe"></i>
                      <span>Stripe</span>
                      <small>Credit/Debit Cards & Bank Accounts</small>
                    </button>
                    <button 
                      className={`provider-btn ${selectedPaymentProvider === 'paypal' ? 'active' : ''}`}
                      onClick={() => setSelectedPaymentProvider('paypal')}
                    >
                      <i className="fab fa-paypal"></i>
                      <span>PayPal</span>
                      <small>PayPal Balance & Linked Accounts</small>
                    </button>
                  </div>
                </div>

                {selectedPaymentProvider === 'stripe' && (
                  <div className="payment-method-types">
                    <button className="method-type-btn active">
                      <i className="fas fa-credit-card"></i>
                      Credit/Debit Card
                    </button>
                    <button className="method-type-btn">
                      <i className="fas fa-university"></i>
                      Bank Account
                    </button>
                  </div>
                )}
                
                {selectedPaymentProvider === 'stripe' ? (
                  <div className="stripe-payment-element">
                    {/* Stripe Payment Element would be mounted here */}
                    <div className="payment-element-placeholder">
                      <div className="form-group">
                        <label>Card Number</label>
                        <input type="text" placeholder="1234 5678 9012 3456" />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Expiry Date</label>
                          <input type="text" placeholder="MM/YY" />
                        </div>
                        <div className="form-group">
                          <label>CVV</label>
                          <input type="text" placeholder="123" />
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Name on Card</label>
                        <input type="text" placeholder="John Doe" />
                      </div>
                      
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input type="checkbox" />
                          <span>Set as default payment method</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="paypal-payment-element">
                    <div className="paypal-info">
                      <i className="fab fa-paypal" style={{ fontSize: '3rem', color: '#00457C' }}></i>
                      <p>You will be redirected to PayPal to authorize this payment method.</p>
                      <ul className="paypal-features">
                        <li><i className="fas fa-check"></i> Secure payment processing</li>
                        <li><i className="fas fa-check"></i> Buyer protection included</li>
                        <li><i className="fas fa-check"></i> No card details stored on our servers</li>
                      </ul>
                    </div>
                    <div id="paypal-button-container"></div>
                  </div>
                )}
                
                <div className="security-note">
                  <i className="fas fa-lock"></i>
                  <span>Your payment information is encrypted and secure. We never store your card details.</span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="cancel-btn"
                  onClick={() => setShowAddPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={handleAddPaymentMethod}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Add Payment Method'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Plan Modal */}
        {showUpgradeModal && (
          <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
            <div className="modal-content large" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Upgrade Your Plan</h2>
                <button className="modal-close" onClick={() => setShowUpgradeModal(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="modal-body">
                <div className="plans-grid">
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Starter</h3>
                      <p>Perfect for individuals</p>
                    </div>
                    <div className="plan-price">
                      <span className="currency">$</span>
                      <span className="amount">99</span>
                      <span className="interval">/month</span>
                    </div>
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> 10,000 API calls/month</li>
                      <li><i className="fas fa-check"></i> 10GB storage</li>
                      <li><i className="fas fa-check"></i> Basic support</li>
                      <li><i className="fas fa-check"></i> 1 AI bot</li>
                    </ul>
                    <button className="select-plan-btn">Select Plan</button>
                  </div>
                  
                  <div className="plan-card featured">
                    <div className="featured-badge">Most Popular</div>
                    <div className="plan-header">
                      <h3>Professional</h3>
                      <p>For growing teams</p>
                    </div>
                    <div className="plan-price">
                      <span className="currency">$</span>
                      <span className="amount">299</span>
                      <span className="interval">/month</span>
                    </div>
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> 100,000 API calls/month</li>
                      <li><i className="fas fa-check"></i> 100GB storage</li>
                      <li><i className="fas fa-check"></i> Priority support</li>
                      <li><i className="fas fa-check"></i> 5 AI bots</li>
                      <li><i className="fas fa-check"></i> Advanced analytics</li>
                    </ul>
                    <button 
                      className="select-plan-btn"
                      onClick={() => setSelectedPlan('professional')}
                    >
                      Select Plan
                    </button>
                  </div>
                  
                  <div className="plan-card">
                    <div className="plan-header">
                      <h3>Enterprise</h3>
                      <p>For large organizations</p>
                    </div>
                    <div className="plan-price">
                      <span className="currency">$</span>
                      <span className="amount">999</span>
                      <span className="interval">/month</span>
                    </div>
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Unlimited API calls</li>
                      <li><i className="fas fa-check"></i> 1TB storage</li>
                      <li><i className="fas fa-check"></i> 24/7 dedicated support</li>
                      <li><i className="fas fa-check"></i> Unlimited AI bots</li>
                      <li><i className="fas fa-check"></i> Custom integrations</li>
                      <li><i className="fas fa-check"></i> SLA guarantee</li>
                    </ul>
                    <button className="select-plan-btn">Select Plan</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .billing-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .page-title i {
          color: #4870FF;
        }

        .page-subtitle {
          font-size: 1.125rem;
          opacity: 0.7;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .action-button.primary {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .action-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.3);
        }

        /* Billing Stats */
        .billing-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }

        .stat-icon.spending { background: rgba(72, 112, 255, 0.2); color: #4870FF; }
        .stat-icon.subscriptions { background: rgba(0, 246, 255, 0.2); color: #00F6FF; }
        .stat-icon.payment { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .stat-icon.invoices { background: rgba(71, 255, 136, 0.2); color: #47FF88; }

        .stat-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .stat-change {
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-change.positive { color: #47FF88; }
        .stat-change.negative { color: #FF5757; }

        .stat-detail {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        /* Tabs */
        .billing-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
          overflow-x: auto;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: transparent;
          border: none;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: #4870FF;
        }

        .tab-button.active {
          color: #4870FF;
        }

        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #4870FF;
        }

        /* Overview Section */
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .overview-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .overview-card:hover {
          border-color: rgba(72, 112, 255, 0.3);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .card-title i {
          color: #4870FF;
        }

        /* Subscriptions List */
        .subscriptions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .subscription-item {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid rgba(72, 112, 255, 0.1);
          transition: all 0.3s;
        }

        .subscription-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(72, 112, 255, 0.3);
        }

        .subscription-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .subscription-info h4 {
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .subscription-info p {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .subscription-price {
          text-align: right;
        }

        .price {
          font-size: 1.75rem;
          font-weight: 700;
          color: #4870FF;
        }

        .interval {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .subscription-details {
          display: flex;
          gap: 2rem;
          margin-bottom: 1rem;
        }

        .detail {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status.active { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .status.cancelled { background: rgba(255, 87, 87, 0.2); color: #FF5757; }
        .status.past_due { background: rgba(255, 215, 0, 0.2); color: #FFD700; }

        .subscription-actions {
          display: flex;
          gap: 0.75rem;
        }

        .manage-button,
        .upgrade-button {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .manage-button:hover,
        .upgrade-button:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        /* Billing Cycle Toggle */
        .billing-cycle-toggle {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .cycle-option {
          flex: 1;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .cycle-option.active {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .cycle-option:hover {
          border-color: #4870FF;
        }

        .savings {
          display: block;
          margin-top: 0.5rem;
          color: #47FF88;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .cycle-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .benefit {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
        }

        .benefit i {
          color: #47FF88;
        }

        /* Quick Actions */
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .quick-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
        }

        .quick-action:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
          transform: translateY(-2px);
        }

        .quick-action i {
          font-size: 1.5rem;
          color: #4870FF;
        }

        /* Payment Methods */
        .methods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .payment-method-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s;
        }

        .payment-method-card.default {
          border-color: #4870FF;
          background: rgba(72, 112, 255, 0.05);
        }

        .payment-method-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .method-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .method-icon {
          font-size: 2.5rem;
          color: #4870FF;
        }

        .default-badge {
          background: #4870FF;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .method-details h4 {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }

        .method-details p {
          font-size: 0.875rem;
          opacity: 0.7;
          margin-bottom: 0.25rem;
        }

        .added-date {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .method-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .set-default-btn {
          flex: 1;
          padding: 0.5rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid #4870FF;
          border-radius: 8px;
          color: #4870FF;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .set-default-btn:hover {
          background: #4870FF;
          color: white;
        }

        .remove-btn {
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 87, 87, 0.3);
          border-radius: 8px;
          color: #FF5757;
          cursor: pointer;
          transition: all 0.3s;
        }

        .remove-btn:hover {
          background: rgba(255, 87, 87, 0.1);
          border-color: #FF5757;
        }

        .add-method-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px dashed rgba(72, 112, 255, 0.3);
          border-radius: 16px;
          padding: 3rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .add-method-card:hover {
          background: rgba(72, 112, 255, 0.05);
          border-color: #4870FF;
          transform: translateY(-4px);
        }

        .add-method-card i {
          font-size: 3rem;
          color: #4870FF;
        }

        /* Invoices */
        .invoices-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .invoice-filters {
          display: flex;
          gap: 1rem;
        }

        .filter-select,
        .invoice-search {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .filter-select:focus,
        .invoice-search:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .download-all-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(72, 112, 255, 0.1);
          border: 1px solid #4870FF;
          border-radius: 8px;
          color: #4870FF;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .download-all-btn:hover {
          background: #4870FF;
          color: white;
        }

        .invoices-table {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          overflow: hidden;
        }

        .invoices-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .invoices-table th {
          background: rgba(255, 255, 255, 0.05);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 1px solid rgba(72, 112, 255, 0.2);
        }

        .invoices-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(72, 112, 255, 0.1);
        }

        .invoices-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .invoice-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .invoice-status.paid { background: rgba(71, 255, 136, 0.2); color: #47FF88; }
        .invoice-status.pending { background: rgba(255, 215, 0, 0.2); color: #FFD700; }
        .invoice-status.failed { background: rgba(255, 87, 87, 0.2); color: #FF5757; }

        .invoice-actions {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn,
        .download-btn {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 6px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
        }

        .view-btn:hover,
        .download-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        /* Usage Section */
        .usage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .usage-card,
        .usage-details-card,
        .usage-alerts-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          transition: all 0.3s;
        }

        .usage-metric {
          margin-bottom: 2rem;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .metric-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .metric-info i {
          color: #4870FF;
        }

        .metric-percentage {
          font-weight: 600;
        }

        .usage-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .usage-progress {
          height: 100%;
          transition: width 0.5s ease;
        }

        .usage-numbers {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .alert-settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .alert-setting {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .toggle-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .save-alerts-btn {
          width: 100%;
          padding: 0.875rem;
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .save-alerts-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .modal-content {
          background: #0A0E21;
          border: 1px solid rgba(72, 112, 255, 0.3);
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-content.large {
          max-width: 1000px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #F5F7FA;
          font-size: 1.5rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .modal-close:hover {
          opacity: 1;
        }

        .modal-body {
          padding: 2rem;
        }

        .payment-method-types {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .method-type-btn {
          flex: 1;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          color: #F5F7FA;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .method-type-btn.active {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .payment-element-placeholder {
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .form-group input {
          width: 100%;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(72, 112, 255, 0.2);
          border-radius: 8px;
          color: #F5F7FA;
          transition: all 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4870FF;
          background: rgba(255, 255, 255, 0.08);
        }

        .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .security-note {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(72, 112, 255, 0.1);
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .security-note i {
          color: #4870FF;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .cancel-btn,
        .save-btn {
          padding: 0.875rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #F5F7FA;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .save-btn {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.4);
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Plans Grid */
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }

        .plan-card {
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(72, 112, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          position: relative;
          transition: all 0.3s;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .plan-card.featured {
          border-color: #4870FF;
          background: rgba(72, 112, 255, 0.05);
        }

        .featured-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          color: white;
          padding: 0.375rem 1.5rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .plan-header {
          margin-bottom: 1.5rem;
        }

        .plan-header h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .plan-header p {
          font-size: 0.875rem;
          opacity: 0.7;
        }

        .plan-price {
          margin-bottom: 2rem;
        }

        .currency {
          font-size: 1.5rem;
          opacity: 0.7;
        }

        .amount {
          font-size: 3rem;
          font-weight: 700;
          color: #4870FF;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin-bottom: 2rem;
        }

        .plan-features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          text-align: left;
        }

        .plan-features i {
          color: #47FF88;
        }

        .select-plan-btn {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.3);
          border-radius: 12px;
          color: #F5F7FA;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .plan-card.featured .select-plan-btn {
          background: linear-gradient(135deg, #4870FF 0%, #00F6FF 100%);
          border: none;
          color: white;
        }

        .select-plan-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(72, 112, 255, 0.3);
        }

        /* Payment Provider Selector */
        .payment-provider-selector {
          margin-bottom: 2rem;
        }

        .payment-provider-selector h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
        }

        .provider-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .provider-btn {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(72, 112, 255, 0.2);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          text-align: center;
        }

        .provider-btn:hover {
          background: rgba(72, 112, 255, 0.1);
          border-color: rgba(72, 112, 255, 0.4);
        }

        .provider-btn.active {
          background: rgba(72, 112, 255, 0.1);
          border-color: #4870FF;
        }

        .provider-btn i {
          font-size: 2rem;
        }

        .provider-btn span {
          font-weight: 600;
          color: #F5F7FA;
        }

        .provider-btn small {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        /* PayPal Specific Styles */
        .paypal-payment-element {
          text-align: center;
          padding: 2rem 0;
        }

        .paypal-info {
          margin-bottom: 2rem;
        }

        .paypal-info p {
          margin: 1rem 0;
          font-size: 1.125rem;
          opacity: 0.8;
        }

        .paypal-features {
          list-style: none;
          padding: 0;
          margin: 2rem auto;
          max-width: 400px;
          text-align: left;
        }

        .paypal-features li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .paypal-features i {
          color: #47FF88;
        }

        #paypal-button-container {
          max-width: 400px;
          margin: 0 auto;
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .billing-page {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .header-actions {
            width: 100%;
            flex-direction: column;
          }
          
          .billing-stats {
            grid-template-columns: 1fr;
          }
          
          .methods-grid {
            grid-template-columns: 1fr;
          }
          
          .invoice-filters {
            flex-direction: column;
            width: 100%;
          }
          
          .invoices-table {
            overflow-x: auto;
          }
          
          .plans-grid {
            grid-template-columns: 1fr;
          }

          .provider-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default withAuth(BillingPage);