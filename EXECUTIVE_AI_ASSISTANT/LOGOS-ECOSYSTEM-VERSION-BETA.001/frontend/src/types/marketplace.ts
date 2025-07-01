export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: string;
  subcategory?: string;
  tags: string[];
  seller: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  rating: number;
  reviewCount: number;
  views: number;
  sales: number;
  inStock: boolean;
  verified: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  subcategories?: MarketplaceCategory[];
  itemCount?: number;
}

export interface MarketplaceReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  itemId: string;
  rating: number;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  sellerResponse?: {
    comment: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  item: MarketplaceItem;
  quantity: number;
  addedAt: string;
}

export interface MarketplaceFilters {
  categories?: string[];
  priceRange?: [number, number];
  rating?: number;
  verified?: boolean;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  search?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceStats {
  totalItems: number;
  totalSellers: number;
  totalCategories: number;
  totalTransactions: number;
  averageRating: number;
}

export interface SortOption {
  value: string;
  label: string;
}