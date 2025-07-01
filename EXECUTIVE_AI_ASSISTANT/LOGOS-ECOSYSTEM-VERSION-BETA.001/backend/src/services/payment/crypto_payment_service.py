"""Cryptocurrency payment processing service."""

from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime, timedelta
import asyncio
import aiohttp
from web3 import Web3
from eth_account import Account
# import bitcoin  # Using python-bitcoinlib instead
from sqlalchemy.orm import Session

from ...shared.models.wallet import WalletTransaction, CryptoPayment
from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
settings = get_settings()
from ...infrastructure.cache import cache_manager
from ..tasks.email import send_email as send_payment_confirmation_email

logger = get_logger(__name__)


class CryptoPaymentService:
    """Service for processing cryptocurrency payments."""
    
    def __init__(self):
        # Initialize Web3 for Ethereum
        self.w3 = Web3(Web3.HTTPProvider(settings.ETH_NODE_URL))
        
        # Supported cryptocurrencies
        self.supported_cryptos = {
            "BTC": {
                "name": "Bitcoin",
                "decimals": 8,
                "confirmation_blocks": 3,
                "network": "mainnet" if settings.ENVIRONMENT == "production" else "testnet"
            },
            "ETH": {
                "name": "Ethereum",
                "decimals": 18,
                "confirmation_blocks": 12,
                "network": "mainnet" if settings.ENVIRONMENT == "production" else "goerli"
            },
            "USDT": {
                "name": "Tether",
                "decimals": 6,
                "confirmation_blocks": 12,
                "contract": settings.USDT_CONTRACT_ADDRESS,
                "network": "ethereum"
            },
            "USDC": {
                "name": "USD Coin",
                "decimals": 6,
                "confirmation_blocks": 12,
                "contract": settings.USDC_CONTRACT_ADDRESS,
                "network": "ethereum"
            }
        }
        
        # Payment expiration time
        self.payment_expiration_minutes = 30
        
        # Exchange rate cache duration
        self.rate_cache_duration = 300  # 5 minutes
    
    async def create_crypto_payment(
        self,
        user_id: str,
        amount_usd: Decimal,
        crypto_currency: str,
        description: str,
        db: Session
    ) -> Dict[str, Any]:
        """Create a cryptocurrency payment request."""
        try:
            if crypto_currency not in self.supported_cryptos:
                raise ValueError(f"Unsupported cryptocurrency: {crypto_currency}")
            
            # Get current exchange rate
            exchange_rate = await self._get_exchange_rate(crypto_currency, "USD")
            crypto_amount = amount_usd / exchange_rate
            
            # Generate unique payment address
            if crypto_currency in ["BTC"]:
                payment_address = await self._generate_btc_address(user_id)
            elif crypto_currency in ["ETH", "USDT", "USDC"]:
                payment_address = await self._generate_eth_address(user_id)
            else:
                raise ValueError(f"Address generation not implemented for {crypto_currency}")
            
            # Create payment record
            crypto_payment = CryptoPayment(
                user_id=user_id,
                crypto_currency=crypto_currency,
                amount_crypto=crypto_amount,
                amount_usd=amount_usd,
                exchange_rate=exchange_rate,
                payment_address=payment_address,
                description=description,
                status="pending",
                expires_at=datetime.utcnow() + timedelta(minutes=self.payment_expiration_minutes)
            )
            
            db.add(crypto_payment)
            db.commit()
            db.refresh(crypto_payment)
            
            # Start monitoring for payment
            asyncio.create_task(
                self._monitor_payment(crypto_payment.id, crypto_currency, payment_address)
            )
            
            logger.info(
                f"Created crypto payment {crypto_payment.id} for {crypto_amount} {crypto_currency}"
            )
            
            return {
                "payment_id": crypto_payment.id,
                "address": payment_address,
                "amount": float(crypto_amount),
                "currency": crypto_currency,
                "amount_usd": float(amount_usd),
                "exchange_rate": float(exchange_rate),
                "expires_at": crypto_payment.expires_at,
                "qr_code": self._generate_payment_qr(payment_address, crypto_amount, crypto_currency)
            }
            
        except Exception as e:
            logger.error(f"Error creating crypto payment: {str(e)}")
            raise
    
    async def check_payment_status(
        self,
        payment_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Check the status of a crypto payment."""
        payment = db.query(CryptoPayment).filter_by(id=payment_id).first()
        if not payment:
            raise ValueError("Payment not found")
        
        # Check if expired
        if payment.expires_at < datetime.utcnow() and payment.status == "pending":
            payment.status = "expired"
            db.commit()
        
        # Check blockchain for confirmations
        if payment.status == "pending":
            confirmations = await self._check_confirmations(
                payment.crypto_currency,
                payment.payment_address,
                payment.amount_crypto
            )
            
            if confirmations > 0:
                payment.confirmations = confirmations
                required_confirmations = self.supported_cryptos[payment.crypto_currency]["confirmation_blocks"]
                
                if confirmations >= required_confirmations:
                    payment.status = "confirmed"
                    payment.confirmed_at = datetime.utcnow()
                    
                    # Credit user wallet
                    await self._credit_wallet(payment, db)
                
                db.commit()
        
        return {
            "payment_id": payment.id,
            "status": payment.status,
            "confirmations": payment.confirmations,
            "required_confirmations": self.supported_cryptos[payment.crypto_currency]["confirmation_blocks"],
            "amount": float(payment.amount_crypto),
            "currency": payment.crypto_currency,
            "transaction_hash": payment.transaction_hash
        }
    
    async def process_withdrawal(
        self,
        user_id: str,
        amount: Decimal,
        crypto_currency: str,
        destination_address: str,
        db: Session
    ) -> Dict[str, Any]:
        """Process a cryptocurrency withdrawal."""
        try:
            if crypto_currency not in self.supported_cryptos:
                raise ValueError(f"Unsupported cryptocurrency: {crypto_currency}")
            
            # Validate destination address
            if not await self._validate_address(crypto_currency, destination_address):
                raise ValueError("Invalid destination address")
            
            # Calculate fees
            network_fee = await self._estimate_network_fee(crypto_currency)
            total_amount = amount + network_fee
            
            # Create withdrawal transaction
            if crypto_currency == "BTC":
                tx_hash = await self._send_btc_transaction(
                    destination_address,
                    amount,
                    network_fee
                )
            elif crypto_currency in ["ETH", "USDT", "USDC"]:
                tx_hash = await self._send_eth_transaction(
                    destination_address,
                    amount,
                    crypto_currency,
                    network_fee
                )
            else:
                raise ValueError(f"Withdrawal not implemented for {crypto_currency}")
            
            # Record transaction
            withdrawal = WalletTransaction(
                wallet_id=user_id,  # Should be wallet_id
                type="withdrawal",
                amount=-float(total_amount),
                currency=crypto_currency,
                status="pending",
                transaction_hash=tx_hash,
                description=f"Withdrawal to {destination_address[:10]}...",
                metadata={
                    "destination": destination_address,
                    "network_fee": float(network_fee),
                    "crypto_currency": crypto_currency
                }
            )
            
            db.add(withdrawal)
            db.commit()
            
            logger.info(
                f"Processed withdrawal {tx_hash} for {amount} {crypto_currency} to {destination_address}"
            )
            
            return {
                "transaction_hash": tx_hash,
                "amount": float(amount),
                "network_fee": float(network_fee),
                "total": float(total_amount),
                "currency": crypto_currency,
                "destination": destination_address,
                "status": "pending"
            }
            
        except Exception as e:
            logger.error(f"Error processing withdrawal: {str(e)}")
            raise
    
    async def _get_exchange_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """Get current exchange rate from cache or API."""
        cache_key = f"exchange_rate:{from_currency}:{to_currency}"
        
        # Check cache
        cached_rate = await cache_manager.get(cache_key)
        if cached_rate:
            return Decimal(str(cached_rate))
        
        # Fetch from API
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://api.coingecko.com/api/v3/simple/price"
                params = {
                    "ids": self._get_coingecko_id(from_currency),
                    "vs_currencies": to_currency.lower()
                }
                
                async with session.get(url, params=params) as response:
                    data = await response.json()
                    rate = data[self._get_coingecko_id(from_currency)][to_currency.lower()]
                    
                    # Cache the rate
                    await cache_manager.set(cache_key, rate, ttl=self.rate_cache_duration)
                    
                    return Decimal(str(rate))
                    
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {str(e)}")
            # Return fallback rates
            fallback_rates = {
                "BTC": 45000,
                "ETH": 3000,
                "USDT": 1,
                "USDC": 1
            }
            return Decimal(str(fallback_rates.get(from_currency, 1)))
    
    async def _generate_btc_address(self, user_id: str) -> str:
        """Generate a Bitcoin address for the user."""
        # In production, use HD wallet derivation
        # For now, return a mock address
        if settings.PRODUCTION:
            # Use bitcoin library to generate real address
            private_key = bitcoin.random_key()
            public_key = bitcoin.privtopub(private_key)
            address = bitcoin.pubtoaddr(public_key)
            
            # Store private key securely
            await self._store_private_key(user_id, "BTC", private_key, address)
            
            return address
        else:
            return f"tb1q{user_id[:20]}testbtcaddress"
    
    async def _generate_eth_address(self, user_id: str) -> str:
        """Generate an Ethereum address for the user."""
        if settings.PRODUCTION:
            # Generate new account
            account = Account.create()
            address = account.address
            private_key = account.key.hex()
            
            # Store private key securely
            await self._store_private_key(user_id, "ETH", private_key, address)
            
            return address
        else:
            return f"0x{user_id[:20]}testethaddress"
    
    async def _monitor_payment(self, payment_id: str, currency: str, address: str):
        """Monitor blockchain for incoming payment."""
        # This would run as a background task
        # In production, use webhooks from blockchain APIs
        pass
    
    async def _check_confirmations(self, currency: str, address: str, amount: Decimal) -> int:
        """Check number of confirmations for a payment."""
        # In production, query blockchain
        # For now, return mock data
        return 0
    
    async def _validate_address(self, currency: str, address: str) -> bool:
        """Validate a cryptocurrency address."""
        if currency == "BTC":
            # Basic Bitcoin address validation
            return address.startswith(("1", "3", "bc1"))
        elif currency in ["ETH", "USDT", "USDC"]:
            # Ethereum address validation
            return self.w3.is_address(address)
        return False
    
    async def _estimate_network_fee(self, currency: str) -> Decimal:
        """Estimate network fee for transaction."""
        # In production, query current network fees
        fees = {
            "BTC": Decimal("0.0001"),
            "ETH": Decimal("0.002"),
            "USDT": Decimal("5"),
            "USDC": Decimal("5")
        }
        return fees.get(currency, Decimal("0"))
    
    async def _send_btc_transaction(
        self,
        destination: str,
        amount: Decimal,
        fee: Decimal
    ) -> str:
        """Send Bitcoin transaction."""
        # In production, use bitcoin library
        # For now, return mock tx hash
        return f"btc_tx_{datetime.utcnow().timestamp()}"
    
    async def _send_eth_transaction(
        self,
        destination: str,
        amount: Decimal,
        currency: str,
        fee: Decimal
    ) -> str:
        """Send Ethereum or ERC-20 transaction."""
        # In production, use web3.py
        # For now, return mock tx hash
        return f"eth_tx_{datetime.utcnow().timestamp()}"
    
    def _generate_payment_qr(self, address: str, amount: Decimal, currency: str) -> str:
        """Generate QR code for payment."""
        # Generate payment URI
        if currency == "BTC":
            uri = f"bitcoin:{address}?amount={amount}"
        elif currency == "ETH":
            uri = f"ethereum:{address}?value={amount}"
        else:
            uri = address
        
        # In production, generate actual QR code
        return uri
    
    def _get_coingecko_id(self, currency: str) -> str:
        """Get CoinGecko ID for currency."""
        mapping = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "USDT": "tether",
            "USDC": "usd-coin"
        }
        return mapping.get(currency, currency.lower())
    
    async def _store_private_key(self, user_id: str, currency: str, private_key: str, address: str):
        """Securely store private key."""
        # In production, use HSM or secure key management
        # This is a placeholder
        pass
    
    async def _credit_wallet(self, payment: CryptoPayment, db: Session):
        """Credit user wallet after payment confirmation."""
        # Convert crypto to USD and credit wallet
        from ..wallet.wallet_service import wallet_service
        
        await wallet_service.add_funds(
            payment.user_id,
            float(payment.amount_usd),
            "USD",
            f"Crypto deposit: {payment.amount_crypto} {payment.crypto_currency}",
            db
        )
        
        # Send confirmation email
        await send_payment_confirmation_email(
            payment.user_id,
            payment.amount_usd,
            payment.crypto_currency,
            payment.transaction_hash
        )


# Create singleton instance
crypto_payment_service = CryptoPaymentService()