export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  tags: string[];
  attachments: TicketAttachment[];
  messages: TicketMessage[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  satisfaction?: number;
}

export type TicketCategory = 
  | 'technical'
  | 'billing'
  | 'account'
  | 'feature-request'
  | 'bug-report'
  | 'integration'
  | 'other';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 
  | 'open'
  | 'in-progress'
  | 'waiting-customer'
  | 'waiting-support'
  | 'resolved'
  | 'closed';

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: 'customer' | 'support' | 'admin';
  message: string;
  attachments: TicketAttachment[];
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  helpful: number;
  notHelpful: number;
  relatedArticles: string[];
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  tags: string[];
  author: string;
  views: number;
  helpful: number;
  lastUpdated: Date;
  relatedArticles: string[];
}