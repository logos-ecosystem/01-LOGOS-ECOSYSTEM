"""
GraphQL Schema Definition for LOGOS Ecosystem
"""
import strawberry
from strawberry.types import Info
from strawberry.scalars import JSON
from typing import List, Optional, Union
from datetime import datetime
from decimal import Decimal
import uuid
from enum import Enum

# Custom Scalar Types
@strawberry.scalar
class DateTime:
    """DateTime scalar type"""
    serialize = lambda v: v.isoformat() if v else None
    parse_value = lambda v: datetime.fromisoformat(v) if v else None

@strawberry.scalar
class UUID:
    """UUID scalar type"""
    serialize = lambda v: str(v) if v else None
    parse_value = lambda v: uuid.UUID(v) if v else None

@strawberry.scalar
class DecimalType:
    """Decimal scalar type for financial precision"""
    serialize = lambda v: str(v) if v else None
    parse_value = lambda v: Decimal(v) if v else None

# Enums
@strawberry.enum
class UserRole(Enum):
    USER = "user"
    SELLER = "seller"
    ADMIN = "admin"
    MODERATOR = "moderator"

@strawberry.enum
class TransactionType(Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    PURCHASE = "purchase"
    SALE = "sale"
    TRANSFER = "transfer"
    REFUND = "refund"

@strawberry.enum
class ItemStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    SOLD = "sold"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"

@strawberry.enum
class OrderStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"

@strawberry.enum
class AIModel(Enum):
    GPT4 = "gpt-4"
    GPT35_TURBO = "gpt-3.5-turbo"
    CLAUDE_3 = "claude-3"
    LLAMA_2 = "llama-2"

# User Types
@strawberry.type
class User:
    id: UUID
    email: str
    username: str
    full_name: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: DateTime
    updated_at: DateTime
    last_login: Optional[DateTime]
    profile_image: Optional[str]
    bio: Optional[str]
    
    # Relationships
    wallet: Optional['Wallet']
    items: List['MarketplaceItem']
    purchases: List['Order']
    reviews: List['Review']
    ai_sessions: List['AISession']

@strawberry.type
class UserProfile:
    user: User
    total_sales: int
    total_purchases: int
    average_rating: float
    verification_status: str
    joined_date: DateTime

# Wallet Types
@strawberry.type
class Wallet:
    id: UUID
    user_id: UUID
    balance: DecimalType
    locked_balance: DecimalType
    currency: str
    created_at: DateTime
    updated_at: DateTime
    
    # Relationships
    user: User
    transactions: List['Transaction']

@strawberry.type
class Transaction:
    id: UUID
    wallet_id: UUID
    type: TransactionType
    amount: DecimalType
    fee: DecimalType
    reference_id: Optional[str]
    description: Optional[str]
    status: str
    created_at: DateTime
    completed_at: Optional[DateTime]
    metadata: Optional[JSON]
    
    # Relationships
    wallet: Wallet

# Marketplace Types
@strawberry.type
class MarketplaceItem:
    id: UUID
    seller_id: UUID
    title: str
    description: str
    price: DecimalType
    category: str
    tags: List[str]
    images: List[str]
    status: ItemStatus
    views: int
    likes: int
    created_at: DateTime
    updated_at: DateTime
    
    # Relationships
    seller: User
    reviews: List['Review']
    orders: List['Order']

@strawberry.type
class Category:
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    parent_id: Optional[UUID]
    image: Optional[str]
    item_count: int
    
    # Relationships
    parent: Optional['Category']
    children: List['Category']
    items: List[MarketplaceItem]

@strawberry.type
class Order:
    id: UUID
    buyer_id: UUID
    seller_id: UUID
    item_id: UUID
    quantity: int
    unit_price: DecimalType
    total_price: DecimalType
    status: OrderStatus
    created_at: DateTime
    updated_at: DateTime
    completed_at: Optional[DateTime]
    
    # Relationships
    buyer: User
    seller: User
    item: MarketplaceItem
    transaction: Optional[Transaction]
    review: Optional['Review']

@strawberry.type
class Review:
    id: UUID
    reviewer_id: UUID
    item_id: UUID
    order_id: UUID
    rating: int
    comment: Optional[str]
    images: List[str]
    is_verified_purchase: bool
    created_at: DateTime
    updated_at: DateTime
    
    # Relationships
    reviewer: User
    item: MarketplaceItem
    order: Order

# AI Types
@strawberry.type
class AISession:
    id: UUID
    user_id: UUID
    model: AIModel
    title: str
    created_at: DateTime
    updated_at: DateTime
    total_tokens: int
    total_cost: DecimalType
    
    # Relationships
    user: User
    messages: List['AIMessage']

@strawberry.type
class AIMessage:
    id: UUID
    session_id: UUID
    role: str
    content: str
    tokens: int
    created_at: DateTime
    
    # Relationships
    session: AISession

@strawberry.type
class AIUsageStats:
    user_id: UUID
    daily_tokens: int
    daily_cost: DecimalType
    monthly_tokens: int
    monthly_cost: DecimalType
    remaining_credits: DecimalType
    model_usage: JSON

# Analytics Types
@strawberry.type
class MarketplaceStats:
    total_items: int
    active_items: int
    total_sales: int
    total_revenue: DecimalType
    average_order_value: DecimalType
    top_categories: List[Category]
    trending_items: List[MarketplaceItem]

@strawberry.type
class WalletStats:
    total_balance: DecimalType
    total_deposits: DecimalType
    total_withdrawals: DecimalType
    total_transactions: int
    recent_transactions: List[Transaction]

# Input Types
@strawberry.input
class CreateUserInput:
    email: str
    username: str
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.USER

@strawberry.input
class UpdateUserInput:
    full_name: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None

@strawberry.input
class CreateItemInput:
    title: str
    description: str
    price: DecimalType
    category: str
    tags: List[str]
    images: List[str]

@strawberry.input
class UpdateItemInput:
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[DecimalType] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    status: Optional[ItemStatus] = None

@strawberry.input
class CreateOrderInput:
    item_id: UUID
    quantity: int = 1

@strawberry.input
class CreateReviewInput:
    item_id: UUID
    order_id: UUID
    rating: int
    comment: Optional[str] = None
    images: Optional[List[str]] = None

@strawberry.input
class TransferFundsInput:
    recipient_email: str
    amount: DecimalType
    description: Optional[str] = None

@strawberry.input
class WithdrawFundsInput:
    amount: DecimalType
    bank_account: str
    description: Optional[str] = None

@strawberry.input
class DepositFundsInput:
    amount: DecimalType
    payment_method: str
    description: Optional[str] = None

@strawberry.input
class CreateAISessionInput:
    model: AIModel
    title: Optional[str] = None

@strawberry.input
class SendAIMessageInput:
    session_id: UUID
    content: str

# Filter Types
@strawberry.input
class ItemFilter:
    category: Optional[str] = None
    min_price: Optional[DecimalType] = None
    max_price: Optional[DecimalType] = None
    tags: Optional[List[str]] = None
    seller_id: Optional[UUID] = None
    status: Optional[ItemStatus] = None
    search: Optional[str] = None

@strawberry.input
class TransactionFilter:
    type: Optional[TransactionType] = None
    start_date: Optional[DateTime] = None
    end_date: Optional[DateTime] = None
    min_amount: Optional[DecimalType] = None
    max_amount: Optional[DecimalType] = None

@strawberry.input
class OrderFilter:
    status: Optional[OrderStatus] = None
    buyer_id: Optional[UUID] = None
    seller_id: Optional[UUID] = None
    item_id: Optional[UUID] = None
    start_date: Optional[DateTime] = None
    end_date: Optional[DateTime] = None

# Pagination Types
@strawberry.input
class PaginationInput:
    limit: int = 20
    offset: int = 0
    order_by: Optional[str] = None
    order_desc: bool = False

@strawberry.type
class PaginationInfo:
    total: int
    limit: int
    offset: int
    has_next: bool
    has_previous: bool

@strawberry.type
class PaginatedItems:
    items: List[MarketplaceItem]
    pagination: PaginationInfo

@strawberry.type
class PaginatedTransactions:
    transactions: List[Transaction]
    pagination: PaginationInfo

@strawberry.type
class PaginatedOrders:
    orders: List[Order]
    pagination: PaginationInfo

# Response Types
@strawberry.type
class AuthResponse:
    user: User
    access_token: str
    refresh_token: str
    expires_in: int

@strawberry.type
class OperationResponse:
    success: bool
    message: str
    data: Optional[JSON] = None

# Error Types
@strawberry.type
class Error:
    code: str
    message: str
    field: Optional[str] = None

@strawberry.type
class ValidationError:
    errors: List[Error]

# Union Types
AuthResult = Union[AuthResponse, ValidationError]
ItemResult = Union[MarketplaceItem, ValidationError]
OrderResult = Union[Order, ValidationError]
TransactionResult = Union[Transaction, ValidationError]

# Subscription Types
@strawberry.type
class ItemUpdate:
    action: str  # created, updated, deleted
    item: MarketplaceItem

@strawberry.type
class OrderUpdate:
    action: str  # created, updated, cancelled
    order: Order

@strawberry.type
class WalletUpdate:
    wallet: Wallet
    transaction: Optional[Transaction]

@strawberry.type
class ChatMessage:
    session_id: UUID
    message: AIMessage

# Query Type
@strawberry.type
class Query:
    # User queries
    me: Optional[User]
    user: Optional[User]
    users: List[User]
    user_profile: Optional[UserProfile]
    
    # Wallet queries
    my_wallet: Optional[Wallet]
    wallet_stats: Optional[WalletStats]
    transactions: PaginatedTransactions
    transaction: Optional[Transaction]
    
    # Marketplace queries
    items: PaginatedItems
    item: Optional[MarketplaceItem]
    categories: List[Category]
    category: Optional[Category]
    marketplace_stats: MarketplaceStats
    
    # Order queries
    orders: PaginatedOrders
    order: Optional[Order]
    my_purchases: PaginatedOrders
    my_sales: PaginatedOrders
    
    # Review queries
    reviews: List[Review]
    item_reviews: List[Review]
    
    # AI queries
    ai_sessions: List[AISession]
    ai_session: Optional[AISession]
    ai_usage_stats: AIUsageStats
    
    # Search
    search_items: PaginatedItems
    search_users: List[User]

# Mutation Type
@strawberry.type
class Mutation:
    # Auth mutations
    signup: AuthResult
    login: AuthResult
    logout: OperationResponse
    refresh_token: AuthResult
    verify_email: OperationResponse
    request_password_reset: OperationResponse
    reset_password: OperationResponse
    
    # User mutations
    update_profile: User
    change_password: OperationResponse
    delete_account: OperationResponse
    
    # Wallet mutations
    deposit_funds: TransactionResult
    withdraw_funds: TransactionResult
    transfer_funds: TransactionResult
    
    # Marketplace mutations
    create_item: ItemResult
    update_item: ItemResult
    delete_item: OperationResponse
    publish_item: ItemResult
    archive_item: ItemResult
    
    # Order mutations
    create_order: OrderResult
    cancel_order: OrderResult
    complete_order: OrderResult
    refund_order: OrderResult
    
    # Review mutations
    create_review: Review
    update_review: Review
    delete_review: OperationResponse
    
    # AI mutations
    create_ai_session: AISession
    send_ai_message: AIMessage
    delete_ai_session: OperationResponse
    
    # Admin mutations
    suspend_user: User
    unsuspend_user: User
    suspend_item: MarketplaceItem
    verify_seller: User

# Subscription Type
@strawberry.type
class Subscription:
    # Marketplace subscriptions
    item_updates: ItemUpdate
    category_item_updates: ItemUpdate
    seller_item_updates: ItemUpdate
    
    # Order subscriptions
    order_updates: OrderUpdate
    my_order_updates: OrderUpdate
    
    # Wallet subscriptions
    wallet_updates: WalletUpdate
    
    # AI subscriptions
    ai_chat_messages: ChatMessage
    
    # Notification subscriptions
    user_notifications: JSON

# Create the schema
schema = strawberry.Schema(
    query=Query,
    mutation=Mutation,
    subscription=Subscription,
    scalar_overrides={
        datetime: DateTime,
        uuid.UUID: UUID,
        Decimal: DecimalType,
    }
)