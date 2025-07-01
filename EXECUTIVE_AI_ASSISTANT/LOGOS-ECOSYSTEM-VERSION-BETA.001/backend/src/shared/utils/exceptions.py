"""Custom exceptions for the LOGOS ecosystem."""

from typing import Optional, Dict, Any


class LogosException(Exception):
    """Base exception for LOGOS ecosystem."""
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class AuthenticationError(LogosException):
    """Raised when authentication fails."""
    pass


class AuthorizationError(LogosException):
    """Raised when user lacks required permissions."""
    pass


class TokenExpiredError(AuthenticationError):
    """Raised when a token has expired."""
    pass


class ValidationError(LogosException):
    """Raised when data validation fails."""
    pass


class ResourceNotFoundError(LogosException):
    """Raised when a requested resource is not found."""
    pass


class ResourceConflictError(LogosException):
    """Raised when there's a conflict with existing resources."""
    pass


class RateLimitError(LogosException):
    """Raised when rate limit is exceeded."""
    pass


class PaymentError(LogosException):
    """Raised when payment processing fails."""
    pass


class InsufficientFundsError(PaymentError):
    """Raised when user has insufficient funds."""
    pass


class AIServiceError(LogosException):
    """Raised when AI service encounters an error."""
    pass


class QuotaExceededError(LogosException):
    """Raised when user exceeds their quota."""
    pass


class IntegrationError(LogosException):
    """Raised when external integration fails."""
    pass


class ConfigurationError(LogosException):
    """Raised when configuration is invalid."""
    pass


class DatabaseError(LogosException):
    """Raised when database operation fails."""
    pass


class CacheError(LogosException):
    """Raised when cache operation fails."""
    pass


class AgentExecutionError(LogosException):
    """Raised when agent execution fails."""
    pass


class AgentValidationError(ValidationError):
    """Raised when agent input validation fails."""
    pass


class AgentAuthorizationError(AuthorizationError):
    """Raised when user lacks permission to access an agent."""
    pass


class AgentNotFoundError(ResourceNotFoundError):
    """Raised when an agent is not found."""
    pass


class AgentRegistrationError(LogosException):
    """Raised when agent registration fails."""
    pass


class WalletNotFoundError(ResourceNotFoundError):
    """Raised when a wallet is not found."""
    pass


class InsufficientBalanceError(PaymentError):
    """Raised when wallet has insufficient balance."""
    pass


class TransactionError(LogosException):
    """Raised when a transaction fails."""
    pass


class TenantError(LogosException):
    """Raised when tenant operations fail."""
    pass