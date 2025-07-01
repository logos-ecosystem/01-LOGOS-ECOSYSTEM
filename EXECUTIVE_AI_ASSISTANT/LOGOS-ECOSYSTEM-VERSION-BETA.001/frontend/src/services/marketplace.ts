import { api } from '../api';

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  seller: {
    id: string;
    username: string;
    rating: number;
  };
  images: string[];
  rating: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    is_verified: boolean;
  };
  rating: number;
  title: string;
  content: string;
  helpful_count: number;
  not_helpful_count: number;
  user_vote?: 'helpful' | 'not_helpful';
  created_at: string;
  updated_at: string;
  is_verified_purchase: boolean;
}

export interface MarketplaceFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

export const marketplaceApi = {
  // Get all items with filters
  getItems: async (filters?: MarketplaceFilters) => {
    const response = await api.get('/api/marketplace/items', { params: filters });
    return response.data;
  },

  // Get single item
  getItem: async (id: string) => {
    const response = await api.get(`/api/marketplace/items/${id}`);
    return response.data;
  },

  // Create new item
  createItem: async (data: FormData) => {
    const response = await api.post('/api/marketplace/items', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Update item
  updateItem: async (id: string, data: Partial<MarketplaceItem>) => {
    const response = await api.put(`/api/marketplace/items/${id}`, data);
    return response.data;
  },

  // Delete item
  deleteItem: async (id: string) => {
    const response = await api.delete(`/api/marketplace/items/${id}`);
    return response.data;
  },

  // Purchase item
  purchaseItem: async (id: string, paymentData: any) => {
    const response = await api.post(`/api/marketplace/items/${id}/purchase`, paymentData);
    return response.data;
  },

  // Get item reviews
  getItemReviews: async (id: string) => {
    const response = await api.get(`/api/marketplace/items/${id}/reviews`);
    return response.data;
  },

  // Submit review
  submitReview: async (itemId: string, reviewData: { rating: number; title: string; content: string }) => {
    const response = await api.post(`/api/marketplace/items/${itemId}/reviews`, reviewData);
    return response.data;
  },

  // Vote on review
  voteReview: async (reviewId: string, vote: 'helpful' | 'not_helpful') => {
    const response = await api.post(`/api/marketplace/reviews/${reviewId}/vote`, { vote });
    return response.data;
  },

  // Report review
  reportReview: async (reviewId: string, reason: string) => {
    const response = await api.post(`/api/marketplace/reviews/${reviewId}/report`, { reason });
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/api/marketplace/categories');
    return response.data;
  },

  // Get seller items
  getSellerItems: async (sellerId: string) => {
    const response = await api.get(`/api/marketplace/sellers/${sellerId}/items`);
    return response.data;
  },

  // Get user purchases
  getUserPurchases: async () => {
    const response = await api.get('/api/marketplace/purchases');
    return response.data;
  },

  // Get user sales
  getUserSales: async () => {
    const response = await api.get('/api/marketplace/sales');
    return response.data;
  }
};

export default marketplaceApi;