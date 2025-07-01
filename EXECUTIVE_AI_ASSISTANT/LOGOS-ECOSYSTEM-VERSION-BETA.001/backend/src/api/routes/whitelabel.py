"""Whitelabel Platform API Routes."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
from datetime import date, datetime
from decimal import Decimal
import json

from ...services.whitelabel import (
    theme_service,
    tenant_service,
    revenue_sharing_service,
    CommissionModel,
    PayoutFrequency,
    DatabaseIsolationStrategy
)
from ...shared.models.user import (
    WhitelabelTenant,
    TenantDomain,
    RevenueShare,
    Commission,
    Payout,
    TransactionType
)
from ...shared.utils.exceptions import TenantError, PaymentError
from ..deps import get_current_user, get_current_active_superuser, get_db
from ..schemas.whitelabel import (
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    ThemeConfigCreate,
    ThemeConfigResponse,
    DomainCreate,
    DomainVerifyResponse,
    RevenueSharingCreate,
    RevenueSharingUpdate,
    PayoutRequest,
    PayoutResponse,
    CommissionReportResponse
)

router = APIRouter()


# Tenant Management Routes
@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Create a new whitelabel tenant (admin only)."""
    try:
        tenant = await tenant_service.create_tenant(
            name=tenant_data.name,
            subdomain=tenant_data.subdomain,
            owner_email=tenant_data.owner_email,
            plan=tenant_data.plan,
            isolation_strategy=tenant_data.isolation_strategy,
            db=db
        )
        return TenantResponse.from_orm(tenant)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """List all tenants (admin only)."""
    # This would query all tenants with pagination
    # For now, return empty list
    return []


@router.get("/tenants/current", response_model=TenantResponse)
async def get_current_tenant(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get current tenant based on domain."""
    domain = request.headers.get('host', '').split(':')[0]
    tenant = await tenant_service.get_tenant_by_domain(domain, db)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found for this domain"
        )
    
    return TenantResponse.from_orm(tenant)


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get tenant details."""
    # Check if user has access to this tenant
    user_tenants = await tenant_service.get_user_tenants(current_user.id, db)
    tenant_ids = [t.id for t in user_tenants]
    
    if tenant_id not in tenant_ids and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant"
        )
    
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return TenantResponse.from_orm(tenant)


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    updates: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update tenant details."""
    # Check access
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    if tenant.owner_email != current_user.email and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tenant owner or admin can update tenant"
        )
    
    updated_tenant = await tenant_service.update_tenant(
        tenant_id,
        updates.dict(exclude_unset=True),
        db
    )
    
    return TenantResponse.from_orm(updated_tenant)


@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(
    tenant_id: str,
    reason: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Suspend a tenant (admin only)."""
    await tenant_service.suspend_tenant(tenant_id, reason, db)
    return {"message": "Tenant suspended successfully"}


@router.post("/tenants/{tenant_id}/reactivate")
async def reactivate_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Reactivate a suspended tenant (admin only)."""
    await tenant_service.reactivate_tenant(tenant_id, db)
    return {"message": "Tenant reactivated successfully"}


# Theme Management Routes
@router.post("/tenants/{tenant_id}/theme", response_model=ThemeConfigResponse)
async def create_theme(
    tenant_id: str,
    theme_config: ThemeConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create or update theme for tenant."""
    # Check access
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if whitelabeling is enabled for tenant's plan
    config = await tenant_service.get_tenant_config(tenant_id, db)
    if not config.get('features', {}).get('white_label', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Whitelabeling not available in current plan"
        )
    
    theme = await theme_service.create_theme(
        tenant_id,
        theme_config.model_dump(),
        db
    )
    
    return ThemeConfigResponse(**theme)


