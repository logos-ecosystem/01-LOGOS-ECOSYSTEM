// LOGOS AI Expert Bots - Complete Product Catalog
// Most Profitable and Useful AI Bot Products

export interface AIExpertBot {
  id: string;
  name: string;
  category: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  potentialRevenue: string;
  targetMarket: string[];
  features: string[];
  integrations: string[];
  aiModels: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  supportLevel: 'basic' | 'priority' | 'dedicated' | 'white-glove';
  customization: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  popularity: number; // 1-10 scale
  profitMargin: number; // percentage
}

export const AI_EXPERT_BOTS_CATALOG: AIExpertBot[] = [
  // LEGAL & COMPLIANCE BOTS
  {
    id: 'legal-advisor-pro',
    name: 'Legal Advisor Pro',
    category: 'Legal & Compliance',
    description: 'AI-powered legal assistant for contract analysis, compliance checking, and legal research',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    potentialRevenue: '$50K-500K/year per enterprise client',
    targetMarket: ['Law Firms', 'Corporate Legal Departments', 'Startups', 'SMEs'],
    features: [
      'Contract Analysis & Generation',
      'Legal Research Assistant',
      'Compliance Monitoring',
      'Case Law Database Access',
      'Document Automation',
      'Risk Assessment',
      'Multi-jurisdiction Support',
      'Client Communication Templates'
    ],
    integrations: ['DocuSign', 'Adobe Sign', 'Microsoft 365', 'Google Workspace', 'Salesforce'],
    aiModels: ['GPT-4', 'Claude-3', 'Custom Legal LLM'],
    skillLevel: 'expert',
    supportLevel: 'dedicated',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 9,
    profitMargin: 85
  },

  // FINANCIAL & INVESTMENT BOTS
  {
    id: 'financial-analyst-elite',
    name: 'Financial Analyst Elite',
    category: 'Finance & Investment',
    description: 'Advanced AI for financial analysis, market predictions, and investment strategies',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    potentialRevenue: '$100K-1M/year per financial institution',
    targetMarket: ['Investment Banks', 'Hedge Funds', 'Financial Advisors', 'High Net Worth Individuals'],
    features: [
      'Real-time Market Analysis',
      'Portfolio Optimization',
      'Risk Management',
      'Financial Forecasting',
      'Automated Trading Signals',
      'Sentiment Analysis',
      'Regulatory Compliance',
      'Custom Financial Reports'
    ],
    integrations: ['Bloomberg Terminal', 'Reuters', 'TradingView', 'MetaTrader', 'Interactive Brokers'],
    aiModels: ['GPT-4', 'Custom FinBERT', 'Time Series Models'],
    skillLevel: 'expert',
    supportLevel: 'white-glove',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 10,
    profitMargin: 90
  },

  {
    id: 'crypto-trading-master',
    name: 'Crypto Trading Master',
    category: 'Cryptocurrency',
    description: 'AI-powered cryptocurrency trading bot with advanced market analysis',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    potentialRevenue: '$30K-300K/year',
    targetMarket: ['Crypto Traders', 'Investment Funds', 'DeFi Protocols'],
    features: [
      'Multi-exchange Trading',
      'DeFi Integration',
      'Arbitrage Detection',
      'Technical Analysis',
      'Sentiment Monitoring',
      'Portfolio Rebalancing',
      'Risk Management',
      'Tax Optimization'
    ],
    integrations: ['Binance', 'Coinbase', 'Kraken', 'Uniswap', 'MetaMask'],
    aiModels: ['GPT-4', 'Custom Crypto Models'],
    skillLevel: 'advanced',
    supportLevel: 'priority',
    customization: true,
    apiAccess: true,
    whiteLabel: false,
    popularity: 8,
    profitMargin: 80
  },

  // HEALTHCARE & MEDICAL BOTS
  {
    id: 'medical-diagnosis-assistant',
    name: 'Medical Diagnosis Assistant',
    category: 'Healthcare',
    description: 'AI medical assistant for diagnosis support, patient monitoring, and treatment recommendations',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    potentialRevenue: '$200K-2M/year per hospital',
    targetMarket: ['Hospitals', 'Clinics', 'Telemedicine Platforms', 'Healthcare Providers'],
    features: [
      'Symptom Analysis',
      'Diagnosis Suggestions',
      'Drug Interaction Checker',
      'Patient History Analysis',
      'Medical Literature Search',
      'Treatment Recommendations',
      'Lab Result Interpretation',
      'HIPAA Compliant'
    ],
    integrations: ['Epic', 'Cerner', 'Athenahealth', 'FHIR APIs', 'Medical Devices'],
    aiModels: ['MedPaLM', 'BioBERT', 'Custom Medical LLMs'],
    skillLevel: 'expert',
    supportLevel: 'white-glove',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 9,
    profitMargin: 88
  },

  // SALES & MARKETING BOTS
  {
    id: 'sales-automation-pro',
    name: 'Sales Automation Pro',
    category: 'Sales & Marketing',
    description: 'AI sales assistant for lead generation, qualification, and conversion optimization',
    monthlyPrice: 599,
    yearlyPrice: 5990,
    potentialRevenue: '$20K-200K/year',
    targetMarket: ['Sales Teams', 'Marketing Agencies', 'E-commerce', 'B2B Companies'],
    features: [
      'Lead Scoring & Qualification',
      'Automated Outreach',
      'Email Personalization',
      'Meeting Scheduling',
      'Sales Forecasting',
      'CRM Integration',
      'Conversation Intelligence',
      'Performance Analytics'
    ],
    integrations: ['Salesforce', 'HubSpot', 'Pipedrive', 'LinkedIn Sales Navigator', 'Zoom'],
    aiModels: ['GPT-4', 'Custom Sales Models'],
    skillLevel: 'intermediate',
    supportLevel: 'priority',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 8,
    profitMargin: 75
  },

  {
    id: 'content-creator-genius',
    name: 'Content Creator Genius',
    category: 'Content & Marketing',
    description: 'AI content generation for blogs, social media, ads, and marketing campaigns',
    monthlyPrice: 399,
    yearlyPrice: 3990,
    potentialRevenue: '$15K-150K/year',
    targetMarket: ['Content Creators', 'Marketing Teams', 'Agencies', 'Influencers'],
    features: [
      'Blog Post Generation',
      'Social Media Content',
      'Ad Copy Creation',
      'SEO Optimization',
      'Video Script Writing',
      'Brand Voice Matching',
      'Multi-language Support',
      'Content Calendar'
    ],
    integrations: ['WordPress', 'Buffer', 'Hootsuite', 'Google Analytics', 'Canva'],
    aiModels: ['GPT-4', 'Claude-3', 'DALL-E 3'],
    skillLevel: 'beginner',
    supportLevel: 'basic',
    customization: true,
    apiAccess: true,
    whiteLabel: false,
    popularity: 7,
    profitMargin: 70
  },

  // REAL ESTATE BOTS
  {
    id: 'real-estate-advisor',
    name: 'Real Estate Advisor AI',
    category: 'Real Estate',
    description: 'AI assistant for property valuation, market analysis, and investment recommendations',
    monthlyPrice: 899,
    yearlyPrice: 8990,
    potentialRevenue: '$40K-400K/year',
    targetMarket: ['Real Estate Agents', 'Property Investors', 'Property Management Companies'],
    features: [
      'Property Valuation',
      'Market Trend Analysis',
      'Investment ROI Calculator',
      'Virtual Property Tours',
      'Lead Generation',
      'Document Automation',
      'Comparative Market Analysis',
      'Rental Yield Optimization'
    ],
    integrations: ['MLS APIs', 'Zillow', 'Redfin', 'DocuSign', 'Property Management Systems'],
    aiModels: ['GPT-4', 'Custom Real Estate Models'],
    skillLevel: 'advanced',
    supportLevel: 'priority',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 7,
    profitMargin: 78
  },

  // HR & RECRUITMENT BOTS
  {
    id: 'hr-talent-acquisition',
    name: 'HR Talent Acquisition AI',
    category: 'Human Resources',
    description: 'AI-powered recruitment and HR management assistant',
    monthlyPrice: 699,
    yearlyPrice: 6990,
    potentialRevenue: '$30K-300K/year',
    targetMarket: ['HR Departments', 'Recruitment Agencies', 'Enterprises'],
    features: [
      'Resume Screening',
      'Candidate Matching',
      'Interview Scheduling',
      'Skills Assessment',
      'Employee Onboarding',
      'Performance Reviews',
      'Compliance Tracking',
      'Diversity Analytics'
    ],
    integrations: ['LinkedIn', 'Indeed', 'Workday', 'BambooHR', 'ADP'],
    aiModels: ['GPT-4', 'Custom HR Models'],
    skillLevel: 'intermediate',
    supportLevel: 'priority',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 6,
    profitMargin: 72
  },

  // CYBERSECURITY BOTS
  {
    id: 'cybersecurity-guardian',
    name: 'Cybersecurity Guardian',
    category: 'Security',
    description: 'AI-powered threat detection, vulnerability assessment, and security automation',
    monthlyPrice: 1299,
    yearlyPrice: 12990,
    potentialRevenue: '$60K-600K/year',
    targetMarket: ['Enterprises', 'Government', 'Financial Institutions', 'Healthcare'],
    features: [
      'Threat Detection & Response',
      'Vulnerability Scanning',
      'Security Audit Automation',
      'Incident Response',
      'Compliance Monitoring',
      'User Behavior Analytics',
      'Zero Trust Architecture',
      '24/7 Monitoring'
    ],
    integrations: ['SIEM Systems', 'Splunk', 'CrowdStrike', 'Palo Alto Networks', 'AWS Security Hub'],
    aiModels: ['Custom Security Models', 'Anomaly Detection AI'],
    skillLevel: 'expert',
    supportLevel: 'dedicated',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 9,
    profitMargin: 82
  },

  // TAX & ACCOUNTING BOTS
  {
    id: 'tax-advisor-pro',
    name: 'Tax Advisor Pro',
    category: 'Tax & Accounting',
    description: 'AI tax preparation, planning, and compliance assistant',
    monthlyPrice: 799,
    yearlyPrice: 7990,
    potentialRevenue: '$40K-400K/year',
    targetMarket: ['Accounting Firms', 'Tax Professionals', 'Small Businesses', 'Individuals'],
    features: [
      'Tax Return Preparation',
      'Tax Planning Strategies',
      'Deduction Optimization',
      'Audit Support',
      'Multi-state Compliance',
      'Cryptocurrency Tax',
      'Real-time Tax Updates',
      'IRS Integration'
    ],
    integrations: ['QuickBooks', 'Xero', 'TurboTax', 'IRS Systems', 'Banking APIs'],
    aiModels: ['GPT-4', 'Custom Tax Models'],
    skillLevel: 'advanced',
    supportLevel: 'priority',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 8,
    profitMargin: 76
  },

  // EDUCATION & TRAINING BOTS
  {
    id: 'education-tutor-ai',
    name: 'Education Tutor AI',
    category: 'Education',
    description: 'Personalized AI tutor for students and professional training',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    potentialRevenue: '$10K-100K/year',
    targetMarket: ['Schools', 'Universities', 'Training Centers', 'Individual Learners'],
    features: [
      'Personalized Learning Paths',
      'Interactive Lessons',
      'Progress Tracking',
      'Quiz Generation',
      'Multi-subject Support',
      'Language Learning',
      'Homework Assistance',
      'Parent/Teacher Reports'
    ],
    integrations: ['Google Classroom', 'Canvas', 'Moodle', 'Zoom', 'Microsoft Teams'],
    aiModels: ['GPT-4', 'Custom Education Models'],
    skillLevel: 'beginner',
    supportLevel: 'basic',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 6,
    profitMargin: 68
  },

  // CUSTOMER SERVICE BOTS
  {
    id: 'customer-support-enterprise',
    name: 'Customer Support Enterprise',
    category: 'Customer Service',
    description: 'Enterprise-grade AI customer support with omnichannel capabilities',
    monthlyPrice: 1199,
    yearlyPrice: 11990,
    potentialRevenue: '$50K-500K/year',
    targetMarket: ['E-commerce', 'SaaS Companies', 'Telecoms', 'Banks'],
    features: [
      'Omnichannel Support',
      'Sentiment Analysis',
      'Ticket Automation',
      'Live Chat Integration',
      'Voice Support',
      'Knowledge Base AI',
      'Multilingual Support',
      'Analytics Dashboard'
    ],
    integrations: ['Zendesk', 'Intercom', 'Freshdesk', 'Slack', 'WhatsApp Business'],
    aiModels: ['GPT-4', 'Custom Support Models'],
    skillLevel: 'intermediate',
    supportLevel: 'dedicated',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 8,
    profitMargin: 80
  },

  // SPECIALIZED INDUSTRY BOTS
  {
    id: 'supply-chain-optimizer',
    name: 'Supply Chain Optimizer',
    category: 'Logistics & Supply Chain',
    description: 'AI for supply chain optimization, inventory management, and logistics',
    monthlyPrice: 1599,
    yearlyPrice: 15990,
    potentialRevenue: '$80K-800K/year',
    targetMarket: ['Manufacturing', 'Retail', 'Logistics Companies', 'Distributors'],
    features: [
      'Demand Forecasting',
      'Inventory Optimization',
      'Route Planning',
      'Supplier Management',
      'Risk Assessment',
      'Cost Optimization',
      'Real-time Tracking',
      'Predictive Maintenance'
    ],
    integrations: ['SAP', 'Oracle', 'Microsoft Dynamics', 'IoT Sensors', 'GPS Systems'],
    aiModels: ['Custom Supply Chain Models', 'Time Series AI'],
    skillLevel: 'expert',
    supportLevel: 'white-glove',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 7,
    profitMargin: 85
  },

  {
    id: 'insurance-underwriting-ai',
    name: 'Insurance Underwriting AI',
    category: 'Insurance',
    description: 'AI-powered insurance underwriting, risk assessment, and claims processing',
    monthlyPrice: 1799,
    yearlyPrice: 17990,
    potentialRevenue: '$100K-1M/year',
    targetMarket: ['Insurance Companies', 'Brokers', 'Reinsurers'],
    features: [
      'Risk Assessment',
      'Premium Calculation',
      'Claims Processing',
      'Fraud Detection',
      'Policy Generation',
      'Customer Profiling',
      'Regulatory Compliance',
      'Predictive Analytics'
    ],
    integrations: ['Guidewire', 'Duck Creek', 'Salesforce Financial Cloud', 'Medical Records APIs'],
    aiModels: ['Custom Insurance Models', 'Fraud Detection AI'],
    skillLevel: 'expert',
    supportLevel: 'white-glove',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 8,
    profitMargin: 87
  },

  {
    id: 'energy-management-ai',
    name: 'Energy Management AI',
    category: 'Energy & Utilities',
    description: 'AI for energy optimization, grid management, and sustainability',
    monthlyPrice: 1399,
    yearlyPrice: 13990,
    potentialRevenue: '$70K-700K/year',
    targetMarket: ['Utilities', 'Manufacturing', 'Commercial Buildings', 'Smart Cities'],
    features: [
      'Energy Consumption Analysis',
      'Predictive Maintenance',
      'Grid Optimization',
      'Renewable Integration',
      'Carbon Footprint Tracking',
      'Cost Optimization',
      'Demand Response',
      'IoT Integration'
    ],
    integrations: ['SCADA Systems', 'Building Management Systems', 'IoT Platforms', 'Weather APIs'],
    aiModels: ['Custom Energy Models', 'Predictive Analytics AI'],
    skillLevel: 'expert',
    supportLevel: 'dedicated',
    customization: true,
    apiAccess: true,
    whiteLabel: true,
    popularity: 6,
    profitMargin: 83
  }
];

