from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship
from ...shared.utils.database_types import UUID
import uuid
from datetime import datetime
import os

from ...infrastructure.database import Base
from .base import BaseModel, get_uuid_column

# Association tables for many-to-many relationships
db_url = os.getenv('DATABASE_URL', '')
if 'sqlite' in db_url:
    user_roles = Table(
        'user_roles',
        Base.metadata,
        Column('user_id', String(36), ForeignKey('users.id'), primary_key=True),
        Column('role_id', String(36), ForeignKey('roles.id'), primary_key=True)
    )
    
    role_permissions = Table(
        'role_permissions',
        Base.metadata,
        Column('role_id', String(36), ForeignKey('roles.id'), primary_key=True),
        Column('permission_id', String(36), ForeignKey('permissions.id'), primary_key=True)
    )
else:
    user_roles = Table(
        'user_roles',
        Base.metadata,
        Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
        Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True)
    )
    
    role_permissions = Table(
        'role_permissions',
        Base.metadata,
        Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True),
        Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id'), primary_key=True)
    )

class Permission(Base, BaseModel):
    """Permission model for fine-grained access control."""
    
    __tablename__ = 'permissions'
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(100), nullable=False)  # e.g., 'marketplace', 'ai_agent', 'wallet'
    action = Column(String(50), nullable=False)     # e.g., 'read', 'write', 'delete', 'execute'
    description = Column(String(500))
    
    # Relationships
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')
    
    def __repr__(self):
        return f"<Permission(name='{self.name}', resource='{self.resource}', action='{self.action}')>"

class Role(Base, BaseModel):
    """Role model for grouping permissions."""
    
    __tablename__ = 'roles'
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(500))
    hierarchy_level = Column(Integer, default=0)  # Higher number = higher authority
    is_system = Column(Boolean, default=False)  # System roles cannot be deleted
    
    # Relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if role has specific permission"""
        return any(
            p.resource == resource and p.action == action 
            for p in self.permissions
        )
    
    def __repr__(self):
        return f"<Role(name='{self.name}', level={self.hierarchy_level})>"

class User(Base, BaseModel):
    """User model for authentication and profile management."""
    
    __tablename__ = "users"
    
    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile fields
    full_name = Column(String(255))
    bio = Column(String(500))
    avatar_url = Column(String(500))
    avatar_upload_id = Column(String(36) if 'sqlite' in db_url else UUID(as_uuid=True), ForeignKey("uploads.id", ondelete="SET NULL"), nullable=True)
    
    # Account status
    is_verified = Column(Boolean, default=False, nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    
    # 2FA fields
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(255))
    two_factor_backup_codes = Column(JSON, default=[])
    
    # OAuth fields
    oauth_provider = Column(String(50))
    oauth_id = Column(String(255))
    
    # Timestamps
    last_login_at = Column(DateTime(timezone=True))
    email_verified_at = Column(DateTime(timezone=True))
    
    # Settings and preferences
    preferences = Column(JSON, default={})
    notification_settings = Column(JSON, default={
        "email": True,
        "push": True,
        "sms": False
    })
    
    # AI usage tracking
    ai_tokens_used = Column(Integer, default=0, nullable=False)
    ai_requests_count = Column(Integer, default=0, nullable=False)
    ai_monthly_limit = Column(Integer, default=100000, nullable=False)
    
    # Relationships
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    ai_sessions = relationship("AISession", back_populates="user", cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    marketplace_items = relationship("MarketplaceItem", back_populates="owner", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="user", cascade="all, delete-orphan", foreign_keys="Upload.user_id", primaryjoin="User.id==Upload.user_id")
    avatar_upload = relationship("Upload", foreign_keys=[avatar_upload_id], post_update=True)
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    ai_models = relationship("RegisteredModel", back_populates="owner", cascade="all, delete-orphan")
    ai_model_usage = relationship("AIModelUsage", back_populates="user", cascade="all, delete-orphan")
    ai_model_reviews = relationship("AIModelReview", back_populates="user", cascade="all, delete-orphan")
    ai_model_comparisons = relationship("AIModelComparison", back_populates="user", cascade="all, delete-orphan")
    created_agents = relationship("AgentModel", back_populates="author", cascade="all, delete-orphan")
    agent_purchases = relationship("AgentPurchase", back_populates="user", cascade="all, delete-orphan")
    agent_usage = relationship("AgentUsage", back_populates="user", cascade="all, delete-orphan")
    agent_reviews = relationship("AgentReview", back_populates="user", cascade="all, delete-orphan")
    
    def has_permission(self, resource: str, action: str) -> bool:
        """Check if user has specific permission through their roles"""
        # Super admin bypass
        if self.is_admin:
            return True
            
        for role in self.roles:
            if role.has_permission(resource, action):
                return True
        return False
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role"""
        return any(role.name == role_name for role in self.roles)
    
    def get_highest_role(self):
        """Get user's highest authority role"""
        if not self.roles:
            return None
        return max(self.roles, key=lambda r: r.hierarchy_level)
    
    def __repr__(self):
        return f"<User {self.username}>"


class ApiKey(Base, BaseModel):
    """API Key model for programmatic access."""
    
    __tablename__ = "api_keys"
    
    user_id = Column(UUID, ForeignKey('users.id'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    last_used_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    permissions = Column(JSON, default=["read"])
    
    # Usage tracking
    request_count = Column(Integer, default=0, nullable=False)
    rate_limit = Column(Integer, default=1000, nullable=False)
    
    # Relationship
    user = relationship("User", back_populates="api_keys")


# Whitelabel Models
class WhitelabelTenant(Base, BaseModel):
    """Whitelabel tenant model for multi-tenancy."""
    
    __tablename__ = "whitelabel_tenants"
    
    # Basic info
    name = Column(String(255), nullable=False)
    subdomain = Column(String(100), unique=True, nullable=False, index=True)
    owner_email = Column(String(255), nullable=False)
    
    # Plan and billing
    plan = Column(String(50), default='starter')  # starter, professional, enterprise
    billing_email = Column(String(255))
    stripe_customer_id = Column(String(255))
    
    # API Access
    api_key = Column(String(255), unique=True, nullable=False)
    api_secret = Column(String(255), nullable=False)
    
    # Database isolation
    isolation_strategy = Column(String(50), default='shared')  # shared, schema, database, server
    
    # Status
    status = Column(String(50), default='active')  # active, suspended, deleted
    suspension_reason = Column(String(500))
    suspended_at = Column(DateTime(timezone=True))
    deleted_at = Column(DateTime(timezone=True))
    
    # Metadata
    tenant_metadata = Column(JSON, default={})
    
    def to_dict(self):
        """Convert to dictionary for caching."""
        return {
            'id': str(self.id),
            'name': self.name,
            'subdomain': self.subdomain,
            'owner_email': self.owner_email,
            'plan': self.plan,
            'api_key': self.api_key,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TenantDomain(Base, BaseModel):
    """Custom domains for tenants."""
    
    __tablename__ = "tenant_domains"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), nullable=False)
    domain = Column(String(255), unique=True, nullable=False, index=True)
    is_primary = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    verified_at = Column(DateTime(timezone=True))
    ssl_enabled = Column(Boolean, default=False)
    ssl_certificate_id = Column(String(255))


class TenantConfiguration(Base, BaseModel):
    """Configuration settings for tenants."""
    
    __tablename__ = "tenant_configurations"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), unique=True, nullable=False)
    settings = Column(JSON, default={})  # Features, limits, branding, etc.
    

