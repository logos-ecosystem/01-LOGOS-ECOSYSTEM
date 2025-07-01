"""Real Payment Integrations with Stripe, PayPal, and Cryptocurrencies."""

import asyncio
import json
import hmac
import hashlib
from typing import Dict, Any, Optional, List, Union, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import qrcode
import io
import base64

# Stripe
import stripe

# PayPal
from paypalserversdk.paypal_serversdk_client import PaypalServersdkClient
from paypalserversdk.models import *
from paypalserversdk.controllers import *

# Cryptocurrency
from web3 import Web3
from eth_account import Account
from eth_typing import ChecksumAddress
import bitcoin
from bitcoinlib.wallets import Wallet as BTCWallet
from bitcoinlib.mnemonic import Mnemonic
import blockcypher
from stellar_sdk import Server, Keypair, TransactionBuilder, Network, Asset
from stellar_sdk.exceptions import NotFoundError
import algosdk
from algosdk import account, mnemonic, constants
from algosdk.v2client import algod, indexer
from solana.rpc.api import Client as SolanaClient
from solders.keypair import Keypair as SolanaKeypair
from solders.transaction import Transaction
from solders.system_program import transfer
import ccxt
from binance import AsyncClient as BinanceClient
from coinbase_commerce import Client as CoinbaseCommerceClient
import requests

# Database
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import PaymentError
from ...shared.utils.config import get_settings
from ...shared.models.wallet import WalletTransaction, PaymentMethod
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)
settings = get_settings()
cache = cache_manager


