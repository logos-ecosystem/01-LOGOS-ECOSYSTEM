"""Add IoT device tables

Revision ID: 005
Revises: 004
Create Date: 2024-01-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Create IoT devices table
    op.create_table(
        'iot_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('device_type', sa.String(50), nullable=False),
        sa.Column('protocol', sa.String(50), nullable=False),
        sa.Column('manufacturer', sa.String(255), nullable=True),
        sa.Column('model', sa.String(255), nullable=True),
        sa.Column('firmware_version', sa.String(50), nullable=True),
        sa.Column('hardware_version', sa.String(50), nullable=True),
        sa.Column('serial_number', sa.String(255), nullable=True),
        
        # Connection info
        sa.Column('status', sa.String(20), nullable=True, default='offline'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('mac_address', sa.String(17), nullable=True),
        sa.Column('port', sa.Integer(), nullable=True),
        
        # Authentication
        sa.Column('auth_token', sa.Text(), nullable=True),
        sa.Column('api_key', sa.String(255), nullable=True),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('password', sa.Text(), nullable=True),
        
        # Features
        sa.Column('capabilities', sa.JSON(), nullable=True),
        sa.Column('attributes', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        
        # Security
        sa.Column('encryption_key', sa.Text(), nullable=True),
        sa.Column('certificate', sa.Text(), nullable=True),
        
        # Organization
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('room', sa.String(255), nullable=True),
        sa.Column('groups', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        
        # Settings
        sa.Column('auto_connect', sa.Boolean(), nullable=True, default=False),
        sa.Column('enabled', sa.Boolean(), nullable=True, default=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=True, onupdate=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id')
    )
    
    # Create indices
    op.create_index('idx_iot_devices_type', 'iot_devices', ['device_type'])
    op.create_index('idx_iot_devices_protocol', 'iot_devices', ['protocol'])
    op.create_index('idx_iot_devices_status', 'iot_devices', ['status'])
    op.create_index('idx_iot_devices_location', 'iot_devices', ['location'])
    op.create_index('idx_iot_devices_room', 'iot_devices', ['room'])
    
    # Create telemetry table
    op.create_table(
        'device_telemetry',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(20), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['device_id'], ['iot_devices.device_id'], ondelete='CASCADE')
    )
    
    # Create indices for telemetry
    op.create_index('idx_telemetry_device_metric', 'device_telemetry', ['device_id', 'metric_name'])
    op.create_index('idx_telemetry_timestamp', 'device_telemetry', ['timestamp'])
    
    # Create telemetry aggregations table
    op.create_table(
        'device_telemetry_aggregations',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('period', sa.String(10), nullable=False),  # 1min, 5min, 1hour, 1day
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.Column('sum', sa.Float(), nullable=False),
        sa.Column('min', sa.Float(), nullable=False),
        sa.Column('max', sa.Float(), nullable=False),
        sa.Column('avg', sa.Float(), nullable=False),
        sa.Column('std_dev', sa.Float(), nullable=True),
        sa.Column('percentiles', sa.JSON(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['device_id'], ['iot_devices.device_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('device_id', 'metric_name', 'period', 'start_time')
    )
    
    # Create indices for aggregations
    op.create_index('idx_telemetry_agg_lookup', 'device_telemetry_aggregations', 
                   ['device_id', 'metric_name', 'period'])
    op.create_index('idx_telemetry_agg_time', 'device_telemetry_aggregations', ['start_time'])
    
    # Create device events table
    op.create_table(
        'device_events',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('severity', sa.String(20), nullable=True, default='info'),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indices for events
    op.create_index('idx_device_events_device', 'device_events', ['device_id'])
    op.create_index('idx_device_events_type', 'device_events', ['event_type'])
    op.create_index('idx_device_events_timestamp', 'device_events', ['timestamp'])
    op.create_index('idx_device_events_severity', 'device_events', ['severity'])
    
    # Create device groups table
    op.create_table(
        'device_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(50), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id')
    )
    
    # Create device group members table
    op.create_table(
        'device_group_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.String(100), nullable=False),
        sa.Column('device_id', sa.String(100), nullable=False),
        sa.Column('added_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['group_id'], ['device_groups.group_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['iot_devices.device_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('group_id', 'device_id')
    )
    
    # Create automation rules table
    op.create_table(
        'automation_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=True, default=True),
        sa.Column('triggers', sa.JSON(), nullable=False),
        sa.Column('actions', sa.JSON(), nullable=False),
        sa.Column('conditions', sa.JSON(), nullable=True),
        sa.Column('schedule', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_triggered', sa.DateTime(), nullable=True),
        sa.Column('trigger_count', sa.Integer(), nullable=True, default=0),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('rule_id')
    )
    
    # Create indices for automation
    op.create_index('idx_automation_rules_enabled', 'automation_rules', ['enabled'])
    
    # Create scenes table
    op.create_table(
        'device_scenes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('scene_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('devices', sa.JSON(), nullable=False),  # Device states
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('last_activated', sa.DateTime(), nullable=True),
        sa.Column('activation_count', sa.Integer(), nullable=True, default=0),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('scene_id')
    )


def downgrade():
    op.drop_table('device_scenes')
    op.drop_table('automation_rules')
    op.drop_table('device_group_members')
    op.drop_table('device_groups')
    op.drop_table('device_events')
    op.drop_table('device_telemetry_aggregations')
    op.drop_table('device_telemetry')
    op.drop_table('iot_devices')