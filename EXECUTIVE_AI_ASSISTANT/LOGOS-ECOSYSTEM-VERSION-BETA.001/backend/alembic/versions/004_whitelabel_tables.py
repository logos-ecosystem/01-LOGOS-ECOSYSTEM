"""Add whitelabel tables

Revision ID: 004_whitelabel_tables
Revises: 003_roles_permissions
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004_whitelabel_tables'
down_revision = '003_roles_permissions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create whitelabel_tenants table
    op.create_table(
        'whitelabel_tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('subdomain', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('owner_email', sa.String(255), nullable=False),
        sa.Column('plan', sa.String(50), default='starter'),
        sa.Column('billing_email', sa.String(255)),
        sa.Column('stripe_customer_id', sa.String(255)),
        sa.Column('api_key', sa.String(255), unique=True, nullable=False),
        sa.Column('api_secret', sa.String(255), nullable=False),
        sa.Column('isolation_strategy', sa.String(50), default='shared'),
        sa.Column('status', sa.String(50), default='active'),
        sa.Column('suspension_reason', sa.String(500)),
        sa.Column('suspended_at', sa.DateTime(timezone=True)),
        sa.Column('deleted_at', sa.DateTime(timezone=True)),
        sa.Column('metadata', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create tenant_domains table
    op.create_table(
        'tenant_domains',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), nullable=False),
        sa.Column('domain', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('is_primary', sa.Boolean, default=False),
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('verification_token', sa.String(255)),
        sa.Column('verified_at', sa.DateTime(timezone=True)),
        sa.Column('ssl_enabled', sa.Boolean, default=False),
        sa.Column('ssl_certificate_id', sa.String(255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create tenant_configurations table
    op.create_table(
        'tenant_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), unique=True, nullable=False),
        sa.Column('settings', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create theme_configurations table
    op.create_table(
        'theme_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), nullable=False),
        sa.Column('config', sa.JSON, nullable=False),
        sa.Column('css_path', sa.String(500)),
        sa.Column('favicon_path', sa.String(500)),
        sa.Column('theme_hash', sa.String(50)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create tenant_databases table
    op.create_table(
        'tenant_databases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), unique=True, nullable=False),
        sa.Column('database_type', sa.String(50), default='postgresql'),
        sa.Column('connection_string', sa.String(500), nullable=False),
        sa.Column('schema_name', sa.String(100)),
        sa.Column('database_name', sa.String(100)),
        sa.Column('server_host', sa.String(255)),
        sa.Column('server_port', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create tenant_users table
    op.create_table(
        'tenant_users',
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), primary_key=True),
        sa.Column('role', sa.String(50), default='member'),
        sa.Column('permissions', sa.JSON, default=[]),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create revenue_shares table
    op.create_table(
        'revenue_shares',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), nullable=False),
        sa.Column('commission_model', sa.String(50), nullable=False),
        sa.Column('commission_config', sa.JSON, nullable=False),
        sa.Column('payout_frequency', sa.String(50), default='monthly'),
        sa.Column('payout_config', sa.JSON, default={}),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create payouts table first (referenced by commissions)
    op.create_table(
        'payouts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), nullable=False),
        sa.Column('amount', sa.String(50), nullable=False),
        sa.Column('fee_amount', sa.String(50), default='0'),
        sa.Column('net_amount', sa.String(50), nullable=False),
        sa.Column('currency', sa.String(10), default='USD'),
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('payment_details', sa.JSON, default={}),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('transaction_id', sa.String(255)),
        sa.Column('error_message', sa.String(500)),
        sa.Column('processed_at', sa.DateTime(timezone=True)),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create commissions table
    op.create_table(
        'commissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('whitelabel_tenants.id'), nullable=False),
        sa.Column('transaction_id', sa.String(255), unique=True, nullable=False),
        sa.Column('transaction_type', sa.String(50), nullable=False),
        sa.Column('revenue_amount', sa.String(50), nullable=False),
        sa.Column('commission_rate', sa.String(50), nullable=False),
        sa.Column('commission_amount', sa.String(50), nullable=False),
        sa.Column('currency', sa.String(10), default='USD'),
        sa.Column('status', sa.String(50), default='pending'),
        sa.Column('payout_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payouts.id')),
        sa.Column('metadata', sa.JSON, default={}),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now())
    )
    
    # Create indexes for performance
    op.create_index('idx_tenant_status', 'whitelabel_tenants', ['status'])
    op.create_index('idx_tenant_plan', 'whitelabel_tenants', ['plan'])
    op.create_index('idx_domain_tenant', 'tenant_domains', ['tenant_id'])
    op.create_index('idx_commission_tenant', 'commissions', ['tenant_id'])
    op.create_index('idx_commission_status', 'commissions', ['status'])
    op.create_index('idx_payout_tenant', 'payouts', ['tenant_id'])
    op.create_index('idx_payout_status', 'payouts', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_payout_status')
    op.drop_index('idx_payout_tenant')
    op.drop_index('idx_commission_status')
    op.drop_index('idx_commission_tenant')
    op.drop_index('idx_domain_tenant')
    op.drop_index('idx_tenant_plan')
    op.drop_index('idx_tenant_status')
    
    # Drop tables in reverse order
    op.drop_table('commissions')
    op.drop_table('payouts')
    op.drop_table('revenue_shares')
    op.drop_table('tenant_users')
    op.drop_table('tenant_databases')
    op.drop_table('theme_configurations')
    op.drop_table('tenant_configurations')
    op.drop_table('tenant_domains')
    op.drop_table('whitelabel_tenants')