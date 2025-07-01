"""Multi-tenant Service for Whitelabel Platform."""

import uuid
import secrets
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import asyncio
from urllib.parse import urlparse
import dns.resolver
import ssl
import certbot
from certbot import main as certbot_main

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.pool import NullPool

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...shared.utils.exceptions import TenantError
from ...infrastructure.cache import cache_manager
from ...shared.models.user import (
    WhitelabelTenant, TenantDomain, TenantConfiguration,
    TenantDatabase, TenantUser, User
)

logger = get_logger(__name__)
settings = get_settings()
cache = cache_manager


class DatabaseIsolationStrategy:
    """Strategies for tenant database isolation."""
    
    SHARED = "shared"  # Shared database with tenant_id columns
    SCHEMA = "schema"  # Separate schema per tenant
    DATABASE = "database"  # Separate database per tenant
    SERVER = "server"  # Separate database server per tenant


class TenantService:
    """Service for managing multi-tenant operations."""
    
    def __init__(self):
        self.tenant_engines: Dict[str, AsyncEngine] = {}
        self.domain_cache_ttl = 3600  # 1 hour
        self.certbot_email = settings.CERTBOT_EMAIL
        self.cert_dir = settings.SSL_CERT_DIR
        
    async def create_tenant(
        self,
        name: str,
        subdomain: str,
        owner_email: str,
        plan: str = "starter",
        isolation_strategy: str = DatabaseIsolationStrategy.SHARED,
        db: AsyncSession = None
    ) -> WhitelabelTenant:
        """Create a new tenant."""
        try:
            # Generate unique tenant ID
            tenant_id = str(uuid.uuid4())
            
            # Generate API keys
            api_key = secrets.token_urlsafe(32)
            api_secret = secrets.token_urlsafe(64)
            
            # Create tenant record
            tenant = WhitelabelTenant(
                id=tenant_id,
                name=name,
                subdomain=subdomain,
                owner_email=owner_email,
                plan=plan,
                api_key=api_key,
                api_secret=api_secret,
                isolation_strategy=isolation_strategy,
                status='active',
                created_at=datetime.utcnow()
            )
            
            db.add(tenant)
            
            # Create default configuration
            config = TenantConfiguration(
                tenant_id=tenant_id,
                settings={
                    'features': self._get_plan_features(plan),
                    'limits': self._get_plan_limits(plan),
                    'branding': {
                        'company_name': name,
                        'support_email': owner_email,
                        'primary_color': '#3498db'
                    },
                    'integrations': {},
                    'webhooks': [],
                    'custom_domains': []
                }
            )
            
            db.add(config)
            
            # Create database if using isolation
            if isolation_strategy != DatabaseIsolationStrategy.SHARED:
                await self._create_tenant_database(tenant_id, isolation_strategy, db)
            
            # Create default domain
            domain = TenantDomain(
                tenant_id=tenant_id,
                domain=f"{subdomain}.{settings.BASE_DOMAIN}",
                is_primary=True,
                is_verified=True,  # Auto-verify subdomains
                ssl_enabled=True,
                created_at=datetime.utcnow()
            )
            
            db.add(domain)
            
            await db.commit()
            
            # Initialize tenant cache
            await self._cache_tenant(tenant)
            
            # Setup SSL for subdomain
            asyncio.create_task(self._setup_subdomain_ssl(subdomain))
            
            logger.info(f"Created tenant: {tenant_id} ({name})")
            return tenant
            
        except Exception as e:
            logger.error(f"Tenant creation error: {e}")
            raise TenantError(f"Failed to create tenant: {str(e)}")
    
    def _get_plan_features(self, plan: str) -> Dict[str, bool]:
        """Get features for a plan."""
        features = {
            'starter': {
                'custom_domain': False,
                'white_label': False,
                'api_access': True,
                'webhook_support': False,
                'priority_support': False,
                'advanced_analytics': False,
                'team_management': False,
                'sso': False,
                'audit_logs': False,
                'custom_integrations': False
            },
            'professional': {
                'custom_domain': True,
                'white_label': True,
                'api_access': True,
                'webhook_support': True,
                'priority_support': False,
                'advanced_analytics': True,
                'team_management': True,
                'sso': False,
                'audit_logs': True,
                'custom_integrations': True
            },
            'enterprise': {
                'custom_domain': True,
                'white_label': True,
                'api_access': True,
                'webhook_support': True,
                'priority_support': True,
                'advanced_analytics': True,
                'team_management': True,
                'sso': True,
                'audit_logs': True,
                'custom_integrations': True
            }
        }
        
        return features.get(plan, features['starter'])
    
    def _get_plan_limits(self, plan: str) -> Dict[str, int]:
        """Get limits for a plan."""
        limits = {
            'starter': {
                'users': 10,
                'api_calls_per_month': 10000,
                'storage_gb': 10,
                'ai_requests_per_month': 1000,
                'custom_agents': 5,
                'webhooks': 0,
                'team_members': 3
            },
            'professional': {
                'users': 100,
                'api_calls_per_month': 100000,
                'storage_gb': 100,
                'ai_requests_per_month': 10000,
                'custom_agents': 25,
                'webhooks': 10,
                'team_members': 10
            },
            'enterprise': {
                'users': -1,  # Unlimited
                'api_calls_per_month': -1,
                'storage_gb': 1000,
                'ai_requests_per_month': -1,
                'custom_agents': -1,
                'webhooks': -1,
                'team_members': -1
            }
        }
        
        return limits.get(plan, limits['starter'])
    
    async def _create_tenant_database(
        self,
        tenant_id: str,
        strategy: str,
        db: AsyncSession
    ):
        """Create isolated database for tenant."""
        try:
            if strategy == DatabaseIsolationStrategy.SCHEMA:
                # Create schema
                schema_name = f"tenant_{tenant_id.replace('-', '_')}"
                await db.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
                
                # Store database info
                db_record = TenantDatabase(
                    tenant_id=tenant_id,
                    database_type='postgresql',
                    connection_string=f"{settings.DATABASE_URL}?schema={schema_name}",
                    schema_name=schema_name
                )
                
            elif strategy == DatabaseIsolationStrategy.DATABASE:
                # Create database
                db_name = f"tenant_{tenant_id.replace('-', '_')}"
                
                # Connect to postgres to create database
                await db.execute(f"CREATE DATABASE {db_name}")
                
                # Store database info
                connection_string = settings.DATABASE_URL.replace(
                    settings.DATABASE_URL.split('/')[-1],
                    db_name
                )
                
                db_record = TenantDatabase(
                    tenant_id=tenant_id,
                    database_type='postgresql',
                    connection_string=connection_string,
                    database_name=db_name
                )
                
            elif strategy == DatabaseIsolationStrategy.SERVER:
                # This would provision a new database server
                # For now, just use a different database
                db_record = await self._provision_database_server(tenant_id)
            
            db.add(db_record)
            
            # Run migrations on new database/schema
            await self._run_tenant_migrations(db_record)
            
        except Exception as e:
            logger.error(f"Database creation error: {e}")
            raise
    
    async def _provision_database_server(self, tenant_id: str) -> TenantDatabase:
        """Provision a dedicated database server for tenant."""
        # This would integrate with cloud providers (AWS RDS, Azure Database, etc.)
        # For now, return a placeholder
        return TenantDatabase(
            tenant_id=tenant_id,
            database_type='postgresql',
            connection_string=f"postgresql://tenant_{tenant_id}:password@dedicated-server:5432/tenant_db",
            server_host='dedicated-server',
            server_port=5432
        )
    
    async def _run_tenant_migrations(self, db_record: TenantDatabase):
        """Run database migrations for tenant."""
        # This would run Alembic migrations on the tenant database
        # For now, just log
        logger.info(f"Running migrations for tenant database: {db_record.tenant_id}")
    
    async def _cache_tenant(self, tenant: WhitelabelTenant):
        """Cache tenant information."""
        # Cache by ID
        await cache.set(
            f"tenant:id:{tenant.id}",
            tenant.to_dict(),
            ttl=3600
        )
        
        # Cache by subdomain
        await cache.set(
            f"tenant:subdomain:{tenant.subdomain}",
            tenant.id,
            ttl=3600
        )
        
        # Cache by API key
        await cache.set(
            f"tenant:api_key:{tenant.api_key}",
            tenant.id,
            ttl=3600
        )
    
    async def get_tenant_by_domain(
        self,
        domain: str,
        db: AsyncSession
    ) -> Optional[WhitelabelTenant]:
        """Get tenant by domain."""
        # Check cache first
        cache_key = f"tenant:domain:{domain}"
        cached_tenant_id = await cache.get(cache_key)
        
        if cached_tenant_id:
            return await self.get_tenant(cached_tenant_id, db)
        
        # Parse domain
        parsed = urlparse(f"http://{domain}")
        hostname = parsed.hostname or domain
        
        # Check if it's a subdomain
        if hostname.endswith(f".{settings.BASE_DOMAIN}"):
            subdomain = hostname.replace(f".{settings.BASE_DOMAIN}", "")
            
            # Get by subdomain
            result = await db.execute(
                select(WhitelabelTenant).where(
                    WhitelabelTenant.subdomain == subdomain
                )
            )
            tenant = result.scalar_one_or_none()
            
            if tenant:
                await cache.set(cache_key, tenant.id, ttl=self.domain_cache_ttl)
                return tenant
        
        # Check custom domains
        result = await db.execute(
            select(TenantDomain).where(
                TenantDomain.domain == hostname,
                TenantDomain.is_verified == True
            )
        )
        domain_record = result.scalar_one_or_none()
        
        if domain_record:
            tenant = await self.get_tenant(domain_record.tenant_id, db)
            if tenant:
                await cache.set(cache_key, tenant.id, ttl=self.domain_cache_ttl)
                return tenant
        
        return None
    
    async def get_tenant(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> Optional[WhitelabelTenant]:
        """Get tenant by ID."""
        # Check cache
        cached = await cache.get(f"tenant:id:{tenant_id}")
        if cached:
            return WhitelabelTenant(**cached)
        
        # Get from database
        result = await db.execute(
            select(WhitelabelTenant).where(
                WhitelabelTenant.id == tenant_id
            )
        )
        tenant = result.scalar_one_or_none()
        
        if tenant:
            await self._cache_tenant(tenant)
        
        return tenant
    
    async def get_tenant_by_api_key(
        self,
        api_key: str,
        db: AsyncSession
    ) -> Optional[WhitelabelTenant]:
        """Get tenant by API key."""
        # Check cache
        cached_id = await cache.get(f"tenant:api_key:{api_key}")
        if cached_id:
            return await self.get_tenant(cached_id, db)
        
        # Get from database
        result = await db.execute(
            select(WhitelabelTenant).where(
                WhitelabelTenant.api_key == api_key
            )
        )
        tenant = result.scalar_one_or_none()
        
        if tenant:
            await self._cache_tenant(tenant)
        
        return tenant
    
    async def update_tenant(
        self,
        tenant_id: str,
        updates: Dict[str, Any],
        db: AsyncSession
    ) -> WhitelabelTenant:
        """Update tenant information."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        # Update fields
        for key, value in updates.items():
            if hasattr(tenant, key):
                setattr(tenant, key, value)
        
        tenant.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(tenant)
        
        # Clear cache
        await self._clear_tenant_cache(tenant)
        await self._cache_tenant(tenant)
        
        return tenant
    
    async def _clear_tenant_cache(self, tenant: WhitelabelTenant):
        """Clear tenant cache."""
        await cache.delete(f"tenant:id:{tenant.id}")
        await cache.delete(f"tenant:subdomain:{tenant.subdomain}")
        await cache.delete(f"tenant:api_key:{tenant.api_key}")
    
    async def add_custom_domain(
        self,
        tenant_id: str,
        domain: str,
        db: AsyncSession
    ) -> TenantDomain:
        """Add custom domain to tenant."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        # Check if domain already exists
        existing = await db.execute(
            select(TenantDomain).where(
                TenantDomain.domain == domain
            )
        )
        if existing.scalar_one_or_none():
            raise TenantError("Domain already in use")
        
        # Create domain record
        domain_record = TenantDomain(
            tenant_id=tenant_id,
            domain=domain,
            is_primary=False,
            is_verified=False,
            verification_token=secrets.token_urlsafe(32),
            created_at=datetime.utcnow()
        )
        
        db.add(domain_record)
        await db.commit()
        
        return domain_record
    
    async def verify_domain(
        self,
        tenant_id: str,
        domain: str,
        db: AsyncSession
    ) -> bool:
        """Verify custom domain ownership."""
        result = await db.execute(
            select(TenantDomain).where(
                and_(
                    TenantDomain.tenant_id == tenant_id,
                    TenantDomain.domain == domain
                )
            )
        )
        domain_record = result.scalar_one_or_none()
        
        if not domain_record:
            raise TenantError("Domain not found")
        
        # Check DNS TXT record
        try:
            resolver = dns.resolver.Resolver()
            answers = resolver.resolve(f"_logos-verify.{domain}", 'TXT')
            
            for rdata in answers:
                if domain_record.verification_token in str(rdata):
                    # Domain verified
                    domain_record.is_verified = True
                    domain_record.verified_at = datetime.utcnow()
                    await db.commit()
                    
                    # Setup SSL
                    asyncio.create_task(
                        self._setup_custom_domain_ssl(domain)
                    )
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Domain verification error: {e}")
            return False
    
    async def _setup_subdomain_ssl(self, subdomain: str):
        """Setup SSL for subdomain."""
        try:
            domain = f"{subdomain}.{settings.BASE_DOMAIN}"
            
            # Use certbot to get certificate
            certbot_args = [
                'certonly',
                '--nginx',
                '--non-interactive',
                '--agree-tos',
                '--email', self.certbot_email,
                '--domains', domain
            ]
            
            # Run certbot
            await asyncio.to_thread(certbot_main, certbot_args)
            
            logger.info(f"SSL certificate obtained for {domain}")
            
        except Exception as e:
            logger.error(f"SSL setup error: {e}")
    
    async def _setup_custom_domain_ssl(self, domain: str):
        """Setup SSL for custom domain."""
        try:
            # Use certbot for custom domain
            certbot_args = [
                'certonly',
                '--nginx',
                '--non-interactive',
                '--agree-tos',
                '--email', self.certbot_email,
                '--domains', domain
            ]
            
            await asyncio.to_thread(certbot_main, certbot_args)
            
            logger.info(f"SSL certificate obtained for custom domain {domain}")
            
        except Exception as e:
            logger.error(f"Custom domain SSL error: {e}")
    
    async def get_tenant_database_session(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> AsyncSession:
        """Get database session for tenant."""
        # Get tenant
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        # If shared database, return regular session with tenant context
        if tenant.isolation_strategy == DatabaseIsolationStrategy.SHARED:
            # The session should be configured to automatically filter by tenant_id
            return db
        
        # Get or create engine for isolated database
        if tenant_id not in self.tenant_engines:
            # Get database info
            result = await db.execute(
                select(TenantDatabase).where(
                    TenantDatabase.tenant_id == tenant_id
                )
            )
            db_info = result.scalar_one_or_none()
            
            if not db_info:
                raise TenantError("Tenant database not found")
            
            # Create engine
            engine = create_async_engine(
                db_info.connection_string,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
            
            self.tenant_engines[tenant_id] = engine
        
        # Create session
        async_session = sessionmaker(
            self.tenant_engines[tenant_id],
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        return async_session()
    
    async def get_tenant_config(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get tenant configuration."""
        result = await db.execute(
            select(TenantConfiguration).where(
                TenantConfiguration.tenant_id == tenant_id
            )
        )
        config = result.scalar_one_or_none()
        
        if config:
            return config.settings
        
        return {}
    
    async def update_tenant_config(
        self,
        tenant_id: str,
        config_updates: Dict[str, Any],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Update tenant configuration."""
        result = await db.execute(
            select(TenantConfiguration).where(
                TenantConfiguration.tenant_id == tenant_id
            )
        )
        config = result.scalar_one_or_none()
        
        if not config:
            config = TenantConfiguration(
                tenant_id=tenant_id,
                settings={}
            )
            db.add(config)
        
        # Merge configurations
        config.settings = {**config.settings, **config_updates}
        config.updated_at = datetime.utcnow()
        
        await db.commit()
        
        return config.settings
    
    async def get_tenant_usage(
        self,
        tenant_id: str,
        metric: str,
        period: str = "month"
    ) -> Dict[str, Any]:
        """Get tenant usage statistics."""
        # This would query usage tracking tables
        # For now, return sample data
        return {
            'tenant_id': tenant_id,
            'metric': metric,
            'period': period,
            'usage': 0,
            'limit': 0,
            'percentage': 0
        }
    
    async def check_tenant_limit(
        self,
        tenant_id: str,
        resource: str,
        db: AsyncSession
    ) -> Tuple[bool, int, int]:
        """Check if tenant has reached resource limit."""
        config = await self.get_tenant_config(tenant_id, db)
        limits = config.get('limits', {})
        
        limit = limits.get(resource, 0)
        if limit == -1:  # Unlimited
            return True, 0, -1
        
        # Get current usage
        usage = await self.get_tenant_usage(tenant_id, resource)
        current = usage.get('usage', 0)
        
        return current < limit, current, limit
    
    async def list_tenant_users(
        self,
        tenant_id: str,
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0
    ) -> List[User]:
        """List users for a tenant."""
        result = await db.execute(
            select(User)
            .join(TenantUser)
            .where(TenantUser.tenant_id == tenant_id)
            .limit(limit)
            .offset(offset)
        )
        
        return result.scalars().all()
    
    async def add_user_to_tenant(
        self,
        tenant_id: str,
        user_id: int,
        db: AsyncSession,
        role: str = "member"
    ):
        """Add user to tenant."""
        # Check if already exists
        existing = await db.execute(
            select(TenantUser).where(
                and_(
                    TenantUser.tenant_id == tenant_id,
                    TenantUser.user_id == user_id
                )
            )
        )
        
        if existing.scalar_one_or_none():
            raise TenantError("User already in tenant")
        
        # Add user
        tenant_user = TenantUser(
            tenant_id=tenant_id,
            user_id=user_id,
            role=role,
            created_at=datetime.utcnow()
        )
        
        db.add(tenant_user)
        await db.commit()
    
    async def remove_user_from_tenant(
        self,
        tenant_id: str,
        user_id: int,
        db: AsyncSession
    ):
        """Remove user from tenant."""
        await db.execute(
            delete(TenantUser).where(
                and_(
                    TenantUser.tenant_id == tenant_id,
                    TenantUser.user_id == user_id
                )
            )
        )
        await db.commit()
    
    async def get_user_tenants(
        self,
        user_id: int,
        db: AsyncSession
    ) -> List[WhitelabelTenant]:
        """Get all tenants a user belongs to."""
        result = await db.execute(
            select(WhitelabelTenant)
            .join(TenantUser)
            .where(TenantUser.user_id == user_id)
        )
        
        return result.scalars().all()
    
    async def switch_tenant_plan(
        self,
        tenant_id: str,
        new_plan: str,
        db: AsyncSession
    ):
        """Switch tenant to a different plan."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        old_plan = tenant.plan
        tenant.plan = new_plan
        tenant.updated_at = datetime.utcnow()
        
        # Update configuration with new features and limits
        config = await self.get_tenant_config(tenant_id, db)
        config['features'] = self._get_plan_features(new_plan)
        config['limits'] = self._get_plan_limits(new_plan)
        
        await self.update_tenant_config(tenant_id, config, db)
        await db.commit()
        
        logger.info(f"Tenant {tenant_id} switched from {old_plan} to {new_plan}")
    
    async def suspend_tenant(
        self,
        tenant_id: str,
        reason: str,
        db: AsyncSession
    ):
        """Suspend a tenant."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        tenant.status = 'suspended'
        tenant.suspension_reason = reason
        tenant.suspended_at = datetime.utcnow()
        
        await db.commit()
        
        # Clear all caches
        await self._clear_tenant_cache(tenant)
        
        logger.warning(f"Tenant {tenant_id} suspended: {reason}")
    
    async def reactivate_tenant(
        self,
        tenant_id: str,
        db: AsyncSession
    ):
        """Reactivate a suspended tenant."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        tenant.status = 'active'
        tenant.suspension_reason = None
        tenant.suspended_at = None
        
        await db.commit()
        await self._cache_tenant(tenant)
        
        logger.info(f"Tenant {tenant_id} reactivated")
    
    async def delete_tenant(
        self,
        tenant_id: str,
        db: AsyncSession,
        soft_delete: bool = True
    ):
        """Delete a tenant."""
        tenant = await self.get_tenant(tenant_id, db)
        if not tenant:
            raise TenantError("Tenant not found")
        
        if soft_delete:
            # Soft delete
            tenant.status = 'deleted'
            tenant.deleted_at = datetime.utcnow()
            await db.commit()
        else:
            # Hard delete - remove all data
            # This would need to handle all related data
            await db.execute(
                delete(TenantDomain).where(
                    TenantDomain.tenant_id == tenant_id
                )
            )
            await db.execute(
                delete(TenantConfiguration).where(
                    TenantConfiguration.tenant_id == tenant_id
                )
            )
            await db.execute(
                delete(TenantUser).where(
                    TenantUser.tenant_id == tenant_id
                )
            )
            await db.execute(
                delete(WhitelabelTenant).where(
                    WhitelabelTenant.id == tenant_id
                )
            )
            await db.commit()
        
        # Clear caches
        await self._clear_tenant_cache(tenant)
        
        logger.info(f"Tenant {tenant_id} deleted (soft={soft_delete})")


# Singleton instance
tenant_service = TenantService()