"""Multi-currency support for wallet service."""

from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session
import aiohttp

from ...shared.models.wallet import Wallet, WalletTransaction
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import ValidationError
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)


class MultiCurrencyService:
    """Service for handling multi-currency operations."""
    
    def __init__(self):
        self.supported_currencies = {
            "USD": {"symbol": "$", "decimals": 2, "type": "fiat"},
            "EUR": {"symbol": "€", "decimals": 2, "type": "fiat"},
            "GBP": {"symbol": "£", "decimals": 2, "type": "fiat"},
            "BTC": {"symbol": "₿", "decimals": 8, "type": "crypto"},
            "ETH": {"symbol": "Ξ", "decimals": 18, "type": "crypto"},
            "USDT": {"symbol": "₮", "decimals": 6, "type": "crypto"},
            "TOKENS": {"symbol": "TKN", "decimals": 0, "type": "platform"},
            "CREDITS": {"symbol": "CR", "decimals": 0, "type": "platform"}
        }
        self.base_currency = "USD"
        self._exchange_rates_cache = {}
        self._last_rate_update = None
    
    async def get_exchange_rates(self, force_refresh: bool = False) -> Dict[str, float]:
        """Get current exchange rates."""
        cache_key = "exchange_rates"
        
        # Check cache first
        if not force_refresh:
            cached_rates = await cache_manager.get(cache_key)
            if cached_rates:
                return cached_rates
        
        try:
            # Fetch from external API (mock for now)
            rates = {
                "USD": 1.0,
                "EUR": 0.85,
                "GBP": 0.73,
                "BTC": 0.000024,
                "ETH": 0.00031,
                "USDT": 1.0,
                "TOKENS": 10.0,  # 1 USD = 10 TOKENS
                "CREDITS": 100.0  # 1 USD = 100 CREDITS
            }
            
            # Cache for 5 minutes
            await cache_manager.set(cache_key, rates, ttl=300)
            
            return rates
            
        except Exception as e:
            logger.error(f"Error fetching exchange rates: {str(e)}")
            # Return fallback rates
            return self._get_fallback_rates()
    
    async def convert_currency(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str
    ) -> Decimal:
        """Convert amount between currencies."""
        if from_currency == to_currency:
            return amount
        
        if from_currency not in self.supported_currencies:
            raise ValidationError(f"Unsupported currency: {from_currency}")
        
        if to_currency not in self.supported_currencies:
            raise ValidationError(f"Unsupported currency: {to_currency}")
        
        rates = await self.get_exchange_rates()
        
        # Convert to USD first, then to target currency
        usd_amount = amount / Decimal(str(rates[from_currency]))
        target_amount = usd_amount * Decimal(str(rates[to_currency]))
        
        # Apply decimal precision
        decimals = self.supported_currencies[to_currency]["decimals"]
        return round(target_amount, decimals)
    
    async def get_wallet_balances_in_currency(
        self,
        wallet: Wallet,
        target_currency: str = "USD"
    ) -> Dict[str, Any]:
        """Get all wallet balances converted to target currency."""
        rates = await self.get_exchange_rates()
        
        balances = {
            "USD": Decimal(str(wallet.balance_usd)),
            "TOKENS": Decimal(str(wallet.balance_tokens)),
            "CREDITS": Decimal(str(wallet.balance_credits))
        }
        
        total_in_target = Decimal("0")
        converted_balances = {}
        
        for currency, balance in balances.items():
            if balance > 0:
                converted = await self.convert_currency(
                    balance, currency, target_currency
                )
                converted_balances[currency] = {
                    "original": balance,
                    "converted": converted,
                    "rate": rates[currency]
                }
                total_in_target += converted
        
        return {
            "balances": converted_balances,
            "total": total_in_target,
            "currency": target_currency,
            "rates": rates,
            "updated_at": datetime.utcnow()
        }
    
    def validate_amount(self, amount: Decimal, currency: str) -> bool:
        """Validate amount for a specific currency."""
        if currency not in self.supported_currencies:
            return False
        
        currency_info = self.supported_currencies[currency]
        decimals = currency_info["decimals"]
        
        # Check decimal places
        if amount.as_tuple().exponent < -decimals:
            return False
        
        # Check minimum amounts
        min_amounts = {
            "USD": Decimal("0.01"),
            "EUR": Decimal("0.01"),
            "GBP": Decimal("0.01"),
            "BTC": Decimal("0.00000001"),
            "ETH": Decimal("0.000000000000000001"),
            "USDT": Decimal("0.000001"),
            "TOKENS": Decimal("1"),
            "CREDITS": Decimal("1")
        }
        
        return amount >= min_amounts.get(currency, Decimal("0"))
    
    def format_amount(self, amount: Decimal, currency: str) -> str:
        """Format amount with proper currency symbol and decimals."""
        if currency not in self.supported_currencies:
            return f"{amount} {currency}"
        
        info = self.supported_currencies[currency]
        symbol = info["symbol"]
        decimals = info["decimals"]
        
        formatted = f"{amount:.{decimals}f}"
        
        if info["type"] == "fiat":
            return f"{symbol}{formatted}"
        else:
            return f"{formatted} {symbol}"
    
    def _get_fallback_rates(self) -> Dict[str, float]:
        """Get fallback exchange rates when API is unavailable."""
        return {
            "USD": 1.0,
            "EUR": 0.85,
            "GBP": 0.73,
            "BTC": 0.000024,
            "ETH": 0.00031,
            "USDT": 1.0,
            "TOKENS": 10.0,
            "CREDITS": 100.0
        }
    
    async def get_crypto_addresses(self, wallet: Wallet) -> Dict[str, str]:
        """Get cryptocurrency deposit addresses for wallet."""
        # In production, generate unique addresses per currency
        return {
            "BTC": f"bc1q{secrets.token_hex(20)}",
            "ETH": wallet.eth_address or f"0x{secrets.token_hex(20)}",
            "USDT": wallet.eth_address or f"0x{secrets.token_hex(20)}"  # ERC-20
        }


# Create singleton instance
multi_currency_service = MultiCurrencyService()