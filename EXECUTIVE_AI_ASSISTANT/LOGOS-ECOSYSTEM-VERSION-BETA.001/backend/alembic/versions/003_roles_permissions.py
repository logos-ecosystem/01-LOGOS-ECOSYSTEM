"""Add roles and permissions tables

Revision ID: 003
Revises: 002_performance_indexes
Create Date: 2025-04-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003'
down_revision = '002_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # Create permissions table
    op.create_table('permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=False)
    op.create_index('ix_permissions_resource_action', 'permissions', ['resource', 'action'], unique=False)

    # Create roles table
    op.create_table('roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('hierarchy_level', sa.Integer(), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=False)

    # Create user_roles association table
    op.create_table('user_roles',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'role_id')
    )

    # Create role_permissions association table
    op.create_table('role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    # Insert default permissions
    op.execute("""
        INSERT INTO permissions (id, name, resource, action, description) VALUES
        -- Marketplace permissions
        (gen_random_uuid(), 'marketplace.items.read', 'marketplace', 'read', 'View marketplace items'),
        (gen_random_uuid(), 'marketplace.items.create', 'marketplace', 'create', 'Create marketplace items'),
        (gen_random_uuid(), 'marketplace.items.update', 'marketplace', 'update', 'Update own marketplace items'),
        (gen_random_uuid(), 'marketplace.items.delete', 'marketplace', 'delete', 'Delete own marketplace items'),
        (gen_random_uuid(), 'marketplace.items.moderate', 'marketplace', 'moderate', 'Moderate any marketplace items'),
        
        -- AI Agent permissions
        (gen_random_uuid(), 'ai.agents.list', 'ai_agent', 'list', 'List available AI agents'),
        (gen_random_uuid(), 'ai.agents.execute', 'ai_agent', 'execute', 'Execute AI agents'),
        (gen_random_uuid(), 'ai.agents.premium', 'ai_agent', 'premium', 'Access premium AI agents'),
        (gen_random_uuid(), 'ai.agents.unlimited', 'ai_agent', 'unlimited', 'Unlimited AI agent usage'),
        (gen_random_uuid(), 'ai.agents.manage', 'ai_agent', 'manage', 'Manage AI agent configurations'),
        
        -- Wallet permissions
        (gen_random_uuid(), 'wallet.view', 'wallet', 'read', 'View own wallet'),
        (gen_random_uuid(), 'wallet.deposit', 'wallet', 'deposit', 'Deposit to wallet'),
        (gen_random_uuid(), 'wallet.withdraw', 'wallet', 'withdraw', 'Withdraw from wallet'),
        (gen_random_uuid(), 'wallet.transfer', 'wallet', 'transfer', 'Transfer between wallets'),
        (gen_random_uuid(), 'wallet.admin', 'wallet', 'admin', 'Administer any wallet'),
        
        -- User management permissions
        (gen_random_uuid(), 'users.view', 'users', 'read', 'View user profiles'),
        (gen_random_uuid(), 'users.edit', 'users', 'update', 'Edit own profile'),
        (gen_random_uuid(), 'users.manage', 'users', 'manage', 'Manage all users'),
        (gen_random_uuid(), 'users.roles', 'users', 'roles', 'Assign roles to users'),
        
        -- System permissions
        (gen_random_uuid(), 'system.whitelabel', 'system', 'whitelabel', 'Configure whitelabel settings'),
        (gen_random_uuid(), 'system.settings', 'system', 'settings', 'Manage system settings'),
        (gen_random_uuid(), 'system.monitoring', 'system', 'monitoring', 'View system monitoring'),
        (gen_random_uuid(), 'system.logs', 'system', 'logs', 'Access system logs')
    """)

    # Insert default roles
    op.execute("""
        INSERT INTO roles (id, name, description, hierarchy_level, is_system) VALUES
        (gen_random_uuid(), 'super_admin', 'Full system access', 1000, true),
        (gen_random_uuid(), 'admin', 'Administrative access', 900, true),
        (gen_random_uuid(), 'moderator', 'Content moderation access', 800, true),
        (gen_random_uuid(), 'premium_user', 'Premium features access', 500, true),
        (gen_random_uuid(), 'verified_seller', 'Verified marketplace seller', 400, true),
        (gen_random_uuid(), 'seller', 'Basic marketplace seller', 300, true),
        (gen_random_uuid(), 'user', 'Basic user access', 100, true),
        (gen_random_uuid(), 'guest', 'Limited guest access', 10, true)
    """)

    # Assign permissions to roles
    op.execute("""
        WITH role_perms AS (
            SELECT 
                r.id as role_id,
                p.id as permission_id,
                r.name as role_name,
                p.name as permission_name
            FROM roles r
            CROSS JOIN permissions p
        )
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT role_id, permission_id FROM role_perms
        WHERE 
            -- Super admin gets everything
            (role_name = 'super_admin')
            -- Admin gets everything except some system permissions
            OR (role_name = 'admin' AND permission_name NOT IN ('system.logs'))
            -- Moderator permissions
            OR (role_name = 'moderator' AND permission_name IN (
                'marketplace.items.read', 'marketplace.items.moderate',
                'users.view', 'system.monitoring'
            ))
            -- Premium user permissions
            OR (role_name = 'premium_user' AND permission_name IN (
                'marketplace.items.read', 'marketplace.items.create', 
                'marketplace.items.update', 'marketplace.items.delete',
                'ai.agents.list', 'ai.agents.execute', 'ai.agents.premium',
                'wallet.view', 'wallet.deposit', 'wallet.withdraw', 'wallet.transfer',
                'users.view', 'users.edit'
            ))
            -- Verified seller permissions
            OR (role_name = 'verified_seller' AND permission_name IN (
                'marketplace.items.read', 'marketplace.items.create', 
                'marketplace.items.update', 'marketplace.items.delete',
                'ai.agents.list', 'ai.agents.execute',
                'wallet.view', 'wallet.deposit', 'wallet.withdraw',
                'users.view', 'users.edit'
            ))
            -- Basic seller permissions
            OR (role_name = 'seller' AND permission_name IN (
                'marketplace.items.read', 'marketplace.items.create', 
                'marketplace.items.update', 'marketplace.items.delete',
                'ai.agents.list',
                'wallet.view', 'wallet.deposit',
                'users.view', 'users.edit'
            ))
            -- Basic user permissions
            OR (role_name = 'user' AND permission_name IN (
                'marketplace.items.read',
                'ai.agents.list', 'ai.agents.execute',
                'wallet.view', 'wallet.deposit',
                'users.view', 'users.edit'
            ))
            -- Guest permissions
            OR (role_name = 'guest' AND permission_name IN (
                'marketplace.items.read',
                'ai.agents.list',
                'users.view'
            ))
    """)


def downgrade():
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_table('roles')
    op.drop_index('ix_permissions_resource_action', table_name='permissions')
    op.drop_index(op.f('ix_permissions_name'), table_name='permissions')
    op.drop_table('permissions')