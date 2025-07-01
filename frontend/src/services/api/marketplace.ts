import axios from 'axios';
import { 
  MarketplaceItem, 
  MarketplaceCategory, 
  MarketplaceReview, 
  CartItem, 
  MarketplaceFilters,
  MarketplaceStats 
} from '../../types/marketplace';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class MarketplaceApi {
  private axiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/marketplace`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add auth token to requests if available
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Items
  async getItems(filters?: MarketplaceFilters) {
    const response = await this.axiosInstance.get<{
      items: MarketplaceItem[];
      total: number;
      page: number;
      pages: number;
    }>('/items', { params: filters });
    return response.data;
  }

  async getItem(id: string) {
    const response = await this.axiosInstance.get<MarketplaceItem>(`/items/${id}`);
    return response.data;
  }

  async createItem(data: Partial<MarketplaceItem>) {
    const response = await this.axiosInstance.post<MarketplaceItem>('/items', data);
    return response.data;
  }

  async updateItem(id: string, data: Partial<MarketplaceItem>) {
    const response = await this.axiosInstance.put<MarketplaceItem>(`/items/${id}`, data);
    return response.data;
  }

  async deleteItem(id: string) {
    await this.axiosInstance.delete(`/items/${id}`);
  }

  // Categories
  async getCategories() {
    const response = await this.axiosInstance.get<MarketplaceCategory[]>('/categories');
    return response.data;
  }

  async getCategory(id: string) {
    const response = await this.axiosInstance.get<MarketplaceCategory>(`/categories/${id}`);
    return response.data;
  }

  // Reviews
  async getReviews(itemId: string) {
    const response = await this.axiosInstance.get<MarketplaceReview[]>(`/items/${itemId}/reviews`);
    return response.data;
  }

  async createReview(itemId: string, data: Partial<MarketplaceReview>) {
    const response = await this.axiosInstance.post<MarketplaceReview>(
      `/items/${itemId}/reviews`,
      data
    );
    return response.data;
  }

  async updateReview(itemId: string, reviewId: string, data: Partial<MarketplaceReview>) {
    const response = await this.axiosInstance.put<MarketplaceReview>(
      `/items/${itemId}/reviews/${reviewId}`,
      data
    );
    return response.data;
  }

  async deleteReview(itemId: string, reviewId: string) {
    await this.axiosInstance.delete(`/items/${itemId}/reviews/${reviewId}`);
  }

  // Favorites
  async getFavorites() {
    const response = await this.axiosInstance.get<MarketplaceItem[]>('/favorites');
    return response.data;
  }

  async toggleFavorite(itemId: string) {
    const response = await this.axiosInstance.post<{ isFavorite: boolean }>(
      `/items/${itemId}/favorite`
    );
    return response.data;
  }

  // Cart
  async getCart() {
    const response = await this.axiosInstance.get<CartItem[]>('/cart');
    return response.data;
  }

  async addToCart(itemId: string, quantity: number = 1) {
    const response = await this.axiosInstance.post<CartItem>('/cart', {
      itemId,
      quantity,
    });
    return response.data;
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    const response = await this.axiosInstance.put<CartItem>(`/cart/${cartItemId}`, {
      quantity,
    });
    return response.data;
  }

  async removeFromCart(cartItemId: string) {
    await this.axiosInstance.delete(`/cart/${cartItemId}`);
  }

  async clearCart() {
    await this.axiosInstance.delete('/cart');
  }

  // Search
  async searchItems(query: string, filters?: MarketplaceFilters) {
    const response = await this.axiosInstance.get<{
      items: MarketplaceItem[];
      total: number;
    }>('/search', {
      params: {
        q: query,
        ...filters,
      },
    });
    return response.data;
  }

  // Stats
  async getStats() {
    const response = await this.axiosInstance.get<MarketplaceStats>('/stats');
    return response.data;
  }

  // Related items
  async getRelatedItems(itemId: string, limit: number = 4) {
    const response = await this.axiosInstance.get<MarketplaceItem[]>(
      `/items/${itemId}/related`,
      { params: { limit } }
    );
    return response.data;
  }

  // Purchase
  async purchaseItem(itemId: string, paymentMethod: string) {
    const response = await this.axiosInstance.post(`/items/${itemId}/purchase`, {
      paymentMethod,
    });
    return response.data;
  }

  // User's items
  async getUserItems(userId?: string) {
    const endpoint = userId ? `/users/${userId}/items` : '/user/items';
    const response = await this.axiosInstance.get<MarketplaceItem[]>(endpoint);
    return response.data;
  }

  // User's purchases
  async getUserPurchases() {
    const response = await this.axiosInstance.get('/user/purchases');
    return response.data;
  }
}

export const marketplaceApi = new MarketplaceApi();