class ThemeConfiguration(Base, BaseModel):
    """Theme configurations for tenants."""
    
    __tablename__ = "theme_configurations"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), nullable=False)
    config = Column(JSON, nullable=False)  # Colors, fonts, spacing, etc.
    css_path = Column(String(500))
    favicon_path = Column(String(500))
    theme_hash = Column(String(50))
    is_active = Column(Boolean, default=True)


class TenantDatabase(Base, BaseModel):
    """Database information for isolated tenants."""
    
    __tablename__ = "tenant_databases"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), unique=True, nullable=False)
    database_type = Column(String(50), default='postgresql')
    connection_string = Column(String(500), nullable=False)
    schema_name = Column(String(100))
    database_name = Column(String(100))
    server_host = Column(String(255))
    server_port = Column(Integer)


class TenantUser(Base, BaseModel):
    """Association between users and tenants."""
    
    __tablename__ = "tenant_users"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), primary_key=True)
    user_id = Column(UUID, ForeignKey('users.id'), primary_key=True)
    role = Column(String(50), default='member')  # owner, admin, member
    permissions = Column(JSON, default=[])


# Revenue Sharing Models
class RevenueShare(Base, BaseModel):
    """Revenue sharing agreements for tenants."""
    
    __tablename__ = "revenue_shares"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), nullable=False)
    commission_model = Column(String(50), nullable=False)  # flat_rate, tiered, progressive, custom
    commission_config = Column(JSON, nullable=False)
    payout_frequency = Column(String(50), default='monthly')  # daily, weekly, monthly, on_demand
    payout_config = Column(JSON, default={})
    is_active = Column(Boolean, default=True)


class Commission(Base, BaseModel):
    """Commission tracking for transactions."""
    
    __tablename__ = "commissions"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), nullable=False)
    transaction_id = Column(String(255), unique=True, nullable=False)
    transaction_type = Column(String(50), nullable=False)  # sale, subscription, usage
    revenue_amount = Column(String(50), nullable=False)  # Store as string for Decimal precision
    commission_rate = Column(String(50), nullable=False)
    commission_amount = Column(String(50), nullable=False)
    currency = Column(String(10), default='USD')
    status = Column(String(50), default='pending')  # pending, confirmed, paid
    payout_id = Column(UUID, ForeignKey('payouts.id'))
    transaction_metadata = Column(JSON, default={})


class TransactionType:
    """Transaction type enumeration."""
    SALE = 'sale'
    SUBSCRIPTION = 'subscription'
    USAGE = 'usage'
    REFUND = 'refund'
    OTHER = 'other'


class Payout(Base, BaseModel):
    """Payout records for tenants."""
    
    __tablename__ = "payouts"
    
    tenant_id = Column(UUID, ForeignKey('whitelabel_tenants.id'), nullable=False)
    amount = Column(String(50), nullable=False)  # Gross amount
    fee_amount = Column(String(50), default='0')
    net_amount = Column(String(50), nullable=False)
    currency = Column(String(10), default='USD')
    payment_method = Column(String(50), nullable=False)  # bank_transfer, paypal, crypto
    payment_details = Column(JSON, default={})
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    transaction_id = Column(String(255))
    error_message = Column(String(500))
    processed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))


class PayoutStatus:
    """Payout status enumeration."""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'