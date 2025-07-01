from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from ...infrastructure.database import get_db
from ...shared.models.user import User
from ...shared.models.wallet import Wallet, WalletTransaction, PaymentMethod
from ...shared.utils.logger import get_logger
from ..schemas.wallet import (
    WalletResponse, WalletTransactionResponse, DepositRequest,
    WithdrawalRequest, TransferRequest, WalletStatsResponse,
    ValidateRecipientRequest, ValidateRecipientResponse,
    WalletDashboardResponse, PaymentMethodRequest, PaymentMethodResponse,
    CryptoDepositRequest, CryptoWithdrawalRequest, InvoiceCreateRequest,
    InvoiceResponse, EscrowCreateRequest, EscrowResponse
)
from .auth import get_current_user
from ...services.wallet.wallet_service import wallet_service
from ...services.wallet.multi_currency_service import multi_currency_service
from ...services.wallet.escrow_service import escrow_service
from ...services.wallet.payment_methods_service import payment_methods_service
from ...services.payment import payment_service
from ...services.payment.crypto_payment_service import crypto_payment_service
from ...services.payment.invoice_service import invoice_service

router = APIRouter()
logger = get_logger(__name__)


@router.get("/", response_model=WalletResponse)
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Wallet:
    """Get current user's wallet."""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == current_user.id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        # Create wallet if doesn't exist
        wallet = Wallet(user_id=current_user.id)
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)
        
        logger.info(f"Created wallet for user {current_user.username}")
    
    return wallet


@router.post("/deposit", response_model=WalletTransactionResponse)
async def deposit_funds(
    deposit_data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletTransaction:
    """Deposit funds to wallet."""
    # Get wallet
    wallet = await get_wallet(current_user, db)
    
    # Validate amount
    if deposit_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    # Create transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        type="deposit",
        amount=deposit_data.amount,
        currency=deposit_data.currency,
        status="pending",
        description=f"Deposit via {deposit_data.payment_method}",
        metadata={
            "payment_method": deposit_data.payment_method,
            "reference": deposit_data.reference
        }
    )
    db.add(transaction)
    
    try:
        # Process deposit (simplified - in production, integrate with payment provider)
        if deposit_data.payment_method == "test":
            # Test mode - instantly approve
            wallet.balance_usd += deposit_data.amount
            transaction.status = "completed"
            transaction.transaction_hash = str(uuid.uuid4())
        else:
            # Production - would integrate with Stripe, PayPal, etc.
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Payment method not implemented yet"
            )
        
        await db.commit()
        await db.refresh(transaction)
        
        logger.info(
            f"Deposit completed: {transaction.id}, "
            f"user: {current_user.username}, "
            f"amount: {deposit_data.amount} {deposit_data.currency}"
        )
        
        return transaction
        
    except Exception as e:
        transaction.status = "failed"
        await db.commit()
        
        logger.error(f"Deposit failed: {str(e)}")
        raise


@router.post("/withdraw", response_model=WalletTransactionResponse)
async def withdraw_funds(
    withdrawal_data: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletTransaction:
    """Withdraw funds from wallet."""
    # Get wallet
    wallet = await get_wallet(current_user, db)
    
    # Validate amount
    if withdrawal_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    if wallet.balance_usd < withdrawal_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Check daily limit
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_withdrawals_result = await db.execute(
        select(func.sum(WalletTransaction.amount))
        .where(
            and_(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.type == "withdrawal",
                WalletTransaction.status == "completed",
                WalletTransaction.created_at >= today_start
            )
        )
    )
    daily_total = abs(daily_withdrawals_result.scalar() or 0)
    
    if daily_total + withdrawal_data.amount > wallet.daily_spending_limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Daily withdrawal limit exceeded. Limit: ${wallet.daily_spending_limit}"
        )
    
    # Create transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        type="withdrawal",
        amount=-withdrawal_data.amount,  # Negative for withdrawal
        currency="USD",
        status="pending",
        description=f"Withdrawal to {withdrawal_data.destination}",
        metadata={
            "destination": withdrawal_data.destination,
            "destination_type": withdrawal_data.destination_type
        }
    )
    db.add(transaction)
    
    try:
        # Process withdrawal
        wallet.balance_usd -= withdrawal_data.amount
        wallet.total_spent += withdrawal_data.amount
        
        # In production, would process actual withdrawal
        transaction.status = "completed"
        transaction.transaction_hash = str(uuid.uuid4())
        
        await db.commit()
        await db.refresh(transaction)
        
        logger.info(
            f"Withdrawal completed: {transaction.id}, "
            f"user: {current_user.username}, "
            f"amount: ${withdrawal_data.amount}"
        )
        
        return transaction
        
    except Exception as e:
        transaction.status = "failed"
        await db.commit()
        
        logger.error(f"Withdrawal failed: {str(e)}")
        raise


