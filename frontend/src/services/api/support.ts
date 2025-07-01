import api from '../api';
import {
  SupportTicket,
  TicketMessage,
  TicketStats,
  FAQItem,
  KnowledgeBaseArticle,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from '@/types/support';

export const supportAPI = {
  // Tickets
  getTickets: async (params?: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: SupportTicket[]; total: number }> => {
    const { data } = await api.get('/support/tickets', { params });
    return data;
  },

  getTicketDetails: async (ticketId: string): Promise<SupportTicket> => {
    const { data } = await api.get(`/support/tickets/${ticketId}`);
    return data;
  },

  createTicket: async (ticket: {
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    attachments?: File[];
  }): Promise<SupportTicket> => {
    const formData = new FormData();
    formData.append('subject', ticket.subject);
    formData.append('description', ticket.description);
    formData.append('category', ticket.category);
    formData.append('priority', ticket.priority);
    
    if (ticket.attachments) {
      ticket.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const { data } = await api.post('/support/tickets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  updateTicket: async (ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> => {
    const { data } = await api.put(`/support/tickets/${ticketId}`, updates);
    return data;
  },

  closeTicket: async (ticketId: string, satisfaction?: number): Promise<SupportTicket> => {
    const { data } = await api.post(`/support/tickets/${ticketId}/close`, {
      satisfaction
    });
    return data;
  },

  // Messages
  addMessage: async (ticketId: string, message: {
    message: string;
    attachments?: File[];
  }): Promise<TicketMessage> => {
    const formData = new FormData();
    formData.append('message', message.message);
    
    if (message.attachments) {
      message.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    const { data } = await api.post(`/support/tickets/${ticketId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  getTicketMessages: async (ticketId: string): Promise<TicketMessage[]> => {
    const { data } = await api.get(`/support/tickets/${ticketId}/messages`);
    return data;
  },

  // Stats
  getTicketStats: async (): Promise<TicketStats> => {
    const { data } = await api.get('/support/stats');
    return data;
  },

  // Knowledge Base
  searchKnowledgeBase: async (query: string): Promise<KnowledgeBaseArticle[]> => {
    const { data } = await api.get('/support/knowledge-base/search', {
      params: { q: query }
    });
    return data;
  },

  getKnowledgeBaseArticle: async (articleId: string): Promise<KnowledgeBaseArticle> => {
    const { data } = await api.get(`/support/knowledge-base/${articleId}`);
    return data;
  },

  getKnowledgeBaseCategories: async (): Promise<string[]> => {
    const { data } = await api.get('/support/knowledge-base/categories');
    return data;
  },

  getArticlesByCategory: async (category: string): Promise<KnowledgeBaseArticle[]> => {
    const { data } = await api.get('/support/knowledge-base', {
      params: { category }
    });
    return data;
  },

  rateArticle: async (articleId: string, helpful: boolean): Promise<void> => {
    await api.post(`/support/knowledge-base/${articleId}/rate`, { helpful });
  },

  // FAQ
  getFAQs: async (category?: string): Promise<FAQItem[]> => {
    const { data } = await api.get('/support/faqs', {
      params: { category }
    });
    return data;
  },

  rateFAQ: async (faqId: string, helpful: boolean): Promise<void> => {
    await api.post(`/support/faqs/${faqId}/rate`, { helpful });
  },

  // Live Chat
  initiateLiveChat: async (): Promise<{ sessionId: string; agentName: string }> => {
    const { data } = await api.post('/support/live-chat/initiate');
    return data;
  },

  endLiveChat: async (sessionId: string): Promise<void> => {
    await api.post(`/support/live-chat/${sessionId}/end`);
  },

  // Export
  exportTickets: async (format: 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    const { data } = await api.get('/support/tickets/export', {
      params: { format },
      responseType: 'blob'
    });
    return data;
  }
};