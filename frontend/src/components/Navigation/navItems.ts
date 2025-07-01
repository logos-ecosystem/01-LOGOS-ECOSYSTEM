export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: 'fas fa-home',
  },
  {
    label: 'Marketplace',
    path: '/marketplace/enhanced',
    icon: 'fas fa-store',
  },
  {
    label: 'Products',
    path: '/products',
    icon: 'fas fa-box',
    children: [
      {
        label: 'AI Agents',
        path: '/products/ai-agents',
      },
      {
        label: 'Solutions',
        path: '/products/solutions',
      },
      {
        label: 'Integrations',
        path: '/products/integrations',
      },
    ],
  },
  {
    label: 'Services',
    path: '/services',
    icon: 'fas fa-cogs',
    children: [
      {
        label: 'Consulting',
        path: '/services/consulting',
      },
      {
        label: 'Support',
        path: '/services/support',
      },
      {
        label: 'Training',
        path: '/services/training',
      },
    ],
  },
  {
    label: 'Company',
    path: '/company',
    icon: 'fas fa-building',
    children: [
      {
        label: 'About Us',
        path: '/company/about',
      },
      {
        label: 'Blog',
        path: '/company/blog',
      },
      {
        label: 'Careers',
        path: '/company/careers',
      },
      {
        label: 'Contact',
        path: '/company/contact',
      },
    ],
  },
];

export const dashboardNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard/advanced',
    icon: 'fas fa-tachometer-alt',
  },
  {
    label: 'My Bots',
    path: '/dashboard/bots',
    icon: 'fas fa-robot',
  },
  {
    label: 'Analytics',
    path: '/dashboard/analytics',
    icon: 'fas fa-chart-line',
  },
  {
    label: 'Billing',
    path: '/dashboard/billing',
    icon: 'fas fa-credit-card',
  },
  {
    label: 'Invoicing',
    path: '/dashboard/invoicing',
    icon: 'fas fa-file-invoice-dollar',
  },
  {
    label: 'API Keys',
    path: '/dashboard/api-keys',
    icon: 'fas fa-key',
  },
  {
    label: 'Webhooks',
    path: '/dashboard/webhooks',
    icon: 'fas fa-plug',
  },
  {
    label: 'Notifications',
    path: '/dashboard/notifications',
    icon: 'fas fa-bell',
  },
  {
    label: 'Support',
    path: '/dashboard/support',
    icon: 'fas fa-life-ring',
  },
  {
    label: 'Cloudflare',
    path: '/dashboard/cloudflare',
    icon: 'fab fa-cloudflare',
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: 'fas fa-cog',
  },
];