// Revenue calculation helper
export function calculatePotentialRevenue(bot: AIExpertBot, customers: number): number {
  const yearlyRevenue = bot.yearlyPrice * customers;
  const profit = yearlyRevenue * (bot.profitMargin / 100);
  return profit;
}

// Get bots by category
export function getBotsByCategory(category: string): AIExpertBot[] {
  return AI_EXPERT_BOTS_CATALOG.filter(bot => bot.category === category);
}

// Get most profitable bots
export function getMostProfitableBots(limit: number = 5): AIExpertBot[] {
  return AI_EXPERT_BOTS_CATALOG
    .sort((a, b) => b.profitMargin - a.profitMargin)
    .slice(0, limit);
}

// Get most popular bots
export function getMostPopularBots(limit: number = 5): AIExpertBot[] {
  return AI_EXPERT_BOTS_CATALOG
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

// Categories
export const BOT_CATEGORIES = [
  'Legal & Compliance',
  'Finance & Investment',
  'Cryptocurrency',
  'Healthcare',
  'Sales & Marketing',
  'Content & Marketing',
  'Real Estate',
  'Human Resources',
  'Security',
  'Tax & Accounting',
  'Education',
  'Customer Service',
  'Logistics & Supply Chain',
  'Insurance',
  'Energy & Utilities'
];

export default AI_EXPERT_BOTS_CATALOG;