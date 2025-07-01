"""Payment system updates

Revision ID: 005
Revises: 004
Create Date: 2025-01-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to wallet_transactions table
    op.add_column('wallet_transactions', sa.Column('payment_method', sa.String(50), nullable=True))
    op.add_column('wallet_transactions', sa.Column('payment_id', sa.String(255), nullable=True))
    op.add_column('wallet_transactions', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('wallet_transactions', sa.Column('failed_at', sa.DateTime(), nullable=True))
    op.add_column('wallet_transactions', sa.Column('fee_amount', sa.Float(), nullable=True, server_default='0'))
    op.add_column('wallet_transactions', sa.Column('net_amount', sa.Float(), nullable=True))
    op.add_column('wallet_transactions', sa.Column('metadata', sa.JSON(), nullable=True, server_default='{}'))
    
    # Add new columns to payment_methods table
    op.add_column('payment_methods', sa.Column('payment_id', sa.String(255), nullable=True))
    op.add_column('payment_methods', sa.Column('crypto_currency', sa.String(10), nullable=True))
    op.add_column('payment_methods', sa.Column('stripe_customer_id', sa.String(255), nullable=True))
    op.add_column('payment_methods', sa.Column('paypal_customer_id', sa.String(255), nullable=True))
    op.add_column('payment_methods', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('payment_methods', sa.Column('fingerprint', sa.String(255), nullable=True))
    op.add_column('payment_methods', sa.Column('metadata', sa.JSON(), nullable=True, server_default='{}'))
    
    # Create unique constraint on payment_id
    op.create_unique_constraint('uq_payment_methods_payment_id', 'payment_methods', ['payment_id'])
    
    # Create index on payment_method for wallet_transactions
    op.create_index('ix_wallet_transactions_payment_method', 'wallet_transactions', ['payment_method'])
    op.create_index('ix_wallet_transactions_payment_id', 'wallet_transactions', ['payment_id'])
    
    # Create subscriptions table
    op.create_table('subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payment_method_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subscription_id', sa.String(255), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('plan_id', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('interval', sa.String(20), nullable=False),
        sa.Column('interval_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('trial_start', sa.DateTime(), nullable=True),
        sa.Column('trial_end', sa.DateTime(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('billing_cycle_anchor', sa.DateTime(), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('usage_based', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('current_usage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('subscription_metadata', sa.JSON(), nullable=True, server_default='{}'),
        sa.Column('metadata', sa.JSON(), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['payment_method_id'], ['payment_methods.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subscription_id')
    )
    
    # Create indexes for subscriptions
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('ix_subscriptions_provider', 'subscriptions', ['provider'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    
    # Update wallet_transactions type column to allow new types
    op.alter_column('wallet_transactions', 'type',
                    existing_type=sa.String(20),
                    type_=sa.String(20),
                    existing_nullable=False,
                    postgresql_using="type::text")
    
    # Update payment_methods type column to allow longer values
    op.alter_column('payment_methods', 'type',
                    existing_type=sa.String(20),
                    type_=sa.String(50),
                    existing_nullable=False,
                    postgresql_using="type::text")
    
    # Update wallet_transactions status to allow more statuses
    op.alter_column('wallet_transactions', 'status',
                    existing_type=sa.String(20),
                    type_=sa.String(20),
                    existing_nullable=False,
                    postgresql_using="status::text")


def downgrade():
    # Drop subscriptions table
    op.drop_index('ix_subscriptions_status', 'subscriptions')
    op.drop_index('ix_subscriptions_provider', 'subscriptions')
    op.drop_index('ix_subscriptions_user_id', 'subscriptions')
    op.drop_table('subscriptions')
    
    # Drop indexes
    op.drop_index('ix_wallet_transactions_payment_id', 'wallet_transactions')
    op.drop_index('ix_wallet_transactions_payment_method', 'wallet_transactions')
    op.drop_constraint('uq_payment_methods_payment_id', 'payment_methods', type_='unique')
    
    # Drop columns from payment_methods
    op.drop_column('payment_methods', 'metadata')
    op.drop_column('payment_methods', 'fingerprint')
    op.drop_column('payment_methods', 'is_active')
    op.drop_column('payment_methods', 'paypal_customer_id')
    op.drop_column('payment_methods', 'stripe_customer_id')
    op.drop_column('payment_methods', 'crypto_currency')
    op.drop_column('payment_methods', 'payment_id')
    
    # Drop columns from wallet_transactions
    op.drop_column('wallet_transactions', 'metadata')
    op.drop_column('wallet_transactions', 'net_amount')
    op.drop_column('wallet_transactions', 'fee_amount')
    op.drop_column('wallet_transactions', 'failed_at')
    op.drop_column('wallet_transactions', 'completed_at')
    op.drop_column('wallet_transactions', 'payment_id')
    op.drop_column('wallet_transactions', 'payment_method')
    
    # Revert column type changes
    op.alter_column('payment_methods', 'type',
                    existing_type=sa.String(50),
                    type_=sa.String(20),
                    existing_nullable=False)