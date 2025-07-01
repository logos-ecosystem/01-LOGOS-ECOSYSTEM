"""Add performance indexes for all tables

Revision ID: 002
Revises: 001
Create Date: 2025-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Users table indexes
    op.create_index('ix_users_email_active', 'users', ['email'], 
                    postgresql_where=sa.text('is_active = true'))
    op.create_index('ix_users_created_at_desc', 'users', [sa.text('created_at DESC')])
    op.create_index('ix_users_username_lower', 'users', [sa.text('LOWER(username)')])
    
    # Wallets table indexes
    op.create_index('ix_wallets_user_id', 'wallets', ['user_id'])
    op.create_index('ix_wallets_currency_balance', 'wallets', ['currency', 'balance'])
    op.create_index('ix_wallets_balance_nonzero', 'wallets', ['balance'], 
                    postgresql_where=sa.text('balance > 0'))
    
    # Transactions table indexes
    op.create_index('ix_transactions_wallet_id', 'transactions', ['wallet_id'])
    op.create_index('ix_transactions_created_at_brin', 'transactions', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_transactions_type_status', 'transactions', ['transaction_type', 'status'])
    op.create_index('ix_transactions_wallet_date', 'transactions', ['wallet_id', 'created_at'])
    op.create_index('ix_transactions_pending', 'transactions', ['status', 'created_at'], 
                    postgresql_where=sa.text("status = 'pending'"))
    
    # Marketplace items indexes
    op.create_index('ix_marketplace_items_seller_id', 'marketplace_items', ['seller_id'])
    op.create_index('ix_marketplace_items_category_status', 'marketplace_items', ['category', 'status'])
    op.create_index('ix_marketplace_items_price_active', 'marketplace_items', ['price'], 
                    postgresql_where=sa.text("status = 'active'"))
    op.create_index('ix_marketplace_items_created_at_brin', 'marketplace_items', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_marketplace_items_views_rating', 'marketplace_items', ['views', 'average_rating'])
    
    # Full-text search indexes
    op.execute("""
        CREATE INDEX ix_marketplace_items_search_gin 
        ON marketplace_items 
        USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
    """)
    
    op.execute("""
        CREATE INDEX ix_marketplace_items_tags_gin 
        ON marketplace_items 
        USING gin(tags)
        WHERE tags IS NOT NULL
    """)
    
    # Reviews table indexes
    op.create_index('ix_reviews_item_id', 'reviews', ['item_id'])
    op.create_index('ix_reviews_reviewer_id', 'reviews', ['reviewer_id'])
    op.create_index('ix_reviews_item_rating', 'reviews', ['item_id', 'rating'])
    op.create_index('ix_reviews_created_at_brin', 'reviews', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_reviews_verified', 'reviews', ['item_id', 'created_at'], 
                    postgresql_where=sa.text('is_verified = true'))
    
    # Purchases table indexes
    op.create_index('ix_purchases_buyer_id', 'purchases', ['buyer_id'])
    op.create_index('ix_purchases_item_id', 'purchases', ['item_id'])
    op.create_index('ix_purchases_status_date', 'purchases', ['status', 'created_at'])
    op.create_index('ix_purchases_seller_status', 'purchases', ['seller_id', 'status'])
    op.create_index('ix_purchases_created_at_brin', 'purchases', ['created_at'], 
                    postgresql_using='brin')
    
    # AI sessions table indexes
    op.create_index('ix_ai_sessions_user_id', 'ai_sessions', ['user_id'])
    op.create_index('ix_ai_sessions_model_active', 'ai_sessions', ['model', 'is_active'])
    op.create_index('ix_ai_sessions_created_at_brin', 'ai_sessions', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_ai_sessions_updated_at_active', 'ai_sessions', ['updated_at'], 
                    postgresql_where=sa.text('is_active = true'))
    
    # AI messages table indexes
    op.create_index('ix_ai_messages_session_id', 'ai_messages', ['session_id'])
    op.create_index('ix_ai_messages_created_at_brin', 'ai_messages', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_ai_messages_session_created', 'ai_messages', ['session_id', 'created_at'])
    
    # Full-text search for AI messages
    op.execute("""
        CREATE INDEX ix_ai_messages_content_gin 
        ON ai_messages 
        USING gin(to_tsvector('english', content))
    """)
    
    # AI usage table indexes
    op.create_index('ix_ai_usage_user_id', 'ai_usage', ['user_id'])
    op.create_index('ix_ai_usage_date_brin', 'ai_usage', ['date'], 
                    postgresql_using='brin')
    op.create_index('ix_ai_usage_user_date', 'ai_usage', ['user_id', 'date'])
    op.create_index('ix_ai_usage_model_date', 'ai_usage', ['model', 'date'])
    
    # Uploads table indexes
    op.create_index('ix_uploads_user_id', 'uploads', ['user_id'])
    op.create_index('ix_uploads_created_at_brin', 'uploads', ['created_at'], 
                    postgresql_using='brin')
    op.create_index('ix_uploads_file_type', 'uploads', ['file_type'])
    op.create_index('ix_uploads_public', 'uploads', ['is_public', 'created_at'], 
                    postgresql_where=sa.text('is_public = true'))
    
    # Notifications table indexes (if exists)
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
                CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id);
                CREATE INDEX IF NOT EXISTS ix_notifications_unread ON notifications(user_id, created_at) 
                WHERE is_read = false;
                CREATE INDEX IF NOT EXISTS ix_notifications_created_at_brin ON notifications 
                USING brin(created_at);
            END IF;
        END $$;
    """)
    
    # Activity logs table indexes (if exists)
    op.execute("""
        DO $$ 
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
                CREATE INDEX IF NOT EXISTS ix_activity_logs_user_id ON activity_logs(user_id);
                CREATE INDEX IF NOT EXISTS ix_activity_logs_entity ON activity_logs(entity_type, entity_id);
                CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at_brin ON activity_logs 
                USING brin(created_at);
            END IF;
        END $$;
    """)
    
    # Create statistics for query optimization
    op.execute("ANALYZE;")