@router.post("/transfer", response_model=WalletTransactionResponse)
async def transfer_funds(
    transfer_data: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WalletTransaction:
    """Transfer funds to another user."""
    # Get sender wallet
    sender_wallet = await get_wallet(current_user, db)
    
    # Validate
    if transfer_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    if sender_wallet.balance_usd < transfer_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Find recipient
    recipient_result = await db.execute(
        select(User).where(User.username == transfer_data.recipient_username)
    )
    recipient = recipient_result.scalar_one_or_none()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found"
        )
    
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to yourself"
        )
    
    # Get recipient wallet
    recipient_wallet_result = await db.execute(
        select(Wallet).where(Wallet.user_id == recipient.id)
    )
    recipient_wallet = recipient_wallet_result.scalar_one_or_none()
    
    if not recipient_wallet:
        recipient_wallet = Wallet(user_id=recipient.id)
        db.add(recipient_wallet)
    
    # Create transactions
    sender_transaction = WalletTransaction(
        wallet_id=sender_wallet.id,
        type="transfer",
        amount=-transfer_data.amount,
        currency="USD",
        status="pending",
        description=f"Transfer to @{recipient.username}",
        reference_type="user_transfer",
        reference_id=recipient.id,
        metadata={"note": transfer_data.note}
    )
    
    recipient_transaction = WalletTransaction(
        wallet_id=recipient_wallet.id,
        type="transfer",
        amount=transfer_data.amount,
        currency="USD",
        status="pending",
        description=f"Transfer from @{current_user.username}",
        reference_type="user_transfer",
        reference_id=current_user.id,
        metadata={"note": transfer_data.note}
    )
    
    db.add(sender_transaction)
    db.add(recipient_transaction)
    
    try:
        # Process transfer
        sender_wallet.balance_usd -= transfer_data.amount
        recipient_wallet.balance_usd += transfer_data.amount
        
        sender_transaction.status = "completed"
        recipient_transaction.status = "completed"
        sender_transaction.transaction_hash = str(uuid.uuid4())
        recipient_transaction.transaction_hash = sender_transaction.transaction_hash
        
        await db.commit()
        await db.refresh(sender_transaction)
        
        logger.info(
            f"Transfer completed: {sender_transaction.id}, "
            f"from: {current_user.username}, "
            f"to: {recipient.username}, "
            f"amount: ${transfer_data.amount}"
        )
        
        return sender_transaction
        
    except Exception as e:
        sender_transaction.status = "failed"
        recipient_transaction.status = "failed"
        await db.commit()
        
        logger.error(f"Transfer failed: {str(e)}")
        raise


