"""Initial schema creation

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('bio', sa.String(length=500), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_premium', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_admin', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('preferences', sa.JSON(), nullable=True, default={}),
        sa.Column('notification_settings', sa.JSON(), nullable=True, default={}),
        sa.Column('ai_tokens_used', sa.Integer(), nullable=False, default=0),
        sa.Column('ai_requests_count', sa.Integer(), nullable=False, default=0),
        sa.Column('ai_monthly_limit', sa.Integer(), nullable=False, default=100000),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create api_keys table
    op.create_table('api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('permissions', sa.JSON(), nullable=True, default=['read']),
        sa.Column('request_count', sa.Integer(), nullable=False, default=0),
        sa.Column('rate_limit', sa.Integer(), nullable=False, default=1000),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key_hash')
    )
    op.create_index(op.f('ix_api_keys_user_id'), 'api_keys', ['user_id'], unique=False)

    # Create ai_sessions table
    op.create_table('ai_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True, default='New Conversation'),
        sa.Column('model', sa.String(length=100), nullable=False),
        sa.Column('total_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('total_messages', sa.Integer(), nullable=False, default=0),
        sa.Column('context_window', sa.Integer(), nullable=False, default=200000),
        sa.Column('temperature', sa.Float(), nullable=True, default=0.7),
        sa.Column('max_tokens', sa.Integer(), nullable=True, default=4096),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_sessions_user_id'), 'ai_sessions', ['user_id'], unique=False)

    # Create ai_messages table
    op.create_table('ai_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('completion_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('total_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('model_used', sa.String(length=100), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True, default={}),
        sa.ForeignKeyConstraint(['session_id'], ['ai_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_messages_session_id'), 'ai_messages', ['session_id'], unique=False)

    # Create marketplace_items table
    op.create_table('marketplace_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, default='USD'),
        sa.Column('is_negotiable', sa.Boolean(), nullable=False, default=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True, default={}),
        sa.Column('tags', sa.JSON(), nullable=True, default=[]),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('media_urls', sa.JSON(), nullable=True, default=[]),
        sa.Column('view_count', sa.Integer(), nullable=False, default=0),
        sa.Column('purchase_count', sa.Integer(), nullable=False, default=0),
        sa.Column('rating', sa.Float(), nullable=True, default=0.0),
        sa.Column('review_count', sa.Integer(), nullable=False, default=0),
        sa.Column('status', sa.String(length=20), nullable=False, default='active'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_marketplace_items_owner_id'), 'marketplace_items', ['owner_id'], unique=False)
    op.create_index(op.f('ix_marketplace_items_category'), 'marketplace_items', ['category'], unique=False)

    # Create transactions table
    op.create_table('transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('buyer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('seller_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, default='USD'),
        sa.Column('payment_method', sa.String(length=50), nullable=False),
        sa.Column('transaction_hash', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='pending'),
        sa.Column('metadata', sa.JSON(), nullable=True, default={}),
        sa.ForeignKeyConstraint(['item_id'], ['marketplace_items.id'], ),
        sa.ForeignKeyConstraint(['buyer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_hash')
    )
    op.create_index(op.f('ix_transactions_item_id'), 'transactions', ['item_id'], unique=False)
    op.create_index(op.f('ix_transactions_buyer_id'), 'transactions', ['buyer_id'], unique=False)
    op.create_index(op.f('ix_transactions_seller_id'), 'transactions', ['seller_id'], unique=False)

    # Create wallets table
    op.create_table('wallets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('balance_usd', sa.Float(), nullable=False, default=0.0),
        sa.Column('balance_tokens', sa.Integer(), nullable=False, default=0),
        sa.Column('balance_credits', sa.Integer(), nullable=False, default=0),
        sa.Column('eth_address', sa.String(length=42), nullable=True),
        sa.Column('eth_private_key_encrypted', sa.String(length=500), nullable=True),
        sa.Column('daily_spending_limit', sa.Float(), nullable=False, default=1000.0),
        sa.Column('monthly_spending_limit', sa.Float(), nullable=False, default=10000.0),
        sa.Column('total_earned', sa.Float(), nullable=False, default=0.0),
        sa.Column('total_spent', sa.Float(), nullable=False, default=0.0),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('eth_address')
    )
    op.create_index(op.f('ix_wallets_user_id'), 'wallets', ['user_id'], unique=True)

    # Create wallet_transactions table
    op.create_table('wallet_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('wallet_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, default='USD'),
        sa.Column('reference_type', sa.String(length=50), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='completed'),
        sa.Column('transaction_hash', sa.String(length=255), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True, default={}),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wallet_transactions_wallet_id'), 'wallet_transactions', ['wallet_id'], unique=False)

    # Create ai_models table
    op.create_table('ai_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('model_id', sa.String(length=100), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_tokens', sa.Integer(), nullable=False),
        sa.Column('context_window', sa.Integer(), nullable=False),
        sa.Column('supports_vision', sa.Boolean(), nullable=False, default=False),
        sa.Column('supports_tools', sa.Boolean(), nullable=False, default=False),
        sa.Column('input_token_price', sa.Float(), nullable=False),
        sa.Column('output_token_price', sa.Float(), nullable=False),
        sa.Column('default_temperature', sa.Float(), nullable=False, default=0.7),
        sa.Column('default_max_tokens', sa.Integer(), nullable=False, default=4096),
        sa.Column('is_available', sa.Boolean(), nullable=False, default=True),
        sa.Column('requires_premium', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_id')
    )

    # Create ai_prompt_templates table
    op.create_table('ai_prompt_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=True, default=[]),
        sa.Column('example_values', sa.JSON(), nullable=True, default={}),
        sa.Column('usage_count', sa.Integer(), nullable=False, default=0),
        sa.Column('rating', sa.Float(), nullable=True, default=0.0),
        sa.Column('is_public', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_ai_prompt_templates_created_by_id'), 'ai_prompt_templates', ['created_by_id'], unique=False)

    # Create reviews table
    op.create_table('reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('verified_purchase', sa.Boolean(), nullable=False, default=False),
        sa.Column('helpful_count', sa.Integer(), nullable=False, default=0),
        sa.Column('unhelpful_count', sa.Integer(), nullable=False, default=0),
        sa.ForeignKeyConstraint(['item_id'], ['marketplace_items.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('item_id', 'user_id', name='uix_one_review_per_user_per_item')
    )
    op.create_index(op.f('ix_reviews_item_id'), 'reviews', ['item_id'], unique=False)
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop reviews table
    op.drop_index(op.f('ix_reviews_user_id'), table_name='reviews')
    op.drop_index(op.f('ix_reviews_item_id'), table_name='reviews')
    op.drop_table('reviews')
    
    # Drop ai_prompt_templates table
    op.drop_index(op.f('ix_ai_prompt_templates_created_by_id'), table_name='ai_prompt_templates')
    op.drop_table('ai_prompt_templates')
    
    # Drop ai_models table
    op.drop_table('ai_models')
    
    # Drop wallet_transactions table
    op.drop_index(op.f('ix_wallet_transactions_wallet_id'), table_name='wallet_transactions')
    op.drop_table('wallet_transactions')
    
    # Drop wallets table
    op.drop_index(op.f('ix_wallets_user_id'), table_name='wallets')
    op.drop_table('wallets')
    
    # Drop transactions table
    op.drop_index(op.f('ix_transactions_seller_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_buyer_id'), table_name='transactions')
    op.drop_index(op.f('ix_transactions_item_id'), table_name='transactions')
    op.drop_table('transactions')
    
    # Drop marketplace_items table
    op.drop_index(op.f('ix_marketplace_items_category'), table_name='marketplace_items')
    op.drop_index(op.f('ix_marketplace_items_owner_id'), table_name='marketplace_items')
    op.drop_table('marketplace_items')
    
    # Drop ai_messages table
    op.drop_index(op.f('ix_ai_messages_session_id'), table_name='ai_messages')
    op.drop_table('ai_messages')
    
    # Drop ai_sessions table
    op.drop_index(op.f('ix_ai_sessions_user_id'), table_name='ai_sessions')
    op.drop_table('ai_sessions')
    
    # Drop api_keys table
    op.drop_index(op.f('ix_api_keys_user_id'), table_name='api_keys')
    op.drop_table('api_keys')
    
    # Drop users table
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')