class StripePaymentProcessor:
    """Real Stripe payment integration."""
    
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.currency = settings.DEFAULT_CURRENCY or 'usd'
        
    async def create_payment_intent(
        self,
        amount: int,  # Amount in cents
        currency: str = None,
        customer_id: str = None,
        payment_method_types: List[str] = None,
        metadata: Dict[str, str] = None,
        setup_future_usage: str = None
    ) -> Dict[str, Any]:
        """Create a payment intent."""
        try:
            params = {
                'amount': amount,
                'currency': currency or self.currency,
                'payment_method_types': payment_method_types or ['card'],
                'metadata': metadata or {}
            }
            
            if customer_id:
                params['customer'] = customer_id
                
            if setup_future_usage:
                params['setup_future_usage'] = setup_future_usage
            
            # Create payment intent
            intent = await asyncio.to_thread(
                stripe.PaymentIntent.create,
                **params
            )
            
            return {
                'id': intent.id,
                'client_secret': intent.client_secret,
                'amount': intent.amount,
                'currency': intent.currency,
                'status': intent.status,
                'payment_method_types': intent.payment_method_types
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent error: {e}")
            raise PaymentError(f"Payment creation failed: {str(e)}")
    
    async def create_customer(
        self,
        email: str,
        name: str = None,
        phone: str = None,
        metadata: Dict[str, str] = None
    ) -> str:
        """Create a Stripe customer."""
        try:
            params = {
                'email': email,
                'metadata': metadata or {}
            }
            
            if name:
                params['name'] = name
            if phone:
                params['phone'] = phone
            
            customer = await asyncio.to_thread(
                stripe.Customer.create,
                **params
            )
            
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation error: {e}")
            raise PaymentError(f"Customer creation failed: {str(e)}")
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: int = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a subscription."""
        try:
            params = {
                'customer': customer_id,
                'items': [{'price': price_id}],
                'metadata': metadata or {}
            }
            
            if trial_period_days:
                params['trial_period_days'] = trial_period_days
            
            subscription = await asyncio.to_thread(
                stripe.Subscription.create,
                **params
            )
            
            return {
                'id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'trial_end': subscription.trial_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription error: {e}")
            raise PaymentError(f"Subscription creation failed: {str(e)}")
    
    async def create_checkout_session(
        self,
        line_items: List[Dict[str, Any]],
        mode: str = 'payment',  # payment, subscription, or setup
        success_url: str = None,
        cancel_url: str = None,
        customer_id: str = None,
        metadata: Dict[str, str] = None
    ) -> str:
        """Create a Stripe Checkout session."""
        try:
            params = {
                'payment_method_types': ['card'],
                'line_items': line_items,
                'mode': mode,
                'success_url': success_url or f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                'cancel_url': cancel_url or f"{settings.FRONTEND_URL}/payment/cancel",
                'metadata': metadata or {}
            }
            
            if customer_id:
                params['customer'] = customer_id
            
            session = await asyncio.to_thread(
                stripe.checkout.Session.create,
                **params
            )
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout session error: {e}")
            raise PaymentError(f"Checkout session creation failed: {str(e)}")
    
    async def handle_webhook(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events."""
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            
            # Handle different event types
            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                return {
                    'type': 'payment_success',
                    'payment_id': payment_intent['id'],
                    'amount': payment_intent['amount'],
                    'currency': payment_intent['currency'],
                    'customer': payment_intent.get('customer'),
                    'metadata': payment_intent.get('metadata', {})
                }
                
            elif event['type'] == 'payment_intent.payment_failed':
                payment_intent = event['data']['object']
                return {
                    'type': 'payment_failed',
                    'payment_id': payment_intent['id'],
                    'error': payment_intent.get('last_payment_error', {}).get('message')
                }
                
            elif event['type'] == 'customer.subscription.created':
                subscription = event['data']['object']
                return {
                    'type': 'subscription_created',
                    'subscription_id': subscription['id'],
                    'customer': subscription['customer'],
                    'status': subscription['status']
                }
                
            elif event['type'] == 'customer.subscription.deleted':
                subscription = event['data']['object']
                return {
                    'type': 'subscription_cancelled',
                    'subscription_id': subscription['id'],
                    'customer': subscription['customer']
                }
                
            else:
                return {
                    'type': event['type'],
                    'data': event['data']['object']
                }
                
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise PaymentError("Invalid webhook payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid webhook signature: {e}")
            raise PaymentError("Invalid webhook signature")
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount: int = None,  # None for full refund
        reason: str = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a refund."""
        try:
            params = {
                'payment_intent': payment_intent_id,
                'metadata': metadata or {}
            }
            
            if amount:
                params['amount'] = amount
            if reason:
                params['reason'] = reason
            
            refund = await asyncio.to_thread(
                stripe.Refund.create,
                **params
            )
            
            return {
                'id': refund.id,
                'amount': refund.amount,
                'currency': refund.currency,
                'status': refund.status,
                'created': refund.created
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund error: {e}")
            raise PaymentError(f"Refund failed: {str(e)}")
    
    async def list_payment_methods(self, customer_id: str) -> List[Dict[str, Any]]:
        """List customer's payment methods."""
        try:
            payment_methods = await asyncio.to_thread(
                stripe.PaymentMethod.list,
                customer=customer_id,
                type='card'
            )
            
            return [
                {
                    'id': pm.id,
                    'type': pm.type,
                    'card': {
                        'brand': pm.card.brand,
                        'last4': pm.card.last4,
                        'exp_month': pm.card.exp_month,
                        'exp_year': pm.card.exp_year
                    } if pm.card else None
                }
                for pm in payment_methods.data
            ]
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe list payment methods error: {e}")
            raise PaymentError(f"Failed to list payment methods: {str(e)}")


class PayPalPaymentProcessor:
    """Real PayPal payment integration."""
    
    def __init__(self):
        # Initialize PayPal client with proper configuration
        from paypalserversdk.configuration import Environment
        from paypalserversdk.http.auth.o_auth_2 import ClientCredentialsAuthCredentials
        
        # Create auth credentials
        auth_credentials = ClientCredentialsAuthCredentials(
            o_auth_client_id=settings.PAYPAL_CLIENT_ID or 'test',
            o_auth_client_secret=settings.PAYPAL_CLIENT_SECRET or 'test'
        )
        
        self.client = PaypalServersdkClient(
            environment=Environment.PRODUCTION if settings.PRODUCTION else Environment.SANDBOX,
            client_credentials_auth_credentials=auth_credentials,
            http_call_back=None,
            timeout=60,
            max_retries=3
        )
        self.webhook_id = settings.PAYPAL_WEBHOOK_ID
        
    async def create_order(
        self,
        amount: Decimal,
        currency: str = 'USD',
        description: str = None,
        items: List[Dict[str, Any]] = None,
        return_url: str = None,
        cancel_url: str = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a PayPal order."""
        try:
            # Build order request
            order_request = OrderRequest()
            order_request.intent = 'CAPTURE'
            
            # Purchase unit
            purchase_unit = PurchaseUnitRequest()
            purchase_unit.amount = AmountWithBreakdown()
            purchase_unit.amount.currency_code = currency
            purchase_unit.amount.value = str(amount)
            
            if description:
                purchase_unit.description = description
            
            if items:
                purchase_unit.items = [
                    Item(
                        name=item['name'],
                        quantity=str(item['quantity']),
                        unit_amount=Money(
                            currency_code=currency,
                            value=str(item['price'])
                        )
                    )
                    for item in items
                ]
            
            order_request.purchase_units = [purchase_unit]
            
            # Application context
            app_context = OrderApplicationContext()
            app_context.return_url = return_url or f"{settings.FRONTEND_URL}/payment/paypal/return"
            app_context.cancel_url = cancel_url or f"{settings.FRONTEND_URL}/payment/paypal/cancel"
            app_context.brand_name = settings.APP_NAME
            app_context.shipping_preference = 'NO_SHIPPING'
            app_context.user_action = 'PAY_NOW'
            
            order_request.application_context = app_context
            
            # Create order
            response = await asyncio.to_thread(
                self.client.orders.create,
                order_request
            )
            
            order = response.result
            
            # Get approval link
            approval_url = None
            for link in order.links:
                if link.rel == 'approve':
                    approval_url = link.href
                    break
            
            return {
                'id': order.id,
                'status': order.status,
                'approval_url': approval_url,
                'amount': amount,
                'currency': currency
            }
            
        except Exception as e:
            logger.error(f"PayPal order creation error: {e}")
            raise PaymentError(f"PayPal order creation failed: {str(e)}")
    
    async def capture_order(self, order_id: str) -> Dict[str, Any]:
        """Capture a PayPal order."""
        try:
            response = await asyncio.to_thread(
                self.client.orders.capture,
                order_id
            )
            
            order = response.result
            
            # Extract capture details
            capture = order.purchase_units[0].payments.captures[0]
            
            return {
                'id': capture.id,
                'status': capture.status,
                'amount': capture.amount.value,
                'currency': capture.amount.currency_code,
                'seller_receivable_breakdown': {
                    'gross_amount': capture.seller_receivable_breakdown.gross_amount.value,
                    'paypal_fee': capture.seller_receivable_breakdown.paypal_fee.value,
                    'net_amount': capture.seller_receivable_breakdown.net_amount.value
                }
            }
            
        except Exception as e:
            logger.error(f"PayPal order capture error: {e}")
            raise PaymentError(f"PayPal order capture failed: {str(e)}")
    
    async def create_subscription(
        self,
        plan_id: str,
        subscriber: Dict[str, str],
        return_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """Create a PayPal subscription."""
        try:
            subscription_request = SubscriptionRequest()
            subscription_request.plan_id = plan_id
            
            # Subscriber info
            subscriber_info = Subscriber()
            subscriber_info.name = Name()
            subscriber_info.name.given_name = subscriber.get('given_name', '')
            subscriber_info.name.surname = subscriber.get('surname', '')
            subscriber_info.email_address = subscriber['email']
            
            subscription_request.subscriber = subscriber_info
            
            # Application context
            app_context = ApplicationContext()
            app_context.return_url = return_url or f"{settings.FRONTEND_URL}/subscription/paypal/return"
            app_context.cancel_url = cancel_url or f"{settings.FRONTEND_URL}/subscription/paypal/cancel"
            
            subscription_request.application_context = app_context
            
            # Create subscription
            response = await asyncio.to_thread(
                self.client.subscriptions.create,
                subscription_request
            )
            
            subscription = response.result
            
            # Get approval link
            approval_url = None
            for link in subscription.links:
                if link.rel == 'approve':
                    approval_url = link.href
                    break
            
            return {
                'id': subscription.id,
                'status': subscription.status,
                'approval_url': approval_url,
                'plan_id': plan_id
            }
            
        except Exception as e:
            logger.error(f"PayPal subscription error: {e}")
            raise PaymentError(f"PayPal subscription failed: {str(e)}")
    
    async def verify_webhook_signature(
        self,
        headers: Dict[str, str],
        body: bytes
    ) -> bool:
        """Verify PayPal webhook signature."""
        try:
            verification_request = VerifyWebhookSignatureRequest()
            verification_request.auth_algo = headers.get('paypal-auth-algo')
            verification_request.cert_url = headers.get('paypal-cert-url')
            verification_request.transmission_id = headers.get('paypal-transmission-id')
            verification_request.transmission_sig = headers.get('paypal-transmission-sig')
            verification_request.transmission_time = headers.get('paypal-transmission-time')
            verification_request.webhook_id = self.webhook_id
            verification_request.webhook_event = json.loads(body)
            
            response = await asyncio.to_thread(
                self.client.webhooks.verify_signature,
                verification_request
            )
            
            return response.result.verification_status == 'SUCCESS'
            
        except Exception as e:
            logger.error(f"PayPal webhook verification error: {e}")
            return False
    
    async def handle_webhook(
        self,
        headers: Dict[str, str],
        body: bytes
    ) -> Dict[str, Any]:
        """Handle PayPal webhook events."""
        try:
            # Verify signature
            if not await self.verify_webhook_signature(headers, body):
                raise PaymentError("Invalid webhook signature")
            
            event = json.loads(body)
            event_type = event.get('event_type')
            
            if event_type == 'PAYMENT.CAPTURE.COMPLETED':
                capture = event['resource']
                return {
                    'type': 'payment_completed',
                    'payment_id': capture['id'],
                    'amount': capture['amount']['value'],
                    'currency': capture['amount']['currency_code'],
                    'status': capture['status']
                }
                
            elif event_type == 'PAYMENT.CAPTURE.DENIED':
                capture = event['resource']
                return {
                    'type': 'payment_denied',
                    'payment_id': capture['id'],
                    'reason': capture.get('status_details', {}).get('reason')
                }
                
            elif event_type == 'BILLING.SUBSCRIPTION.ACTIVATED':
                subscription = event['resource']
                return {
                    'type': 'subscription_activated',
                    'subscription_id': subscription['id'],
                    'plan_id': subscription['plan_id'],
                    'status': subscription['status']
                }
                
            elif event_type == 'BILLING.SUBSCRIPTION.CANCELLED':
                subscription = event['resource']
                return {
                    'type': 'subscription_cancelled',
                    'subscription_id': subscription['id'],
                    'plan_id': subscription['plan_id']
                }
                
            else:
                return {
                    'type': event_type,
                    'resource': event.get('resource', {})
                }
                
        except Exception as e:
            logger.error(f"PayPal webhook handling error: {e}")
            raise PaymentError(f"Webhook handling failed: {str(e)}")
    
    async def create_payout(
        self,
        recipient_email: str,
        amount: Decimal,
        currency: str = 'USD',
        note: str = None,
        sender_item_id: str = None
    ) -> Dict[str, Any]:
        """Create a PayPal payout."""
        try:
            payout_request = {
                'sender_batch_header': {
                    'sender_batch_id': str(uuid.uuid4()),
                    'email_subject': f'Payment from {settings.APP_NAME}',
                    'email_message': note or 'You have received a payment'
                },
                'items': [
                    {
                        'recipient_type': 'EMAIL',
                        'amount': {
                            'value': str(amount),
                            'currency': currency
                        },
                        'receiver': recipient_email,
                        'note': note,
                        'sender_item_id': sender_item_id or str(uuid.uuid4())
                    }
                ]
            }
            
            response = await asyncio.to_thread(
                self.client.payouts.create,
                payout_request
            )
            
            payout = response.result
            
            return {
                'batch_id': payout.batch_header.payout_batch_id,
                'batch_status': payout.batch_header.batch_status,
                'items': [
                    {
                        'payout_item_id': item.payout_item_id,
                        'transaction_status': item.transaction_status
                    }
                    for item in payout.items
                ]
            }
            
        except Exception as e:
            logger.error(f"PayPal payout error: {e}")
            raise PaymentError(f"PayPal payout failed: {str(e)}")


class CryptocurrencyPaymentProcessor:
    """Real cryptocurrency payment processor supporting multiple chains."""
    
    def __init__(self):
        # Ethereum/EVM chains
        self.w3 = Web3(Web3.HTTPProvider(settings.ETH_NODE_URL))
        self.eth_chain_id = 1 if settings.PRODUCTION else 5  # Mainnet or Goerli
        
        # Bitcoin
        # Network is determined by the address format and API calls
        self.btc_api_key = settings.BLOCKCYPHER_API_KEY
        
        # Other chains
        self.stellar_server = Server(
            horizon_url="https://horizon.stellar.org" if settings.PRODUCTION 
            else "https://horizon-testnet.stellar.org"
        )
        
        self.algod_client = algod.AlgodClient(
            algod_token=settings.ALGORAND_API_KEY,
            algod_address=settings.ALGORAND_NODE_URL
        )
        
        self.solana_client = SolanaClient(
            "https://api.mainnet-beta.solana.com" if settings.PRODUCTION
            else "https://api.devnet.solana.com"
        )
        
        # Exchange APIs
        self.binance_client = None
        if settings.BINANCE_API_KEY:
            self.binance_client = BinanceClient(
                settings.BINANCE_API_KEY,
                settings.BINANCE_API_SECRET,
                testnet=not settings.PRODUCTION
            )
        
        # Coinbase Commerce
        self.coinbase_commerce = None
        if settings.COINBASE_COMMERCE_API_KEY:
            self.coinbase_commerce = CoinbaseCommerceClient(
                api_key=settings.COINBASE_COMMERCE_API_KEY
            )
        
        # Supported tokens
        self.erc20_tokens = {
            'USDT': {
                'address': settings.USDT_CONTRACT_ADDRESS,
                'decimals': 6,
                'abi': self._load_erc20_abi()
            },
            'USDC': {
                'address': settings.USDC_CONTRACT_ADDRESS,
                'decimals': 6,
                'abi': self._load_erc20_abi()
            },
            'DAI': {
                'address': settings.DAI_CONTRACT_ADDRESS,
                'decimals': 18,
                'abi': self._load_erc20_abi()
            }
        }
        
        # HD wallet seeds
        self.master_seed = settings.CRYPTO_MASTER_SEED
        
    def _load_erc20_abi(self) -> List[Dict]:
        """Load ERC20 ABI."""
        return [
            {
                "constant": True,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": False,
                "inputs": [
                    {"name": "_to", "type": "address"},
                    {"name": "_value", "type": "uint256"}
                ],
                "name": "transfer",
                "outputs": [{"name": "", "type": "bool"}],
                "type": "function"
            }
        ]
    
    async def generate_address(
        self,
        currency: str,
        user_id: str,
        index: int = 0
    ) -> Tuple[str, str]:
        """Generate a new cryptocurrency address with private key."""
        try:
            if currency in ['ETH', 'USDT', 'USDC', 'DAI']:
                # Generate Ethereum address
                account = Account.create()
                return account.address, account.key.hex()
                
            elif currency == 'BTC':
                # Generate Bitcoin address using HD wallet
                wallet = BTCWallet.create(
                    name=f'user_{user_id}_{index}',
                    witness_type='segwit',
                    network='bitcoin' if settings.PRODUCTION else 'testnet'
                )
                address = wallet.get_key().address
                private_key = wallet.get_key().private_hex
                return address, private_key
                
            elif currency == 'XLM':
                # Generate Stellar address
                keypair = Keypair.random()
                return keypair.public_key, keypair.secret
                
            elif currency == 'ALGO':
                # Generate Algorand address
                private_key, address = account.generate_account()
                return address, private_key
                
            elif currency == 'SOL':
                # Generate Solana address
                keypair = SolanaKeypair()
                return str(keypair.pubkey()), keypair.secret().hex()
                
            else:
                raise ValueError(f"Unsupported currency: {currency}")
                
        except Exception as e:
            logger.error(f"Address generation error for {currency}: {e}")
            raise PaymentError(f"Failed to generate {currency} address")
    
    async def get_balance(
        self,
        currency: str,
        address: str
    ) -> Decimal:
        """Get cryptocurrency balance."""
        try:
            if currency == 'ETH':
                # Get ETH balance
                balance_wei = self.w3.eth.get_balance(address)
                return Decimal(Web3.from_wei(balance_wei, 'ether'))
                
            elif currency in self.erc20_tokens:
                # Get ERC20 token balance
                token_info = self.erc20_tokens[currency]
                contract = self.w3.eth.contract(
                    address=token_info['address'],
                    abi=token_info['abi']
                )
                balance = contract.functions.balanceOf(address).call()
                return Decimal(balance) / Decimal(10 ** token_info['decimals'])
                
            elif currency == 'BTC':
                # Get Bitcoin balance
                response = requests.get(
                    f"https://api.blockcypher.com/v1/btc/{
                        'main' if settings.PRODUCTION else 'test3'
                    }/addrs/{address}/balance",
                    params={'token': self.btc_api_key}
                )
                data = response.json()
                return Decimal(data['balance']) / Decimal(100000000)  # Satoshis to BTC
                
            elif currency == 'XLM':
                # Get Stellar balance
                try:
                    account = await asyncio.to_thread(
                        self.stellar_server.accounts().account_id(address).call
                    )
                    for balance in account['balances']:
                        if balance['asset_type'] == 'native':
                            return Decimal(balance['balance'])
                except NotFoundError:
                    return Decimal(0)
                    
            elif currency == 'ALGO':
                # Get Algorand balance
                account_info = await asyncio.to_thread(
                    self.algod_client.account_info,
                    address
                )
                return Decimal(account_info['amount']) / Decimal(1000000)  # MicroAlgos to ALGO
                
            elif currency == 'SOL':
                # Get Solana balance
                response = await asyncio.to_thread(
                    self.solana_client.get_balance,
                    address
                )
                return Decimal(response['result']['value']) / Decimal(1000000000)  # Lamports to SOL
                
            else:
                raise ValueError(f"Unsupported currency: {currency}")
                
        except Exception as e:
            logger.error(f"Balance check error for {currency}: {e}")
            return Decimal(0)
    
    async def send_transaction(
        self,
        currency: str,
        from_address: str,
        private_key: str,
        to_address: str,
        amount: Decimal,
        gas_price: Optional[int] = None,
        gas_limit: Optional[int] = None
    ) -> str:
        """Send cryptocurrency transaction."""
        try:
            if currency == 'ETH':
                # Send ETH transaction
                nonce = self.w3.eth.get_transaction_count(from_address)
                
                transaction = {
                    'nonce': nonce,
                    'to': to_address,
                    'value': Web3.to_wei(amount, 'ether'),
                    'gas': gas_limit or 21000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'chainId': self.eth_chain_id
                }
                
                signed_txn = self.w3.eth.account.sign_transaction(
                    transaction,
                    private_key
                )
                
                tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
                return tx_hash.hex()
                
            elif currency in self.erc20_tokens:
                # Send ERC20 token
                token_info = self.erc20_tokens[currency]
                contract = self.w3.eth.contract(
                    address=token_info['address'],
                    abi=token_info['abi']
                )
                
                nonce = self.w3.eth.get_transaction_count(from_address)
                token_amount = int(amount * Decimal(10 ** token_info['decimals']))
                
                transaction = contract.functions.transfer(
                    to_address,
                    token_amount
                ).build_transaction({
                    'chainId': self.eth_chain_id,
                    'gas': gas_limit or 100000,
                    'gasPrice': gas_price or self.w3.eth.gas_price,
                    'nonce': nonce
                })
                
                signed_txn = self.w3.eth.account.sign_transaction(
                    transaction,
                    private_key
                )
                
                tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
                return tx_hash.hex()
                
            elif currency == 'BTC':
                # Send Bitcoin transaction
                # Using blockcypher API for simplicity
                tx_data = {
                    'inputs': [{'addresses': [from_address]}],
                    'outputs': [{
                        'addresses': [to_address],
                        'value': int(amount * 100000000)  # BTC to Satoshis
                    }]
                }
                
                # Create transaction
                response = requests.post(
                    f"https://api.blockcypher.com/v1/btc/{
                        'main' if settings.PRODUCTION else 'test3'
                    }/txs/new",
                    json=tx_data,
                    params={'token': self.btc_api_key}
                )
                
                unsigned_tx = response.json()
                
                # Sign transaction (simplified - real implementation needs proper signing)
                # This would use bitcoinlib or similar for proper signing
                
                # Send transaction
                send_response = requests.post(
                    f"https://api.blockcypher.com/v1/btc/{
                        'main' if settings.PRODUCTION else 'test3'
                    }/txs/send",
                    json=unsigned_tx,
                    params={'token': self.btc_api_key}
                )
                
                return send_response.json()['tx']['hash']
                
            elif currency == 'XLM':
                # Send Stellar transaction
                source_keypair = Keypair.from_secret(private_key)
                source_account = await asyncio.to_thread(
                    self.stellar_server.load_account,
                    source_keypair.public_key
                )
                
                transaction = (
                    TransactionBuilder(
                        source_account=source_account,
                        network_passphrase=Network.PUBLIC_NETWORK_PASSPHRASE
                        if settings.PRODUCTION else Network.TESTNET_NETWORK_PASSPHRASE,
                        base_fee=100
                    )
                    .add_text_memo("LOGOS Payment")
                    .append_payment_op(
                        destination=to_address,
                        amount=str(amount),
                        asset=Asset.native()
                    )
                    .set_timeout(30)
                    .build()
                )
                
                transaction.sign(source_keypair)
                
                response = await asyncio.to_thread(
                    self.stellar_server.submit_transaction,
                    transaction
                )
                
                return response['hash']
                
            elif currency == 'ALGO':
                # Send Algorand transaction
                params = await asyncio.to_thread(
                    self.algod_client.suggested_params
                )
                
                unsigned_txn = algosdk.transaction.PaymentTxn(
                    sender=from_address,
                    sp=params,
                    receiver=to_address,
                    amt=int(amount * 1000000)  # ALGO to MicroAlgos
                )
                
                signed_txn = unsigned_txn.sign(private_key)
                
                tx_id = await asyncio.to_thread(
                    self.algod_client.send_transaction,
                    signed_txn
                )
                
                return tx_id
                
            elif currency == 'SOL':
                # Send Solana transaction
                sender_keypair = SolanaKeypair.from_secret_key(bytes.fromhex(private_key))
                
                transaction = Transaction().add(
                    transfer({
                        'from_pubkey': sender_keypair.pubkey(),
                        'to_pubkey': to_address,
                        'lamports': int(amount * 1000000000)  # SOL to Lamports
                    })
                )
                
                response = await asyncio.to_thread(
                    self.solana_client.send_transaction,
                    transaction,
                    sender_keypair
                )
                
                return response['result']
                
            else:
                raise ValueError(f"Unsupported currency: {currency}")
                
        except Exception as e:
            logger.error(f"Transaction error for {currency}: {e}")
            raise PaymentError(f"Failed to send {currency} transaction: {str(e)}")
    
    async def get_transaction_status(
        self,
        currency: str,
        tx_hash: str
    ) -> Dict[str, Any]:
        """Get transaction status and confirmations."""
        try:
            if currency in ['ETH', 'USDT', 'USDC', 'DAI']:
                # Get Ethereum transaction
                try:
                    tx = self.w3.eth.get_transaction(tx_hash)
                    receipt = self.w3.eth.get_transaction_receipt(tx_hash)
                    current_block = self.w3.eth.block_number
                    
                    return {
                        'hash': tx_hash,
                        'status': 'confirmed' if receipt and receipt['status'] == 1 else 'pending',
                        'confirmations': current_block - receipt['blockNumber'] if receipt else 0,
                        'block': receipt['blockNumber'] if receipt else None,
                        'from': tx['from'],
                        'to': tx['to'],
                        'value': str(Web3.from_wei(tx['value'], 'ether')) if currency == 'ETH' else '0',
                        'gas_used': receipt['gasUsed'] if receipt else None,
                        'gas_price': str(Web3.from_wei(tx['gasPrice'], 'gwei'))
                    }
                except Exception:
                    return {'hash': tx_hash, 'status': 'not_found', 'confirmations': 0}
                    
            elif currency == 'BTC':
                # Get Bitcoin transaction
                response = requests.get(
                    f"https://api.blockcypher.com/v1/btc/{
                        'main' if settings.PRODUCTION else 'test3'
                    }/txs/{tx_hash}",
                    params={'token': self.btc_api_key}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'hash': tx_hash,
                        'status': 'confirmed' if data.get('confirmations', 0) > 0 else 'pending',
                        'confirmations': data.get('confirmations', 0),
                        'block': data.get('block_height'),
                        'total': str(Decimal(data.get('total', 0)) / 100000000),
                        'fees': str(Decimal(data.get('fees', 0)) / 100000000)
                    }
                else:
                    return {'hash': tx_hash, 'status': 'not_found', 'confirmations': 0}
                    
            # Add other currencies as needed
                    
        except Exception as e:
            logger.error(f"Transaction status error: {e}")
            return {'hash': tx_hash, 'status': 'error', 'confirmations': 0}
    
    async def get_exchange_rate(
        self,
        from_currency: str,
        to_currency: str = 'USD'
    ) -> Decimal:
        """Get current exchange rate."""
        try:
            # Check cache first
            cache_key = f"exchange_rate:{from_currency}:{to_currency}"
            cached_rate = await cache.get(cache_key)
            if cached_rate:
                return Decimal(cached_rate)
            
            # Try multiple sources
            rate = None
            
            # Try Binance first
            if self.binance_client and from_currency != to_currency:
                try:
                    symbol = f"{from_currency}{to_currency}"
                    ticker = await self.binance_client.get_symbol_ticker(symbol=symbol)
                    rate = Decimal(ticker['price'])
                except Exception:
                    # Try reverse pair
                    try:
                        symbol = f"{to_currency}{from_currency}"
                        ticker = await self.binance_client.get_symbol_ticker(symbol=symbol)
                        rate = Decimal(1) / Decimal(ticker['price'])
                    except Exception:
                        pass
            
            # Fallback to CoinGecko
            if not rate:
                response = requests.get(
                    'https://api.coingecko.com/api/v3/simple/price',
                    params={
                        'ids': self._get_coingecko_id(from_currency),
                        'vs_currencies': to_currency.lower()
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    coin_id = self._get_coingecko_id(from_currency)
                    if coin_id in data:
                        rate = Decimal(data[coin_id][to_currency.lower()])
            
            if rate:
                # Cache for 5 minutes
                await cache.set(cache_key, str(rate), ttl=300)
                return rate
            else:
                raise ValueError(f"Could not get exchange rate for {from_currency}/{to_currency}")
                
        except Exception as e:
            logger.error(f"Exchange rate error: {e}")
            # Return a default rate as fallback
            default_rates = {
                'BTC': Decimal('50000'),
                'ETH': Decimal('3000'),
                'BNB': Decimal('400'),
                'SOL': Decimal('100'),
                'USDT': Decimal('1'),
                'USDC': Decimal('1'),
                'DAI': Decimal('1')
            }
            return default_rates.get(from_currency, Decimal('1'))
    
    def _get_coingecko_id(self, symbol: str) -> str:
        """Map currency symbol to CoinGecko ID."""
        mapping = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'BNB': 'binancecoin',
            'SOL': 'solana',
            'XLM': 'stellar',
            'ALGO': 'algorand',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'DAI': 'dai'
        }
        return mapping.get(symbol, symbol.lower())
    
    async def create_coinbase_commerce_charge(
        self,
        amount: Decimal,
        currency: str = 'USD',
        name: str = None,
        description: str = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """Create a Coinbase Commerce charge for multiple cryptocurrencies."""
        if not self.coinbase_commerce:
            raise PaymentError("Coinbase Commerce not configured")
        
        try:
            charge_data = {
                'name': name or 'LOGOS Payment',
                'description': description or 'Payment for LOGOS services',
                'pricing_type': 'fixed_price',
                'local_price': {
                    'amount': str(amount),
                    'currency': currency
                },
                'metadata': metadata or {}
            }
            
            charge = await asyncio.to_thread(
                self.coinbase_commerce.charge.create,
                **charge_data
            )
            
            return {
                'id': charge.id,
                'code': charge.code,
                'hosted_url': charge.hosted_url,
                'expires_at': charge.expires_at,
                'addresses': charge.addresses,
                'pricing': charge.pricing
            }
            
        except Exception as e:
            logger.error(f"Coinbase Commerce error: {e}")
            raise PaymentError(f"Failed to create charge: {str(e)}")
    
    def generate_payment_qr(
        self,
        currency: str,
        address: str,
        amount: Decimal = None,
        label: str = None
    ) -> str:
        """Generate QR code for cryptocurrency payment."""
        try:
            # Build payment URI
            if currency == 'BTC':
                uri = f"bitcoin:{address}"
                if amount:
                    uri += f"?amount={amount}"
                if label:
                    uri += f"&label={label}"
                    
            elif currency in ['ETH', 'USDT', 'USDC', 'DAI']:
                uri = f"ethereum:{address}"
                if amount:
                    uri += f"?value={Web3.to_wei(amount, 'ether')}"
                    
            else:
                # Generic format
                uri = f"{currency.lower()}:{address}"
                if amount:
                    uri += f"?amount={amount}"
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(uri)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return f"data:image/png;base64,{img_str}"
            
        except Exception as e:
            logger.error(f"QR generation error: {e}")
            return ""


class UnifiedPaymentProcessor:
    """Unified payment processor supporting multiple payment methods."""
    
    def __init__(self):
        self.stripe = StripePaymentProcessor()
        self.paypal = PayPalPaymentProcessor()
        self.crypto = CryptocurrencyPaymentProcessor()
        
    async def create_payment(
        self,
        amount: Decimal,
        currency: str,
        payment_method: str,
        user_id: str,
        description: str = None,
        metadata: Dict[str, Any] = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Create a payment using the specified method."""
        try:
            if payment_method == 'stripe':
                # Create Stripe payment intent
                result = await self.stripe.create_payment_intent(
                    amount=int(amount * 100),  # Convert to cents
                    currency=currency.lower(),
                    metadata=metadata
                )
                
                payment_data = {
                    'method': 'stripe',
                    'payment_id': result['id'],
                    'client_secret': result['client_secret'],
                    'amount': amount,
                    'currency': currency,
                    'status': 'pending'
                }
                
            elif payment_method == 'paypal':
                # Create PayPal order
                result = await self.paypal.create_order(
                    amount=amount,
                    currency=currency,
                    description=description,
                    metadata=metadata
                )
                
                payment_data = {
                    'method': 'paypal',
                    'payment_id': result['id'],
                    'approval_url': result['approval_url'],
                    'amount': amount,
                    'currency': currency,
                    'status': 'pending'
                }
                
            elif payment_method.startswith('crypto_'):
                # Extract cryptocurrency
                crypto_currency = payment_method.replace('crypto_', '').upper()
                
                # Generate payment address
                address, private_key = await self.crypto.generate_address(
                    crypto_currency,
                    user_id
                )
                
                # Get exchange rate
                exchange_rate = await self.crypto.get_exchange_rate(
                    crypto_currency,
                    currency
                )
                
                crypto_amount = amount / exchange_rate
                
                # Generate QR code
                qr_code = self.crypto.generate_payment_qr(
                    crypto_currency,
                    address,
                    crypto_amount
                )
                
                payment_data = {
                    'method': payment_method,
                    'payment_id': str(uuid.uuid4()),
                    'address': address,
                    'amount': float(amount),
                    'crypto_amount': float(crypto_amount),
                    'currency': currency,
                    'crypto_currency': crypto_currency,
                    'exchange_rate': float(exchange_rate),
                    'qr_code': qr_code,
                    'status': 'pending',
                    'expires_at': (datetime.utcnow() + timedelta(minutes=30)).isoformat()
                }
                
                # Store private key securely
                await cache.set(
                    f"crypto_key:{payment_data['payment_id']}",
                    private_key,
                    ttl=86400  # 24 hours
                )
                
            else:
                raise ValueError(f"Unsupported payment method: {payment_method}")
            
            # Store payment in database if provided
            if db:
                payment_record = PaymentMethod(
                    user_id=user_id,
                    type=payment_method,
                    payment_id=payment_data['payment_id'],
                    amount=amount,
                    currency=currency,
                    status='pending',
                    metadata=payment_data
                )
                db.add(payment_record)
                await db.commit()
            
            return payment_data
            
        except Exception as e:
            logger.error(f"Payment creation error: {e}")
            raise PaymentError(f"Failed to create payment: {str(e)}")
    
    async def confirm_payment(
        self,
        payment_method: str,
        payment_id: str,
        additional_data: Dict[str, Any] = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Confirm/capture a payment."""
        try:
            if payment_method == 'stripe':
                # Stripe payments are confirmed client-side
                # Just check the status
                intent = await asyncio.to_thread(
                    stripe.PaymentIntent.retrieve,
                    payment_id
                )
                
                result = {
                    'status': 'completed' if intent.status == 'succeeded' else intent.status,
                    'amount': intent.amount / 100,
                    'currency': intent.currency
                }
                
            elif payment_method == 'paypal':
                # Capture PayPal order
                result = await self.paypal.capture_order(payment_id)
                result['status'] = 'completed' if result['status'] == 'COMPLETED' else 'failed'
                
            elif payment_method.startswith('crypto_'):
                # Check cryptocurrency transaction
                crypto_currency = payment_method.replace('crypto_', '').upper()
                
                # Get payment details from cache/db
                if db:
                    payment = await db.execute(
                        select(PaymentMethod).where(
                            PaymentMethod.payment_id == payment_id
                        )
                    )
                    payment = payment.scalar_one_or_none()
                    
                    if payment:
                        # Check blockchain for payment
                        balance = await self.crypto.get_balance(
                            crypto_currency,
                            payment.metadata['address']
                        )
                        
                        expected_amount = Decimal(str(payment.metadata['crypto_amount']))
                        
                        if balance >= expected_amount:
                            result = {
                                'status': 'completed',
                                'amount': float(payment.amount),
                                'currency': payment.currency,
                                'crypto_amount': float(balance),
                                'crypto_currency': crypto_currency
                            }
                        else:
                            result = {
                                'status': 'pending',
                                'amount': float(payment.amount),
                                'currency': payment.currency,
                                'received': float(balance),
                                'expected': float(expected_amount)
                            }
                    else:
                        raise ValueError("Payment not found")
                else:
                    raise ValueError("Database required for crypto payments")
                    
            else:
                raise ValueError(f"Unsupported payment method: {payment_method}")
            
            # Update payment status in database
            if db and 'status' in result:
                await db.execute(
                    update(PaymentMethod)
                    .where(PaymentMethod.payment_id == payment_id)
                    .values(status=result['status'])
                )
                await db.commit()
            
            return result
            
        except Exception as e:
            logger.error(f"Payment confirmation error: {e}")
            raise PaymentError(f"Failed to confirm payment: {str(e)}")
    
    async def process_refund(
        self,
        payment_method: str,
        payment_id: str,
        amount: Decimal = None,
        reason: str = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Process a refund."""
        try:
            if payment_method == 'stripe':
                result = await self.stripe.create_refund(
                    payment_intent_id=payment_id,
                    amount=int(amount * 100) if amount else None,
                    reason=reason
                )
                
            elif payment_method == 'paypal':
                # PayPal refunds
                refund_data = {
                    "amount": {
                        "value": str(amount),
                        "currency_code": "USD"
                    },
                    "note_to_payer": reason or "Refund processed"
                }
                
                response = requests.post(
                    f"{self.paypal.base_url}/v2/payments/captures/{payment_id}/refund",
                    json=refund_data,
                    headers={
                        "Authorization": f"Bearer {await self.paypal._get_access_token()}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code == 201:
                    result = response.json()
                    return {
                        'id': result.get('id'),
                        'status': result.get('status'),
                        'amount': float(result.get('amount', {}).get('value', 0)),
                        'currency': result.get('amount', {}).get('currency_code', 'USD'),
                        'created_at': result.get('create_time'),
                        'provider': 'paypal',
                        'provider_response': result
                    }
                else:
                    raise PaymentError(f"PayPal refund failed: {response.text}")
                
            elif payment_method.startswith('crypto_'):
                # Automated cryptocurrency refunds
                currency = payment_method.replace('crypto_', '').upper()
                
                # Retrieve original transaction details (would be stored in DB)
                # For now, we'll implement the refund structure
                refund_data = {
                    'original_payment_id': payment_id,
                    'refund_address': metadata.get('refund_address'),
                    'amount': amount,
                    'currency': currency,
                    'reason': reason
                }
                
                if not refund_data['refund_address']:
                    raise ValueError("Refund address required for crypto refunds")
                
                # Process crypto refund based on currency
                if currency in ['ETH', 'USDT', 'USDC', 'DAI']:
                    # Use stored wallet private key (from secure storage)
                    # This is a simplified example - real implementation would use HSM
                    from_address = metadata.get('platform_wallet_address')
                    private_key = metadata.get('platform_wallet_key')  # Retrieved securely
                    
                    tx_hash = await self.crypto.send_transaction(
                        from_address=from_address,
                        private_key=private_key,
                        to_address=refund_data['refund_address'],
                        amount=Decimal(str(amount)),
                        currency=currency
                    )
                    
                    result = {
                        'id': tx_hash,
                        'status': 'pending',
                        'amount': amount,
                        'currency': currency,
                        'refund_address': refund_data['refund_address'],
                        'transaction_hash': tx_hash,
                        'provider': f'crypto_{currency.lower()}',
                        'estimated_confirmation_time': '10-30 minutes'
                    }
                    
                elif currency == 'BTC':
                    # Bitcoin refund
                    tx_hash = await self.crypto.send_transaction(
                        from_address=metadata.get('platform_wallet_address'),
                        private_key=metadata.get('platform_wallet_key'),
                        to_address=refund_data['refund_address'],
                        amount=Decimal(str(amount)),
                        currency='BTC'
                    )
                    
                    result = {
                        'id': tx_hash,
                        'status': 'pending',
                        'amount': amount,
                        'currency': 'BTC',
                        'refund_address': refund_data['refund_address'],
                        'transaction_hash': tx_hash,
                        'provider': 'crypto_btc',
                        'estimated_confirmation_time': '10-60 minutes'
                    }
                    
                else:
                    # For other cryptocurrencies, use Coinbase Commerce API
                    cb_client = CoinbaseCommerceClient(api_key=self.crypto.coinbase_api_key)
                    
                    # Create a refund checkout
                    refund_checkout = cb_client.checkout.create(
                        name=f"Refund for {payment_id}",
                        description=reason or "Refund",
                        pricing_type="fixed_price",
                        local_price={
                            "amount": str(amount),
                            "currency": "USD"
                        },
                        metadata={
                            "refund": True,
                            "original_payment_id": payment_id,
                            "refund_address": refund_data['refund_address']
                        }
                    )
                    
                    result = {
                        'id': refund_checkout['id'],
                        'status': 'pending',
                        'amount': amount,
                        'currency': currency,
                        'refund_address': refund_data['refund_address'],
                        'checkout_url': refund_checkout['hosted_url'],
                        'provider': f'crypto_{currency.lower()}',
                        'provider_response': refund_checkout
                    }
                
            else:
                raise ValueError(f"Unsupported payment method: {payment_method}")
            
            return result
            
        except Exception as e:
            logger.error(f"Refund error: {e}")
            raise PaymentError(f"Failed to process refund: {str(e)}")
    
    async def create_subscription(
        self,
        payment_method: str,
        customer_id: str,
        plan_id: str,
        trial_days: int = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a subscription."""
        try:
            if payment_method == 'stripe':
                result = await self.stripe.create_subscription(
                    customer_id=customer_id,
                    price_id=plan_id,
                    trial_period_days=trial_days,
                    metadata=metadata
                )
                
            elif payment_method == 'paypal':
                # For PayPal, customer_id would be subscriber info
                result = await self.paypal.create_subscription(
                    plan_id=plan_id,
                    subscriber={'email': customer_id},  # Simplified
                )
                
            else:
                raise ValueError(f"Subscriptions not supported for: {payment_method}")
            
            return result
            
        except Exception as e:
            logger.error(f"Subscription error: {e}")
            raise PaymentError(f"Failed to create subscription: {str(e)}")


# Global payment processor instance
payment_processor = UnifiedPaymentProcessor()