@router.get("/transactions", response_model=List[WalletTransactionResponse])
async def get_transactions(
    transaction_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[WalletTransaction]:
    """Get wallet transaction history."""
    # Get wallet
    wallet = await get_wallet(current_user, db)
    
    # Build query
    query = select(WalletTransaction).where(
        WalletTransaction.wallet_id == wallet.id
    )
    
    if transaction_type:
        query = query.where(WalletTransaction.type == transaction_type)
    
    if status:
        query = query.where(WalletTransaction.status == status)
    
    query = query.order_by(WalletTransaction.created_at.desc())
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return transactions


@router.get("/dashboard", response_model=WalletDashboardResponse)
async def get_wallet_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get comprehensive wallet dashboard data."""
    # Get wallet
    wallet = await get_wallet(current_user, db)
    
    # Get recent transactions
    transactions_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(10)
    )
    transactions = transactions_result.scalars().all()
    
    # Calculate monthly stats
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get monthly income and expenses
    stats_result = await db.execute(
        select(
            func.sum(func.case(
                (WalletTransaction.amount > 0, WalletTransaction.amount),
                else_=0
            )).label("income"),
            func.sum(func.case(
                (WalletTransaction.amount < 0, func.abs(WalletTransaction.amount)),
                else_=0
            )).label("expenses")
        )
        .where(
            and_(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.status == "completed",
                WalletTransaction.created_at >= month_start
            )
        )
    )
    monthly_stats = stats_result.first()
    
    # Get total stats
    total_stats_result = await db.execute(
        select(
            WalletTransaction.type,
            func.sum(func.abs(WalletTransaction.amount)).label("total")
        )
        .where(
            and_(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.status == "completed"
            )
        )
        .group_by(WalletTransaction.type)
    )
    
    total_by_type = {}
    for row in total_stats_result:
        total_by_type[row.type] = float(row.total or 0)
    
    return {
        "balance": wallet.balance_usd,
        "currency": "USD",
        "transactions": transactions,
        "stats": {
            "totalDeposits": total_by_type.get("deposit", 0),
            "totalWithdrawals": total_by_type.get("withdrawal", 0),
            "totalTransfers": total_by_type.get("transfer", 0),
            "monthlyIncome": float(monthly_stats.income or 0) if monthly_stats else 0,
            "monthlyExpenses": float(monthly_stats.expenses or 0) if monthly_stats else 0,
        }
    }


@router.post("/validate-recipient", response_model=ValidateRecipientResponse)
async def validate_recipient(
    request: ValidateRecipientRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Validate a transfer recipient."""
    # Find recipient based on type
    query = select(User)
    
    if request.type == "username":
        query = query.where(User.username == request.recipient)
    elif request.type == "email":
        query = query.where(User.email == request.recipient)
    else:
        return {"valid": False, "recipient": None}
    
    result = await db.execute(query)
    recipient = result.scalar_one_or_none()
    
    return {
        "valid": recipient is not None and recipient.id != current_user.id,
        "recipient": recipient.username if recipient else None
    }


@router.get("/transfer/recent-recipients", response_model=List[Dict[str, Any]])
async def get_recent_recipients(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get list of recent transfer recipients."""
    wallet = await get_wallet(current_user, db)
    
    # Get recent transfer transactions
    recent_transfers_result = await db.execute(
        select(
            WalletTransaction.reference_id,
            func.max(WalletTransaction.created_at).label("last_transfer")
        )
        .where(
            and_(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.type == "transfer",
                WalletTransaction.amount < 0,  # Outgoing transfers
                WalletTransaction.status == "completed",
                WalletTransaction.reference_id.isnot(None)
            )
        )
        .group_by(WalletTransaction.reference_id)
        .order_by(func.max(WalletTransaction.created_at).desc())
        .limit(5)
    )
    
    recent_recipients = []
    for row in recent_transfers_result:
        # Get recipient user info
        user_result = await db.execute(
            select(User).where(User.id == row.reference_id)
        )
        recipient_user = user_result.scalar_one_or_none()
        
        if recipient_user:
            recent_recipients.append({
                "id": str(recipient_user.id),
                "username": recipient_user.username,
                "email": recipient_user.email,
                "lastTransfer": row.last_transfer.strftime("%Y-%m-%d"),
                "avatar": recipient_user.avatar_url
            })
    
    return recent_recipients


@router.get("/stats/{period}", response_model=WalletStatsResponse)
async def get_wallet_stats(
    period: str = Path(regex="^(day|week|month|year|all)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get wallet statistics."""
    wallet = await get_wallet(current_user, db)
    
    # Calculate period start
    now = datetime.utcnow()
    if period == "day":
        period_start = now - timedelta(days=1)
    elif period == "week":
        period_start = now - timedelta(weeks=1)
    elif period == "month":
        period_start = now - timedelta(days=30)
    elif period == "year":
        period_start = now - timedelta(days=365)
    else:
        period_start = datetime.min
    
    # Get transaction stats
    stats_result = await db.execute(
        select(
            WalletTransaction.type,
            func.count(WalletTransaction.id).label("count"),
            func.sum(func.abs(WalletTransaction.amount)).label("total")
        )
        .where(
            and_(
                WalletTransaction.wallet_id == wallet.id,
                WalletTransaction.status == "completed",
                WalletTransaction.created_at >= period_start
            )
        )
        .group_by(WalletTransaction.type)
    )
    
    stats_by_type = {}
    for row in stats_result:
        stats_by_type[row.type] = {
            "count": row.count,
            "total": float(row.total or 0)
        }
    
    return WalletStatsResponse(
        current_balance=wallet.balance_usd,
        total_earned=wallet.total_earned,
        total_spent=wallet.total_spent,
        daily_limit=wallet.daily_spending_limit,
        monthly_limit=wallet.monthly_spending_limit,
        period=period,
        transactions_by_type=stats_by_type,
        deposits=stats_by_type.get("deposit", {"count": 0, "total": 0}),
        withdrawals=stats_by_type.get("withdrawal", {"count": 0, "total": 0}),
        purchases=stats_by_type.get("purchase", {"count": 0, "total": 0}),
        earnings=stats_by_type.get("earning", {"count": 0, "total": 0})
    )

# Payment Methods Endpoints

@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[PaymentMethod]:
    """Get user's payment methods."""
    return await payment_methods_service.get_payment_methods(
        user_id=current_user.id,
        db=db
    )


@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    payment_method_data: PaymentMethodRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaymentMethod:
    """Add a new payment method."""
    return await payment_methods_service.add_payment_method(
        user_id=current_user.id,
        type=payment_method_data.type,
        details=payment_method_data.details,
        is_default=payment_method_data.is_default,
        db=db
    )


@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Delete a payment method."""
    await payment_methods_service.delete_payment_method(
        payment_method_id=payment_method_id,
        user_id=current_user.id,
        db=db
    )
    return {"message": "Payment method deleted successfully"}


# Crypto Payment Endpoints

@router.post("/deposit/crypto", response_model=Dict[str, Any])
async def create_crypto_deposit(
    deposit_data: CryptoDepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a cryptocurrency deposit request."""
    return await crypto_payment_service.create_crypto_payment(
        user_id=current_user.id,
        amount_usd=deposit_data.amount_usd,
        crypto_currency=deposit_data.currency,
        description="Wallet deposit",
        db=db
    )


@router.post("/withdraw/crypto", response_model=Dict[str, Any])
async def withdraw_crypto(
    withdrawal_data: CryptoWithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Withdraw cryptocurrency to external address."""
    # Check wallet balance
    wallet = await get_wallet(current_user, db)
    
    # Convert crypto amount to USD for balance check
    usd_amount = await multi_currency_service.convert_currency(
        withdrawal_data.amount,
        withdrawal_data.currency,
        "USD"
    )
    
    if wallet.balance_usd < float(usd_amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    return await crypto_payment_service.process_withdrawal(
        user_id=current_user.id,
        amount=withdrawal_data.amount,
        crypto_currency=withdrawal_data.currency,
        destination_address=withdrawal_data.destination_address,
        db=db
    )


# Multi-Currency Support

@router.get("/balances/{currency}")
async def get_balance_in_currency(
    currency: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get wallet balances converted to specified currency."""
    wallet = await get_wallet(current_user, db)
    return await multi_currency_service.get_wallet_balances_in_currency(
        wallet=wallet,
        target_currency=currency
    )


@router.get("/exchange-rates")
async def get_exchange_rates() -> Dict[str, float]:
    """Get current exchange rates."""
    return await multi_currency_service.get_exchange_rates()


# Escrow Endpoints

@router.post("/escrow", response_model=EscrowResponse)
async def create_escrow(
    escrow_data: EscrowCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create an escrow transaction for marketplace purchase."""
    escrow = await escrow_service.create_escrow(
        buyer_id=current_user.id,
        seller_id=escrow_data.seller_id,
        item_id=escrow_data.item_id,
        amount=escrow_data.amount,
        currency=escrow_data.currency,
        description=escrow_data.description,
        db=db
    )
    
    return {
        "escrow_id": escrow.id,
        "status": escrow.status,
        "amount": float(escrow.amount),
        "currency": escrow.currency,
        "expires_at": escrow.expires_at
    }


@router.post("/escrow/{escrow_id}/release")
async def release_escrow(
    escrow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Release escrow funds to seller."""
    return await escrow_service.release_escrow(
        escrow_id=escrow_id,
        released_by=current_user.id,
        db=db
    )


@router.post("/escrow/{escrow_id}/confirm-delivery")
async def confirm_delivery(
    escrow_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Buyer confirms delivery of item."""
    escrow = await escrow_service.confirm_delivery(
        escrow_id=escrow_id,
        buyer_id=current_user.id,
        db=db
    )
    
    return {
        "escrow_id": escrow.id,
        "status": escrow.status,
        "buyer_confirmed": escrow.buyer_confirmed,
        "confirmed_at": escrow.confirmed_at
    }


@router.post("/escrow/{escrow_id}/dispute")
async def dispute_escrow(
    escrow_id: str,
    reason: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Initiate a dispute for escrow transaction."""
    escrow = await escrow_service.dispute_escrow(
        escrow_id=escrow_id,
        disputed_by=current_user.id,
        reason=reason,
        db=db
    )
    
    return {
        "escrow_id": escrow.id,
        "status": escrow.status,
        "disputed_at": escrow.disputed_at,
        "dispute_deadline": escrow.dispute_deadline
    }


# Invoice Endpoints

@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Create a new invoice."""
    invoice = await invoice_service.create_invoice(
        user_id=current_user.id,
        customer_info=invoice_data.customer_info,
        items=invoice_data.items,
        currency=invoice_data.currency,
        due_days=invoice_data.due_days,
        notes=invoice_data.notes,
        db=db
    )
    
    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total_amount": float(invoice.total_amount),
        "currency": invoice.currency,
        "status": invoice.status,
        "due_date": invoice.due_date
    }


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    message: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Send invoice to customer."""
    return await invoice_service.send_invoice(
        invoice_id=invoice_id,
        user_id=current_user.id,
        message=message,
        db=db
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Get user's invoices."""
    invoices = await invoice_service.get_invoices(
        user_id=current_user.id,
        status=status,
        limit=limit,
        offset=offset,
        db=db
    )
    
    return [
        {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "customer_name": invoice.customer_name,
            "total_amount": float(invoice.total_amount),
            "currency": invoice.currency,
            "status": invoice.status,
            "due_date": invoice.due_date,
            "created_at": invoice.created_at
        }
        for invoice in invoices
    ]


# Balance Hold/Release for Orders

@router.post("/hold-balance")
async def hold_balance(
    amount: Decimal = Body(...),
    currency: str = Body(default="USD"),
    reference_id: str = Body(...),
    description: str = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Hold balance for pending order."""
    wallet = await get_wallet(current_user, db)
    
    # Check available balance
    if currency == "USD" and wallet.balance_usd < float(amount):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Create hold transaction
    hold_transaction = WalletTransaction(
        wallet_id=wallet.id,
        type="hold",
        amount=-float(amount),
        currency=currency,
        status="pending",
        description=description,
        reference_type="order",
        reference_id=reference_id
    )
    
    # Update wallet balance
    wallet.balance_usd -= float(amount)
    
    db.add(hold_transaction)
    await db.commit()
    
    return {
        "transaction_id": hold_transaction.id,
        "amount_held": float(amount),
        "currency": currency,
        "reference_id": reference_id
    }


@router.post("/release-hold/{transaction_id}")
async def release_hold(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Release held balance."""
    # Get hold transaction
    result = await db.execute(
        select(WalletTransaction).where(
            and_(
                WalletTransaction.id == transaction_id,
                WalletTransaction.type == "hold",
                WalletTransaction.status == "pending"
            )
        )
    )
    hold_transaction = result.scalar_one_or_none()
    
    if not hold_transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hold transaction not found"
        )
    
    # Verify ownership
    wallet = await get_wallet(current_user, db)
    if hold_transaction.wallet_id != wallet.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized"
        )
    
    # Release hold
    hold_transaction.status = "cancelled"
    wallet.balance_usd += abs(hold_transaction.amount)
    
    await db.commit()
    
    return {
        "transaction_id": transaction_id,
        "amount_released": abs(hold_transaction.amount),
        "status": "released"
    }