@router.get("/tenants/{tenant_id}/theme", response_model=ThemeConfigResponse)
async def get_theme(
    tenant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get theme for tenant (public endpoint for loading theme)."""
    theme = await theme_service.get_theme(tenant_id, db)
    
    if not theme:
        # Return default theme
        return ThemeConfigResponse(
            config=theme_service._validate_theme_config({}),
            css_url=None,
            favicon_url=None,
            theme_hash=None
        )
    
    return ThemeConfigResponse(**theme)


@router.get("/tenants/{tenant_id}/theme.css")
async def get_theme_css(
    tenant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get compiled CSS for tenant theme."""
    theme = await theme_service.get_theme(tenant_id, db)
    
    if not theme or not theme.get('css_url'):
        # Return default CSS
        default_config = theme_service._validate_theme_config({})
        css_content = theme_service._generate_fallback_css(default_config)
        return Response(content=css_content, media_type="text/css")
    
    # Return CSS file
    css_path = theme.get('css_url').replace('/static/', '')
    file_path = f"{settings.STATIC_DIR}/{css_path}"
    
    return FileResponse(file_path, media_type="text/css")


@router.post("/tenants/{tenant_id}/logo")
async def upload_logo(
    tenant_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload logo for tenant."""
    # Check access and whitelabel feature
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Read file
    contents = await file.read()
    
    # Upload and process logo
    logo_url = await theme_service.upload_logo(
        tenant_id,
        contents,
        file.filename
    )
    
    return {"logo_url": logo_url}


# Domain Management Routes
@router.post("/tenants/{tenant_id}/domains", response_model=DomainCreate)
async def add_custom_domain(
    tenant_id: str,
    domain_data: DomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add custom domain to tenant."""
    # Check if custom domains are enabled
    config = await tenant_service.get_tenant_config(tenant_id, db)
    if not config.get('features', {}).get('custom_domain', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom domains not available in current plan"
        )
    
    domain = await tenant_service.add_custom_domain(
        tenant_id,
        domain_data.domain,
        db
    )
    
    return DomainCreate.from_orm(domain)


@router.post("/tenants/{tenant_id}/domains/{domain}/verify", response_model=DomainVerifyResponse)
async def verify_domain(
    tenant_id: str,
    domain: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Verify custom domain ownership."""
    verified = await tenant_service.verify_domain(tenant_id, domain, db)
    
    return DomainVerifyResponse(
        domain=domain,
        verified=verified,
        message="Domain verified successfully" if verified else "Verification failed"
    )


# Revenue Sharing Routes
@router.post("/tenants/{tenant_id}/revenue-sharing", response_model=RevenueSharingCreate)
async def create_revenue_sharing_agreement(
    tenant_id: str,
    agreement: RevenueSharingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Create revenue sharing agreement for tenant (admin only)."""
    revenue_share = await revenue_sharing_service.create_revenue_share_agreement(
        tenant_id=tenant_id,
        commission_model=CommissionModel(agreement.commission_model),
        commission_config=agreement.commission_config,
        payout_frequency=PayoutFrequency(agreement.payout_frequency),
        payout_config=agreement.payout_config,
        db=db
    )
    
    return RevenueSharingCreate.from_orm(revenue_share)


@router.get("/tenants/{tenant_id}/balance")
async def get_tenant_balance(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current balance and commission summary."""
    balance = await revenue_sharing_service.get_tenant_balance(tenant_id, db)
    return balance


@router.post("/tenants/{tenant_id}/commissions")
async def record_commission(
    tenant_id: str,
    revenue_amount: Decimal,
    transaction_type: str,
    metadata: Dict[str, Any] = {},
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Record a commission for tenant (admin only - usually called by system)."""
    commission = await revenue_sharing_service.calculate_commission(
        tenant_id=tenant_id,
        revenue_amount=revenue_amount,
        transaction_type=TransactionType.__dict__[transaction_type.upper()],
        metadata=metadata,
        db=db
    )
    
    return {
        "commission_id": commission.id,
        "amount": commission.commission_amount,
        "rate": commission.commission_rate
    }


@router.get("/tenants/{tenant_id}/commission-report", response_model=CommissionReportResponse)
async def get_commission_report(
    tenant_id: str,
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get commission report for date range."""
    report = await revenue_sharing_service.get_commission_report(
        tenant_id,
        start_date,
        end_date,
        db
    )
    
    return CommissionReportResponse(**report)


@router.post("/tenants/{tenant_id}/payouts", response_model=PayoutResponse)
async def request_payout(
    tenant_id: str,
    payout_request: PayoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Request a payout."""
    # Verify tenant access
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant or (tenant.owner_email != current_user.email and not current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    payout = await revenue_sharing_service.process_payout(
        tenant_id=tenant_id,
        amount=payout_request.amount,
        payment_method=payout_request.payment_method,
        payment_details=payout_request.payment_details,
        db=db
    )
    
    return PayoutResponse.from_orm(payout)


@router.get("/tenants/{tenant_id}/payouts", response_model=List[PayoutResponse])
async def get_payout_history(
    tenant_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get payout history."""
    payouts = await revenue_sharing_service.get_payout_history(
        tenant_id,
        db,
        limit=limit,
        offset=offset,
        status=status_filter
    )
    
    return [PayoutResponse.from_orm(p) for p in payouts]


# Tenant Configuration Routes
@router.get("/tenants/{tenant_id}/config")
async def get_tenant_configuration(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get tenant configuration."""
    config = await tenant_service.get_tenant_config(tenant_id, db)
    return config


@router.put("/tenants/{tenant_id}/config")
async def update_tenant_configuration(
    tenant_id: str,
    config_updates: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update tenant configuration."""
    # Verify ownership
    tenant = await tenant_service.get_tenant(tenant_id, db)
    if not tenant or (tenant.owner_email != current_user.email and not current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tenant owner or admin can update configuration"
        )
    
    updated_config = await tenant_service.update_tenant_config(
        tenant_id,
        config_updates,
        db
    )
    
    return updated_config


# Tenant User Management
@router.get("/tenants/{tenant_id}/users")
async def list_tenant_users(
    tenant_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List users in tenant."""
    users = await tenant_service.list_tenant_users(
        tenant_id,
        db,
        limit=limit,
        offset=offset
    )
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": "member"  # Would get from TenantUser relationship
        }
        for user in users
    ]


@router.post("/tenants/{tenant_id}/users/{user_id}")
async def add_user_to_tenant(
    tenant_id: str,
    user_id: int,
    role: str = "member",
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add user to tenant."""
    await tenant_service.add_user_to_tenant(
        tenant_id,
        user_id,
        role,
        db
    )
    
    return {"message": "User added to tenant successfully"}


@router.delete("/tenants/{tenant_id}/users/{user_id}")
async def remove_user_from_tenant(
    tenant_id: str,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Remove user from tenant."""
    await tenant_service.remove_user_from_tenant(
        tenant_id,
        user_id,
        db
    )
    
    return {"message": "User removed from tenant successfully"}


# Plan Management
@router.put("/tenants/{tenant_id}/plan")
async def change_tenant_plan(
    tenant_id: str,
    new_plan: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_superuser)
):
    """Change tenant plan (admin only)."""
    await tenant_service.switch_tenant_plan(
        tenant_id,
        new_plan,
        db
    )
    
    return {"message": f"Tenant plan changed to {new_plan}"}


# API Key Authentication for Tenants
@router.get("/auth/tenant")
async def authenticate_tenant_api(
    api_key: str = Query(..., description="Tenant API key"),
    db: AsyncSession = Depends(get_db)
):
    """Authenticate using tenant API key."""
    tenant = await tenant_service.get_tenant_by_api_key(api_key, db)
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    if tenant.status != 'active':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tenant is {tenant.status}"
        )
    
    return {
        "tenant_id": tenant.id,
        "name": tenant.name,
        "plan": tenant.plan,
        "features": await tenant_service.get_tenant_config(tenant.id, db)
    }