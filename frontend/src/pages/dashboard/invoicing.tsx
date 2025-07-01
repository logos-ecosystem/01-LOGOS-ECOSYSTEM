import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import withAuth from '@/components/Auth/withAuth';
import invoicingService, { InvoiceData, InvoiceItem, RecurringConfig } from '@/services/invoicing';
import { format, addDays } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamic imports for charts
const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { ssr: false });

interface InvoiceStats {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averagePaymentTime: number;
  monthlyRevenue: { month: string; revenue: number }[];
}

const InvoicingPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'recurring' | 'templates'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data
  const [invoices, setInvoices] = useState<InvoiceData[]>([
    {
      id: 'inv_1',
      invoiceNumber: 'INV-2024-000001',
      customerId: 'cust_1',
      customerName: 'Acme Corporation',
      customerEmail: 'billing@acme.com',
      customerAddress: {
        line1: '123 Business St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US'
      },
      issueDate: '2024-12-01',
      dueDate: '2024-12-31',
      status: 'paid',
      currency: 'USD',
      subtotal: 4500.00,
      tax: 405.00,
      discount: 0,
      total: 4905.00,
      items: [
        {
          id: 'item_1',
          description: 'LOGOS AI Expert Bot - Enterprise Plan',
          quantity: 1,
          unitPrice: 2500.00,
          taxRate: 9,
          discountRate: 0,
          total: 2725.00,
          serviceId: 'service_bot_enterprise'
        },
        {
          id: 'item_2',
          description: 'API Usage - 1M requests',
          quantity: 2,
          unitPrice: 1000.00,
          taxRate: 9,
          discountRate: 0,
          total: 2180.00,
          serviceId: 'service_api_1m'
        }
      ],
      paymentTerms: 'Net 30',
      recurring: {
        frequency: 'monthly',
        startDate: '2024-12-01',
        nextInvoiceDate: '2025-01-01',
        autoSend: true,
        autoCharge: true
      }
    },
    {
      id: 'inv_2',
      invoiceNumber: 'INV-2024-000002',
      customerId: 'cust_2',
      customerName: 'Tech Startup Inc',
      customerEmail: 'finance@techstartup.com',
      customerAddress: {
        line1: '456 Innovation Blvd',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US'
      },
      issueDate: '2024-12-15',
      dueDate: '2025-01-14',
      status: 'pending',
      currency: 'USD',
      subtotal: 1200.00,
      tax: 108.00,
      discount: 120.00,
      total: 1188.00,
      items: [
        {
          id: 'item_3',
          description: 'LOGOS AI Expert Bot - Startup Plan',
          quantity: 1,
          unitPrice: 1200.00,
          taxRate: 9,
          discountRate: 10,
          total: 1188.00,
          serviceId: 'service_bot_startup'
        }
      ],
      paymentTerms: 'Net 30',
      notes: 'Applied 10% startup discount'
    }
  ]);

  const [stats] = useState<InvoiceStats>({
    totalRevenue: 125430.50,
    totalInvoices: 156,
    paidInvoices: 142,
    pendingInvoices: 10,
    overdueInvoices: 4,
    averagePaymentTime: 18.5,
    monthlyRevenue: [
      { month: 'Jul', revenue: 18520 },
      { month: 'Aug', revenue: 19850 },
      { month: 'Sep', revenue: 21200 },
      { month: 'Oct', revenue: 20100 },
      { month: 'Nov', revenue: 22500 },
      { month: 'Dec', revenue: 23260.50 }
    ]
  });

  const [recurringConfigs] = useState([
    {
      id: 'rec_1',
      customerName: 'Acme Corporation',
      plan: 'Enterprise Plan',
      amount: 2500,
      frequency: 'monthly',
      nextInvoiceDate: '2025-01-01',
      status: 'active'
    },
    {
      id: 'rec_2',
      customerName: 'Global Tech Solutions',
      plan: 'Premium API Access',
      amount: 5000,
      frequency: 'quarterly',
      nextInvoiceDate: '2025-03-01',
      status: 'active'
    },
    {
      id: 'rec_3',
      customerName: 'StartupXYZ',
      plan: 'Growth Plan',
      amount: 800,
      frequency: 'monthly',
      nextInvoiceDate: '2025-01-15',
      status: 'paused'
    }
  ]);

  const [templates] = useState([
    {
      id: 'tpl_1',
      name: 'Modern Professional',
      description: 'Clean and professional invoice template',
      preview: '/templates/modern-professional.png',
      isDefault: true
    },
    {
      id: 'tpl_2',
      name: 'Minimal',
      description: 'Simple and minimal design',
      preview: '/templates/minimal.png',
      isDefault: false
    },
    {
      id: 'tpl_3',
      name: 'Corporate',
      description: 'Traditional corporate style',
      preview: '/templates/corporate.png',
      isDefault: false
    }
  ]);

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchQuery === '' || 
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = async () => {
    setLoading(true);
    try {
      // Create invoice logic
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await invoicingService.sendInvoice(invoiceId, ['customer@email.com']);
      // Update UI
    } catch (error) {
      console.error('Error sending invoice:', error);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const pdf = await invoicingService.generatePDF(invoiceId);
      const url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const revenueChartData = {
    labels: stats.monthlyRevenue.map(m => m.month),
    datasets: [{
      label: 'Monthly Revenue',
      data: stats.monthlyRevenue.map(m => m.revenue),
      borderColor: 'rgb(34, 211, 238)',
      backgroundColor: 'rgba(34, 211, 238, 0.1)',
      tension: 0.4
    }]
  };

  const statusChartData = {
    labels: ['Paid', 'Pending', 'Overdue'],
    datasets: [{
      data: [stats.paidInvoices, stats.pendingInvoices, stats.overdueInvoices],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgb(34, 211, 238)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Automatic Invoicing</h1>
          <p className="text-gray-400">Manage invoices, recurring billing, and payment automation</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-dollar-sign text-2xl text-green-400"></i>
              <span className="text-xs text-gray-400">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">Total revenue</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-file-invoice text-2xl text-cyan-400"></i>
              <span className="text-xs text-gray-400">Invoices</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalInvoices}</p>
            <p className="text-sm text-gray-400 mt-1">Total invoices</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-check-circle text-2xl text-green-400"></i>
              <span className="text-xs text-gray-400">Paid</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.paidInvoices}</p>
            <p className="text-sm text-gray-400 mt-1">Paid invoices</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-clock text-2xl text-yellow-400"></i>
              <span className="text-xs text-gray-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pendingInvoices}</p>
            <p className="text-sm text-gray-400 mt-1">Awaiting payment</p>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <i className="fas fa-exclamation-circle text-2xl text-red-400"></i>
              <span className="text-xs text-gray-400">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.overdueInvoices}</p>
            <p className="text-sm text-gray-400 mt-1">Past due date</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 glass-effect rounded-xl p-6 border border-cyan-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Revenue Trend</h3>
            <div className="h-64">
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>

          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Invoice Status</h3>
            <div className="h-64">
              <Doughnut data={statusChartData} options={{ ...chartOptions, maintainAspectRatio: true }} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg. Payment Time</span>
                <span className="text-white font-medium">{stats.averagePaymentTime} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'invoices'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            All Invoices
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'recurring'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            Recurring Billing
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'templates'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                : 'glass-effect text-gray-300 hover:text-white'
            }`}
          >
            Templates
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="p-4 bg-cyan-500/20 rounded-lg hover:bg-cyan-500/30 transition-colors text-center"
                >
                  <i className="fas fa-plus-circle text-2xl text-cyan-400 mb-2"></i>
                  <p className="text-white">Create Invoice</p>
                </button>
                <button className="p-4 bg-purple-500/20 rounded-lg hover:bg-purple-500/30 transition-colors text-center">
                  <i className="fas fa-sync-alt text-2xl text-purple-400 mb-2"></i>
                  <p className="text-white">Generate Recurring</p>
                </button>
                <button className="p-4 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors text-center">
                  <i className="fas fa-file-export text-2xl text-green-400 mb-2"></i>
                  <p className="text-white">Export Reports</p>
                </button>
                <button className="p-4 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors text-center">
                  <i className="fas fa-cog text-2xl text-blue-400 mb-2"></i>
                  <p className="text-white">Settings</p>
                </button>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Recent Invoices</h3>
                <button 
                  onClick={() => setActiveTab('invoices')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  View All <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Invoice #</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <span className="text-white font-medium">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-300">{invoice.customerName}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {invoicingService.formatCurrency(invoice.total, invoice.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            invoice.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                            invoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            invoice.status === 'overdue' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedInvoice(invoice)}
                              className="text-cyan-400 hover:text-cyan-300"
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              onClick={() => handleDownloadPDF(invoice.id)}
                              className="text-blue-400 hover:text-blue-300"
                              title="Download PDF"
                            >
                              <i className="fas fa-download"></i>
                            </button>
                            {invoice.status === 'pending' && (
                              <button 
                                onClick={() => handleSendInvoice(invoice.id)}
                                className="text-green-400 hover:text-green-300"
                                title="Send"
                              >
                                <i className="fas fa-paper-plane"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming Recurring */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Upcoming Recurring Invoices</h3>
                <button 
                  onClick={() => setActiveTab('recurring')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Manage <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>

              <div className="space-y-3">
                {recurringConfigs.slice(0, 3).map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{config.customerName}</p>
                      <p className="text-sm text-gray-400">{config.plan} - {config.frequency}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${config.amount}</p>
                      <p className="text-sm text-gray-400">Next: {format(new Date(config.nextInvoiceDate), 'MMM dd')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      config.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {config.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="glass-effect rounded-xl border border-cyan-500/20">
            {/* Filters */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New Invoice
                </button>
              </div>
            </div>

            {/* Invoice List */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Invoice #</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Issue Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Due Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white">{invoice.customerName}</p>
                          <p className="text-sm text-gray-400">{invoice.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {format(new Date(invoice.issueDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                        {invoicingService.isOverdue(invoice.dueDate) && invoice.status !== 'paid' && (
                          <span className="ml-2 text-red-400 text-xs">(Overdue)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {invoicingService.formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                          invoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          invoice.status === 'draft' ? 'bg-gray-500/20 text-gray-300' :
                          invoice.status === 'overdue' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedInvoice(invoice)}
                            className="text-cyan-400 hover:text-cyan-300"
                            title="View"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            onClick={() => handleDownloadPDF(invoice.id)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Download PDF"
                          >
                            <i className="fas fa-download"></i>
                          </button>
                          <button 
                            onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                            className="text-yellow-400 hover:text-yellow-300"
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {invoice.status === 'pending' && (
                            <button 
                              onClick={() => handleSendInvoice(invoice.id)}
                              className="text-green-400 hover:text-green-300"
                              title="Send"
                            >
                              <i className="fas fa-paper-plane"></i>
                            </button>
                          )}
                          <button 
                            className="text-gray-400 hover:text-gray-300"
                            title="More"
                          >
                            <i className="fas fa-ellipsis-v"></i>
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

        {activeTab === 'recurring' && (
          <div className="space-y-6">
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Recurring Billing Configurations</h3>
                <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all">
                  <i className="fas fa-plus mr-2"></i>
                  New Recurring
                </button>
              </div>

              <div className="grid gap-4">
                {recurringConfigs.map((config) => (
                  <div key={config.id} className="p-6 bg-gray-800 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-medium text-white">{config.customerName}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            config.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                          }`}>
                            {config.status}
                          </span>
                        </div>
                        <p className="text-gray-400 mb-3">{config.plan}</p>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="text-white font-medium">${config.amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Frequency</p>
                            <p className="text-white font-medium capitalize">{config.frequency}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Next Invoice</p>
                            <p className="text-white font-medium">
                              {format(new Date(config.nextInvoiceDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button className="p-2 text-cyan-400 hover:text-cyan-300">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-300">
                          {config.status === 'active' ? (
                            <i className="fas fa-pause" title="Pause"></i>
                          ) : (
                            <i className="fas fa-play" title="Resume"></i>
                          )}
                        </button>
                        <button className="p-2 text-red-400 hover:text-red-300">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Settings */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-semibold text-white mb-6">Automation Settings</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Auto-generate Invoices</p>
                    <p className="text-sm text-gray-400">Automatically create invoices on schedule</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Auto-send Invoices</p>
                    <p className="text-sm text-gray-400">Send invoices to customers automatically</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Auto-charge Cards</p>
                    <p className="text-sm text-gray-400">Charge saved payment methods automatically</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <p className="text-white">Payment Reminders</p>
                    <p className="text-sm text-gray-400">Send automatic payment reminders</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </label>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <h4 className="text-lg font-medium text-white mb-4">Reminder Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Days before due date</label>
                    <input
                      type="number"
                      value="3"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Days after due date</label>
                    <input
                      type="text"
                      value="1, 7, 14"
                      placeholder="e.g., 1, 7, 14"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Invoice Templates</h3>
                <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all">
                  <i className="fas fa-plus mr-2"></i>
                  Create Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-700">
                      <img 
                        src={template.preview || '/api/placeholder/400/300'} 
                        alt={template.name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-medium text-white">{template.name}</h4>
                        {template.isDefault && (
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-4">{template.description}</p>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm">
                          Preview
                        </button>
                        <button className="flex-1 px-3 py-2 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition-colors text-sm">
                          Use Template
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Settings */}
            <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
              <h3 className="text-xl font-semibold text-white mb-6">Template Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center">
                      <i className="fas fa-image text-3xl text-gray-600"></i>
                    </div>
                    <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      Upload Logo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value="#22d3ee" className="h-10 w-20" />
                      <input 
                        type="text" 
                        value="#22d3ee" 
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value="#3b82f6" className="h-10 w-20" />
                      <input 
                        type="text" 
                        value="#3b82f6" 
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Footer Text</label>
                  <textarea
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    rows={3}
                    placeholder="Thank you for your business!"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-white mb-6">Create New Invoice</h3>
            
            {/* Form would go here */}
            <p className="text-gray-400 mb-6">Invoice creation form...</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">{selectedInvoice.invoiceNumber}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  selectedInvoice.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                  selectedInvoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm text-gray-400 mb-2">Bill To</h4>
                <p className="text-white font-medium">{selectedInvoice.customerName}</p>
                <p className="text-gray-300">{selectedInvoice.customerEmail}</p>
                <p className="text-gray-300">{selectedInvoice.customerAddress.line1}</p>
                <p className="text-gray-300">
                  {selectedInvoice.customerAddress.city}, {selectedInvoice.customerAddress.state} {selectedInvoice.customerAddress.postalCode}
                </p>
              </div>
              <div className="text-right">
                <div className="mb-3">
                  <p className="text-sm text-gray-400">Issue Date</p>
                  <p className="text-white">{format(new Date(selectedInvoice.issueDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Due Date</p>
                  <p className="text-white">{format(new Date(selectedInvoice.dueDate), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="bg-gray-900 rounded-lg p-4 mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 text-gray-400">Description</th>
                    <th className="text-right py-2 text-gray-400">Qty</th>
                    <th className="text-right py-2 text-gray-400">Price</th>
                    <th className="text-right py-2 text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-800">
                      <td className="py-3 text-white">{item.description}</td>
                      <td className="py-3 text-right text-gray-300">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-300">
                        {invoicingService.formatCurrency(item.unitPrice, selectedInvoice.currency)}
                      </td>
                      <td className="py-3 text-right text-white">
                        {invoicingService.formatCurrency(item.total, selectedInvoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-gray-400">Subtotal</td>
                    <td className="py-2 text-right text-white">
                      {invoicingService.formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}
                    </td>
                  </tr>
                  {selectedInvoice.discount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-right text-gray-400">Discount</td>
                      <td className="py-2 text-right text-green-400">
                        -{invoicingService.formatCurrency(selectedInvoice.discount, selectedInvoice.currency)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="py-2 text-right text-gray-400">Tax</td>
                    <td className="py-2 text-right text-white">
                      {invoicingService.formatCurrency(selectedInvoice.tax, selectedInvoice.currency)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-700">
                    <td colSpan={3} className="py-3 text-right text-lg font-medium text-white">Total</td>
                    <td className="py-3 text-right text-lg font-bold text-white">
                      {invoicingService.formatCurrency(selectedInvoice.total, selectedInvoice.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedInvoice.notes && (
              <div className="mb-6">
                <h4 className="text-sm text-gray-400 mb-2">Notes</h4>
                <p className="text-gray-300">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice.id)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                Download PDF
              </button>
              {selectedInvoice.status === 'pending' && (
                <button
                  onClick={() => handleSendInvoice(selectedInvoice.id)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  Send Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(InvoicingPage);