def downgrade():
    # Drop all indexes in reverse order
    
    # Activity logs indexes
    op.execute("""
        DO $$ 
        BEGIN
            DROP INDEX IF EXISTS ix_activity_logs_created_at_brin;
            DROP INDEX IF EXISTS ix_activity_logs_entity;
            DROP INDEX IF EXISTS ix_activity_logs_user_id;
        END $$;
    """)
    
    # Notifications indexes
    op.execute("""
        DO $$ 
        BEGIN
            DROP INDEX IF EXISTS ix_notifications_created_at_brin;
            DROP INDEX IF EXISTS ix_notifications_unread;
            DROP INDEX IF EXISTS ix_notifications_user_id;
        END $$;
    """)
    
    # Uploads indexes
    op.drop_index('ix_uploads_public', 'uploads')
    op.drop_index('ix_uploads_file_type', 'uploads')
    op.drop_index('ix_uploads_created_at_brin', 'uploads')
    op.drop_index('ix_uploads_user_id', 'uploads')
    
    # AI usage indexes
    op.drop_index('ix_ai_usage_model_date', 'ai_usage')
    op.drop_index('ix_ai_usage_user_date', 'ai_usage')
    op.drop_index('ix_ai_usage_date_brin', 'ai_usage')
    op.drop_index('ix_ai_usage_user_id', 'ai_usage')
    
    # AI messages indexes
    op.execute("DROP INDEX IF EXISTS ix_ai_messages_content_gin")
    op.drop_index('ix_ai_messages_session_created', 'ai_messages')
    op.drop_index('ix_ai_messages_created_at_brin', 'ai_messages')
    op.drop_index('ix_ai_messages_session_id', 'ai_messages')
    
    # AI sessions indexes
    op.drop_index('ix_ai_sessions_updated_at_active', 'ai_sessions')
    op.drop_index('ix_ai_sessions_created_at_brin', 'ai_sessions')
    op.drop_index('ix_ai_sessions_model_active', 'ai_sessions')
    op.drop_index('ix_ai_sessions_user_id', 'ai_sessions')
    
    # Purchases indexes
    op.drop_index('ix_purchases_created_at_brin', 'purchases')
    op.drop_index('ix_purchases_seller_status', 'purchases')
    op.drop_index('ix_purchases_status_date', 'purchases')
    op.drop_index('ix_purchases_item_id', 'purchases')
    op.drop_index('ix_purchases_buyer_id', 'purchases')
    
    # Reviews indexes
    op.drop_index('ix_reviews_verified', 'reviews')
    op.drop_index('ix_reviews_created_at_brin', 'reviews')
    op.drop_index('ix_reviews_item_rating', 'reviews')
    op.drop_index('ix_reviews_reviewer_id', 'reviews')
    op.drop_index('ix_reviews_item_id', 'reviews')
    
    # Marketplace items indexes
    op.execute("DROP INDEX IF EXISTS ix_marketplace_items_tags_gin")
    op.execute("DROP INDEX IF EXISTS ix_marketplace_items_search_gin")
    op.drop_index('ix_marketplace_items_views_rating', 'marketplace_items')
    op.drop_index('ix_marketplace_items_created_at_brin', 'marketplace_items')
    op.drop_index('ix_marketplace_items_price_active', 'marketplace_items')
    op.drop_index('ix_marketplace_items_category_status', 'marketplace_items')
    op.drop_index('ix_marketplace_items_seller_id', 'marketplace_items')
    
    # Transactions indexes
    op.drop_index('ix_transactions_pending', 'transactions')
    op.drop_index('ix_transactions_wallet_date', 'transactions')
    op.drop_index('ix_transactions_type_status', 'transactions')
    op.drop_index('ix_transactions_created_at_brin', 'transactions')
    op.drop_index('ix_transactions_wallet_id', 'transactions')
    
    # Wallets indexes
    op.drop_index('ix_wallets_balance_nonzero', 'wallets')
    op.drop_index('ix_wallets_currency_balance', 'wallets')
    op.drop_index('ix_wallets_user_id', 'wallets')
    
    # Users indexes
    op.drop_index('ix_users_username_lower', 'users')
    op.drop_index('ix_users_created_at_desc', 'users')
    op.drop_index('ix_users_email_active', 'users')