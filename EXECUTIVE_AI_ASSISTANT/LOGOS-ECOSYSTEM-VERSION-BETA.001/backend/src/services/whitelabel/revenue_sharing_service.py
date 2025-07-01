"""Revenue Sharing Service for Whitelabel Platform."""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
import uuid
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.sql import expression

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...shared.utils.exceptions import PaymentError
from ...infrastructure.cache import cache_manager
from ...shared.models.user import (
    WhitelabelTenant, RevenueShare, Commission,
    Payout, PayoutStatus, TransactionType
)
from ..payment.real_payment_integrations import UnifiedPaymentProcessor

logger = get_logger(__name__)
settings = get_settings()
cache = cache_manager


class CommissionModel(Enum):
    """Commission calculation models."""
    FLAT_RATE = "flat_rate"  # Fixed percentage on all revenue
    TIERED = "tiered"  # Different rates based on volume
    PROGRESSIVE = "progressive"  # Rate increases with volume
    CUSTOM = "custom"  # Custom calculation logic
    HYBRID = "hybrid"  # Combination of models


class PayoutFrequency(Enum):
    """Payout frequency options."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ON_DEMAND = "on_demand"
    THRESHOLD = "threshold"  # When balance reaches threshold


class RevenueSharingService:
    """Service for managing revenue sharing and commissions."""
    
    def __init__(self):
        self.payment_processor = UnifiedPaymentProcessor()
        self.default_commission_rate = Decimal("0.20")  # 20%
        self.minimum_payout = Decimal("50.00")  # $50 minimum
        self.payout_processing_fee = Decimal("2.00")  # $2 per payout
        
    async def create_revenue_share_agreement(
        self,
        tenant_id: str,
        commission_model: CommissionModel,
        commission_config: Dict[str, Any],
        payout_frequency: PayoutFrequency,
        payout_config: Dict[str, Any],
        db: AsyncSession
    ) -> RevenueShare:
        """Create revenue sharing agreement for tenant."""
        try:
            # Validate commission configuration
            validated_config = self._validate_commission_config(
                commission_model,
                commission_config
            )
            
            # Create revenue share record
            revenue_share = RevenueShare(
                tenant_id=tenant_id,
                commission_model=commission_model.value,
                commission_config=validated_config,
                payout_frequency=payout_frequency.value,
                payout_config=payout_config,
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.add(revenue_share)
            await db.commit()
            
            logger.info(f"Created revenue share agreement for tenant {tenant_id}")
            return revenue_share
            
        except Exception as e:
            logger.error(f"Revenue share creation error: {e}")
            raise PaymentError(f"Failed to create revenue share: {str(e)}")
    
    def _validate_commission_config(
        self,
        model: CommissionModel,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate commission configuration."""
        if model == CommissionModel.FLAT_RATE:
            # Validate flat rate
            rate = Decimal(str(config.get('rate', '0.20')))
            if not (0 <= rate <= 1):
                raise ValueError("Commission rate must be between 0 and 1")
            
            return {
                'rate': str(rate),
                'minimum_revenue': str(config.get('minimum_revenue', '0')),
                'maximum_commission': str(config.get('maximum_commission', '-1'))
            }
            
        elif model == CommissionModel.TIERED:
            # Validate tiered rates
            tiers = config.get('tiers', [])
            if not tiers:
                raise ValueError("Tiered model requires tier definitions")
            
            validated_tiers = []
            for tier in tiers:
                validated_tiers.append({
                    'min_revenue': str(tier['min_revenue']),
                    'max_revenue': str(tier.get('max_revenue', '-1')),
                    'rate': str(tier['rate'])
                })
            
            return {'tiers': validated_tiers}
            
        elif model == CommissionModel.PROGRESSIVE:
            # Validate progressive model
            return {
                'base_rate': str(config.get('base_rate', '0.10')),
                'increment_per_thousand': str(config.get('increment_per_thousand', '0.01')),
                'max_rate': str(config.get('max_rate', '0.30'))
            }
            
        elif model == CommissionModel.CUSTOM:
            # Custom logic - store as-is
            return config
            
        elif model == CommissionModel.HYBRID:
            # Hybrid model combines others
            return {
                'base_model': config.get('base_model'),
                'bonus_model': config.get('bonus_model'),
                'conditions': config.get('conditions', {})
            }
        
        return config
    
    async def calculate_commission(
        self,
        tenant_id: str,
        revenue_amount: Decimal,
        transaction_type: TransactionType,
        metadata: Dict[str, Any],
        db: AsyncSession
    ) -> Commission:
        """Calculate commission for a transaction."""
        # Get revenue share agreement
        result = await db.execute(
            select(RevenueShare).where(
                and_(
                    RevenueShare.tenant_id == tenant_id,
                    RevenueShare.is_active == True
                )
            )
        )
        revenue_share = result.scalar_one_or_none()
        
        if not revenue_share:
            # Use default commission
            commission_rate = self.default_commission_rate
            commission_amount = revenue_amount * commission_rate
        else:
            # Calculate based on model
            commission_amount = await self._calculate_commission_amount(
                revenue_share,
                revenue_amount,
                transaction_type,
                db
            )
            commission_rate = commission_amount / revenue_amount if revenue_amount > 0 else Decimal('0')
        
        # Create commission record
        commission = Commission(
            tenant_id=tenant_id,
            transaction_id=metadata.get('transaction_id', str(uuid.uuid4())),
            transaction_type=transaction_type.value,
            revenue_amount=revenue_amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            currency=metadata.get('currency', 'USD'),
            status='pending',
            metadata=metadata,
            created_at=datetime.utcnow()
        )
        
        db.add(commission)
        await db.commit()
        
        # Update tenant balance
        await self._update_tenant_balance(tenant_id, commission_amount, db)
        
        return commission
    
    async def _calculate_commission_amount(
        self,
        revenue_share: RevenueShare,
        revenue_amount: Decimal,
        transaction_type: TransactionType,
        db: AsyncSession
    ) -> Decimal:
        """Calculate commission amount based on model."""
        model = CommissionModel(revenue_share.commission_model)
        config = revenue_share.commission_config
        
        if model == CommissionModel.FLAT_RATE:
            # Simple flat rate
            rate = Decimal(config['rate'])
            commission = revenue_amount * rate
            
            # Apply limits
            max_commission = Decimal(config.get('maximum_commission', '-1'))
            if max_commission > 0 and commission > max_commission:
                commission = max_commission
                
            return commission
            
        elif model == CommissionModel.TIERED:
            # Calculate based on tiers
            commission = Decimal('0')
            remaining = revenue_amount
            
            for tier in config['tiers']:
                min_rev = Decimal(tier['min_revenue'])
                max_rev = Decimal(tier['max_revenue'])
                rate = Decimal(tier['rate'])
                
                if remaining <= 0:
                    break
                
                if max_rev == -1:
                    # Last tier
                    tier_amount = remaining
                else:
                    # Calculate amount in this tier
                    tier_amount = min(remaining, max_rev - min_rev)
                
                commission += tier_amount * rate
                remaining -= tier_amount
            
            return commission
            
        elif model == CommissionModel.PROGRESSIVE:
            # Progressive rate
            base_rate = Decimal(config['base_rate'])
            increment = Decimal(config['increment_per_thousand'])
            max_rate = Decimal(config['max_rate'])
            
            # Calculate rate based on total revenue
            total_revenue = await self._get_tenant_total_revenue(
                revenue_share.tenant_id,
                db
            )
            
            thousands = total_revenue / 1000
            rate = min(base_rate + (thousands * increment), max_rate)
            
            return revenue_amount * rate
            
        elif model == CommissionModel.CUSTOM:
            # Custom calculation
            # This would call a custom function based on config
            return await self._custom_commission_calculation(
                revenue_share.tenant_id,
                revenue_amount,
                transaction_type,
                config,
                db
            )
            
        elif model == CommissionModel.HYBRID:
            # Combine multiple models
            base_commission = Decimal('0')
            bonus_commission = Decimal('0')
            
            # Calculate base
            if config.get('base_model'):
                base_config = config['base_model']
                # Recursive calculation with base model
                base_commission = revenue_amount * Decimal(base_config.get('rate', '0.10'))
            
            # Calculate bonus
            if config.get('bonus_model'):
                bonus_config = config['bonus_model']
                conditions = config.get('conditions', {})
                
                # Check if bonus conditions are met
                if await self._check_bonus_conditions(
                    revenue_share.tenant_id,
                    conditions,
                    db
                ):
                    bonus_commission = revenue_amount * Decimal(bonus_config.get('rate', '0.05'))
            
            return base_commission + bonus_commission
        
        # Default fallback
        return revenue_amount * self.default_commission_rate
    
    async def _get_tenant_total_revenue(
        self,
        tenant_id: str,
        db: AsyncSession,
        period_days: int = 30
    ) -> Decimal:
        """Get total revenue for tenant in period."""
        since_date = datetime.utcnow() - timedelta(days=period_days)
        
        result = await db.execute(
            select(func.sum(Commission.revenue_amount)).where(
                and_(
                    Commission.tenant_id == tenant_id,
                    Commission.created_at >= since_date,
                    Commission.status == 'confirmed'
                )
            )
        )
        
        total = result.scalar_one_or_none()
        return Decimal(str(total or '0'))
    
    async def _custom_commission_calculation(
        self,
        tenant_id: str,
        revenue_amount: Decimal,
        transaction_type: TransactionType,
        config: Dict[str, Any],
        db: AsyncSession
    ) -> Decimal:
        """Custom commission calculation logic."""
        # This would be extended with specific business logic
        # For now, use a simple calculation
        base_rate = Decimal(config.get('base_rate', '0.15'))
        
        # Apply multipliers based on transaction type
        multipliers = config.get('multipliers', {})
        multiplier = Decimal(multipliers.get(transaction_type.value, '1.0'))
        
        return revenue_amount * base_rate * multiplier
    
    async def _check_bonus_conditions(
        self,
        tenant_id: str,
        conditions: Dict[str, Any],
        db: AsyncSession
    ) -> bool:
        """Check if bonus conditions are met."""
        # Check monthly revenue threshold
        if 'monthly_revenue' in conditions:
            threshold = Decimal(conditions['monthly_revenue'])
            current_revenue = await self._get_tenant_total_revenue(
                tenant_id,
                db,
                period_days=30
            )
            if current_revenue < threshold:
                return False
        
        # Check transaction count
        if 'transaction_count' in conditions:
            required_count = conditions['transaction_count']
            
            result = await db.execute(
                select(func.count(Commission.id)).where(
                    and_(
                        Commission.tenant_id == tenant_id,
                        Commission.created_at >= datetime.utcnow() - timedelta(days=30),
                        Commission.status == 'confirmed'
                    )
                )
            )
            
            count = result.scalar_one_or_none() or 0
            if count < required_count:
                return False
        
        # Check customer satisfaction
        if 'min_satisfaction' in conditions:
            # This would query customer reviews/ratings
            pass
        
        return True
    
    async def _update_tenant_balance(
        self,
        tenant_id: str,
        amount: Decimal,
        db: AsyncSession
    ):
        """Update tenant's commission balance."""
        # This would update a balance tracking table
        # For now, just log
        logger.info(f"Updated balance for tenant {tenant_id}: +{amount}")
    
    async def get_tenant_balance(
        self,
        tenant_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Get current balance for tenant."""
        # Calculate pending commissions
        result = await db.execute(
            select(
                func.sum(Commission.commission_amount).label('pending'),
                func.count(Commission.id).label('count')
            ).where(
                and_(
                    Commission.tenant_id == tenant_id,
                    Commission.status == 'pending'
                )
            )
        )
        pending_data = result.one()
        
        # Calculate paid commissions
        result = await db.execute(
            select(func.sum(Payout.amount)).where(
                and_(
                    Payout.tenant_id == tenant_id,
                    Payout.status == PayoutStatus.COMPLETED
                )
            )
        )
        paid_amount = result.scalar_one_or_none() or Decimal('0')
        
        # Calculate available balance
        pending_amount = Decimal(str(pending_data.pending or '0'))
        available_balance = pending_amount
        
        return {
            'tenant_id': tenant_id,
            'available_balance': available_balance,
            'pending_commissions': pending_amount,
            'pending_count': pending_data.count,
            'total_paid': paid_amount,
            'currency': 'USD',
            'minimum_payout': self.minimum_payout,
            'can_request_payout': available_balance >= self.minimum_payout
        }
    
    async def process_payout(
        self,
        tenant_id: str,
        amount: Optional[Decimal],
        payment_method: str,
        payment_details: Dict[str, Any],
        db: AsyncSession
    ) -> Payout:
        """Process payout for tenant."""
        # Get balance
        balance = await self.get_tenant_balance(tenant_id, db)
        available = balance['available_balance']
        
        # Determine payout amount
        if amount is None:
            payout_amount = available
        else:
            payout_amount = min(amount, available)
        
        # Check minimum
        if payout_amount < self.minimum_payout:
            raise PaymentError(
                f"Payout amount must be at least {self.minimum_payout}"
            )
        
        # Calculate net amount after fees
        fee_amount = self.payout_processing_fee
        net_amount = payout_amount - fee_amount
        
        # Create payout record
        payout = Payout(
            tenant_id=tenant_id,
            amount=payout_amount,
            fee_amount=fee_amount,
            net_amount=net_amount,
            currency='USD',
            payment_method=payment_method,
            payment_details=payment_details,
            status=PayoutStatus.PENDING,
            created_at=datetime.utcnow()
        )
        
        db.add(payout)
        await db.commit()
        
        # Process payment asynchronously
        asyncio.create_task(
            self._execute_payout(payout.id, db)
        )
        
        return payout
    
    async def _execute_payout(
        self,
        payout_id: int,
        db: AsyncSession
    ):
        """Execute the actual payout."""
        try:
            # Get payout
            result = await db.execute(
                select(Payout).where(Payout.id == payout_id)
            )
            payout = result.scalar_one_or_none()
            
            if not payout:
                return
            
            # Update status
            payout.status = PayoutStatus.PROCESSING
            payout.processed_at = datetime.utcnow()
            await db.commit()
            
            # Process based on payment method
            if payout.payment_method == 'bank_transfer':
                transaction_id = await self._process_bank_transfer(payout)
            elif payout.payment_method == 'paypal':
                transaction_id = await self._process_paypal_payout(payout)
            elif payout.payment_method.startswith('crypto_'):
                transaction_id = await self._process_crypto_payout(payout)
            else:
                raise ValueError(f"Unsupported payment method: {payout.payment_method}")
            
            # Update payout status
            payout.status = PayoutStatus.COMPLETED
            payout.transaction_id = transaction_id
            payout.completed_at = datetime.utcnow()
            
            # Mark commissions as paid
            await db.execute(
                update(Commission).where(
                    and_(
                        Commission.tenant_id == payout.tenant_id,
                        Commission.status == 'pending'
                    )
                ).values(
                    status='paid',
                    payout_id=payout.id
                )
            )
            
            await db.commit()
            
            logger.info(f"Payout {payout_id} completed: {transaction_id}")
            
        except Exception as e:
            logger.error(f"Payout execution error: {e}")
            
            # Update status
            if payout:
                payout.status = PayoutStatus.FAILED
                payout.error_message = str(e)
                await db.commit()
    
    async def _process_bank_transfer(self, payout: Payout) -> str:
        """Process bank transfer payout."""
        # This would integrate with banking APIs
        # For now, simulate
        details = payout.payment_details
        
        logger.info(
            f"Processing bank transfer of {payout.net_amount} to "
            f"{details.get('account_number')} at {details.get('bank_name')}"
        )
        
        # Simulate transaction ID
        return f"BANK_{uuid.uuid4().hex[:12].upper()}"
    
    async def _process_paypal_payout(self, payout: Payout) -> str:
        """Process PayPal payout."""
        result = await self.payment_processor.paypal.create_payout(
            recipient_email=payout.payment_details['email'],
            amount=payout.net_amount,
            currency=payout.currency,
            note=f"Commission payout for {payout.tenant_id}"
        )
        
        return result['batch_id']
    
    async def _process_crypto_payout(self, payout: Payout) -> str:
        """Process cryptocurrency payout."""
        crypto_currency = payout.payment_method.replace('crypto_', '').upper()
        
        # Get wallet details
        to_address = payout.payment_details['address']
        
        # Generate sending address (this would use a hot wallet)
        from_address, private_key = await self.payment_processor.crypto.generate_address(
            crypto_currency,
            f"payout_{payout.id}"
        )
        
        # Send transaction
        tx_hash = await self.payment_processor.crypto.send_transaction(
            currency=crypto_currency,
            from_address=from_address,
            private_key=private_key,
            to_address=to_address,
            amount=payout.net_amount
        )
        
        return tx_hash
    
    async def get_payout_history(
        self,
        tenant_id: str,
        db: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        status: Optional[PayoutStatus] = None
    ) -> List[Payout]:
        """Get payout history for tenant."""
        query = select(Payout).where(
            Payout.tenant_id == tenant_id
        )
        
        if status:
            query = query.where(Payout.status == status)
        
        query = query.order_by(Payout.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_commission_report(
        self,
        tenant_id: str,
        start_date: date,
        end_date: date,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Generate commission report for tenant."""
        # Get commissions in period
        result = await db.execute(
            select(
                func.count(Commission.id).label('count'),
                func.sum(Commission.revenue_amount).label('total_revenue'),
                func.sum(Commission.commission_amount).label('total_commission'),
                func.avg(Commission.commission_rate).label('avg_rate'),
                Commission.transaction_type,
                func.date(Commission.created_at).label('date')
            ).where(
                and_(
                    Commission.tenant_id == tenant_id,
                    Commission.created_at >= start_date,
                    Commission.created_at < end_date + timedelta(days=1)
                )
            ).group_by(
                Commission.transaction_type,
                func.date(Commission.created_at)
            )
        )
        
        daily_data = result.all()
        
        # Aggregate by type
        by_type = {}
        daily_breakdown = {}
        
        for row in daily_data:
            # By type
            if row.transaction_type not in by_type:
                by_type[row.transaction_type] = {
                    'count': 0,
                    'revenue': Decimal('0'),
                    'commission': Decimal('0')
                }
            
            by_type[row.transaction_type]['count'] += row.count
            by_type[row.transaction_type]['revenue'] += Decimal(str(row.total_revenue or '0'))
            by_type[row.transaction_type]['commission'] += Decimal(str(row.total_commission or '0'))
            
            # Daily breakdown
            date_str = row.date.strftime('%Y-%m-%d')
            if date_str not in daily_breakdown:
                daily_breakdown[date_str] = {
                    'revenue': Decimal('0'),
                    'commission': Decimal('0'),
                    'count': 0
                }
            
            daily_breakdown[date_str]['revenue'] += Decimal(str(row.total_revenue or '0'))
            daily_breakdown[date_str]['commission'] += Decimal(str(row.total_commission or '0'))
            daily_breakdown[date_str]['count'] += row.count
        
        # Calculate totals
        total_revenue = sum(t['revenue'] for t in by_type.values())
        total_commission = sum(t['commission'] for t in by_type.values())
        total_count = sum(t['count'] for t in by_type.values())
        
        return {
            'tenant_id': tenant_id,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'summary': {
                'total_transactions': total_count,
                'total_revenue': total_revenue,
                'total_commission': total_commission,
                'average_commission_rate': (
                    total_commission / total_revenue 
                    if total_revenue > 0 else Decimal('0')
                ),
                'average_transaction_value': (
                    total_revenue / total_count
                    if total_count > 0 else Decimal('0')
                )
            },
            'by_type': by_type,
            'daily_breakdown': daily_breakdown
        }
    
    async def schedule_automatic_payouts(self):
        """Process automatic payouts based on schedules."""
        # This would run as a scheduled task
        # Get all tenants with automatic payouts
        
        async with AsyncSession() as db:
            # Get tenants with scheduled payouts
            result = await db.execute(
                select(RevenueShare).where(
                    and_(
                        RevenueShare.is_active == True,
                        RevenueShare.payout_frequency != PayoutFrequency.ON_DEMAND.value
                    )
                )
            )
            
            revenue_shares = result.scalars().all()
            
            for revenue_share in revenue_shares:
                try:
                    # Check if payout is due
                    if await self._is_payout_due(revenue_share, db):
                        # Get balance
                        balance = await self.get_tenant_balance(
                            revenue_share.tenant_id,
                            db
                        )
                        
                        if balance['can_request_payout']:
                            # Process automatic payout
                            await self.process_payout(
                                tenant_id=revenue_share.tenant_id,
                                amount=None,  # Full balance
                                payment_method=revenue_share.payout_config.get(
                                    'default_method',
                                    'bank_transfer'
                                ),
                                payment_details=revenue_share.payout_config.get(
                                    'payment_details',
                                    {}
                                ),
                                db=db
                            )
                            
                except Exception as e:
                    logger.error(
                        f"Automatic payout error for tenant "
                        f"{revenue_share.tenant_id}: {e}"
                    )
    
    async def _is_payout_due(
        self,
        revenue_share: RevenueShare,
        db: AsyncSession
    ) -> bool:
        """Check if automatic payout is due."""
        frequency = PayoutFrequency(revenue_share.payout_frequency)
        
        # Get last payout
        result = await db.execute(
            select(Payout).where(
                Payout.tenant_id == revenue_share.tenant_id
            ).order_by(
                Payout.created_at.desc()
            ).limit(1)
        )
        
        last_payout = result.scalar_one_or_none()
        
        if not last_payout:
            # First payout
            return True
        
        # Check based on frequency
        days_since_last = (datetime.utcnow() - last_payout.created_at).days
        
        if frequency == PayoutFrequency.DAILY:
            return days_since_last >= 1
        elif frequency == PayoutFrequency.WEEKLY:
            return days_since_last >= 7
        elif frequency == PayoutFrequency.BIWEEKLY:
            return days_since_last >= 14
        elif frequency == PayoutFrequency.MONTHLY:
            return days_since_last >= 30
        elif frequency == PayoutFrequency.QUARTERLY:
            return days_since_last >= 90
        elif frequency == PayoutFrequency.THRESHOLD:
            # Check if balance meets threshold
            balance = await self.get_tenant_balance(
                revenue_share.tenant_id,
                db
            )
            threshold = Decimal(
                revenue_share.payout_config.get('threshold', '1000')
            )
            return balance['available_balance'] >= threshold
        
        return False
    
    async def update_revenue_share_agreement(
        self,
        tenant_id: str,
        updates: Dict[str, Any],
        db: AsyncSession
    ) -> RevenueShare:
        """Update revenue sharing agreement."""
        result = await db.execute(
            select(RevenueShare).where(
                and_(
                    RevenueShare.tenant_id == tenant_id,
                    RevenueShare.is_active == True
                )
            )
        )
        revenue_share = result.scalar_one_or_none()
        
        if not revenue_share:
            raise ValueError("Revenue share agreement not found")
        
        # Update fields
        if 'commission_model' in updates:
            revenue_share.commission_model = updates['commission_model']
        
        if 'commission_config' in updates:
            revenue_share.commission_config = self._validate_commission_config(
                CommissionModel(revenue_share.commission_model),
                updates['commission_config']
            )
        
        if 'payout_frequency' in updates:
            revenue_share.payout_frequency = updates['payout_frequency']
        
        if 'payout_config' in updates:
            revenue_share.payout_config = updates['payout_config']
        
        revenue_share.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(revenue_share)
        
        return revenue_share


# Singleton instance
revenue_sharing_service = RevenueSharingService()