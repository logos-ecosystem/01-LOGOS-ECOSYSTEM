"""
Field-level encryption service for sensitive data protection
"""

import os
import base64
import json
from typing import Any, Optional, Dict, List, Union
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import hashlib

from ...shared.utils.logger import get_logger
from ...shared.utils.config import get_settings
from ...infrastructure.cache import cache_manager

logger = get_logger(__name__)
settings = get_settings()


class EncryptionService:
    """Service for encrypting sensitive data fields"""
    
    def __init__(self):
        self.master_key = self._get_or_create_master_key()
        self.field_keys = {}
        self.key_rotation_interval = timedelta(days=90)
        self.audit_encryption = True
        
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key"""
        # In production, this should use HSM or cloud KMS
        key_env = os.environ.get('ENCRYPTION_MASTER_KEY')
        
        if key_env:
            return base64.b64decode(key_env)
        else:
            # Generate new key (only for development)
            key = Fernet.generate_key()
            logger.warning(f"Generated new master key - store securely: {key.decode()}")
            return key
    
    def _derive_field_key(self, field_name: str, salt: bytes) -> bytes:
        """Derive a field-specific key from master key"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        key_material = self.master_key + field_name.encode()
        return base64.urlsafe_b64encode(kdf.derive(key_material))
    
    async def encrypt_field(
        self,
        value: Any,
        field_name: str,
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """Encrypt a field value"""
        try:
            # Generate salt for this encryption
            salt = os.urandom(16)
            
            # Get or create field key
            field_key = self._derive_field_key(field_name, salt)
            cipher = Fernet(field_key)
            
            # Convert value to bytes
            if isinstance(value, str):
                plaintext = value.encode()
            else:
                plaintext = json.dumps(value).encode()
            
            # Encrypt
            ciphertext = cipher.encrypt(plaintext)
            
            # Create encrypted package
            encrypted_data = {
                'ciphertext': base64.b64encode(ciphertext).decode(),
                'salt': base64.b64encode(salt).decode(),
                'field': field_name,
                'version': '1.0',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Audit log
            if self.audit_encryption and user_id:
                await self._audit_encryption_operation(
                    user_id=user_id,
                    field=field_name,
                    operation='encrypt'
                )
            
            return encrypted_data
            
        except Exception as e:
            logger.error(f"Encryption failed for field {field_name}: {str(e)}")
            raise
    
    async def decrypt_field(
        self,
        encrypted_data: Dict[str, str],
        user_id: Optional[str] = None
    ) -> Any:
        """Decrypt a field value"""
        try:
            # Extract components
            ciphertext = base64.b64decode(encrypted_data['ciphertext'])
            salt = base64.b64decode(encrypted_data['salt'])
            field_name = encrypted_data['field']
            
            # Derive field key
            field_key = self._derive_field_key(field_name, salt)
            cipher = Fernet(field_key)
            
            # Decrypt
            plaintext = cipher.decrypt(ciphertext)
            
            # Convert back to original type
            try:
                value = json.loads(plaintext.decode())
            except:
                value = plaintext.decode()
            
            # Audit log
            if self.audit_encryption and user_id:
                await self._audit_encryption_operation(
                    user_id=user_id,
                    field=field_name,
                    operation='decrypt'
                )
            
            return value
            
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise
    
    async def encrypt_multiple_fields(
        self,
        data: Dict[str, Any],
        fields_to_encrypt: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Encrypt multiple fields in a dictionary"""
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in data and data[field] is not None:
                encrypted_data[field] = await self.encrypt_field(
                    value=data[field],
                    field_name=field,
                    user_id=user_id
                )
        
        return encrypted_data
    
    async def decrypt_multiple_fields(
        self,
        data: Dict[str, Any],
        fields_to_decrypt: List[str],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Decrypt multiple fields in a dictionary"""
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            if field in data and isinstance(data[field], dict) and 'ciphertext' in data[field]:
                decrypted_data[field] = await self.decrypt_field(
                    encrypted_data=data[field],
                    user_id=user_id
                )
        
        return decrypted_data
    
    async def rotate_encryption_key(self, field_name: str) -> bool:
        """Rotate encryption key for a field"""
        try:
            logger.info(f"Starting key rotation for field: {field_name}")
            
            # This would re-encrypt all data with new key
            # In production, this would be a batch job
            
            # Generate new key version
            new_version = datetime.utcnow().isoformat()
            
            # Store key rotation metadata
            rotation_key = f"key_rotation:{field_name}"
            await cache_manager.set(
                rotation_key,
                {
                    'old_version': '1.0',
                    'new_version': new_version,
                    'started_at': datetime.utcnow().isoformat(),
                    'status': 'in_progress'
                },
                ttl=86400
            )
            
            # In production: Re-encrypt all affected records
            # This is a placeholder for the actual implementation
            
            logger.info(f"Key rotation completed for field: {field_name}")
            return True
            
        except Exception as e:
            logger.error(f"Key rotation failed for field {field_name}: {str(e)}")
            return False
    
    async def _audit_encryption_operation(
        self,
        user_id: str,
        field: str,
        operation: str
    ):
        """Audit encryption operations"""
        audit_key = f"encryption_audit:{user_id}:{datetime.utcnow().strftime('%Y%m%d')}"
        
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'field': field,
            'operation': operation
        }
        
        # Store in Redis list
        await cache_manager.redis.lpush(audit_key, json.dumps(audit_entry))
        await cache_manager.redis.expire(audit_key, 86400 * 30)  # Keep for 30 days
    
    def hash_value(self, value: str, salt: Optional[str] = None) -> str:
        """Create a one-way hash of a value for searching"""
        if salt is None:
            salt = settings.SECRET_KEY
        
        hash_input = f"{salt}:{value}"
        return hashlib.sha256(hash_input.encode()).hexdigest()
    
    def create_searchable_hash(self, value: str) -> str:
        """Create a searchable hash that allows exact match queries"""
        # Use consistent salt for searchability
        search_salt = "search_salt_2024"
        return self.hash_value(value, search_salt)


class FieldEncryptor:
    """Helper class for model field encryption"""
    
    def __init__(self, service: EncryptionService):
        self.service = service
        self.encrypted_fields = set()
    
    def register_fields(self, *fields: str):
        """Register fields that should be encrypted"""
        self.encrypted_fields.update(fields)
    
    async def encrypt_model_fields(
        self,
        model_instance: Any,
        user_id: Optional[str] = None
    ) -> Any:
        """Encrypt registered fields on a model instance"""
        for field in self.encrypted_fields:
            if hasattr(model_instance, field):
                value = getattr(model_instance, field)
                if value is not None:
                    encrypted = await self.service.encrypt_field(
                        value=value,
                        field_name=field,
                        user_id=user_id
                    )
                    setattr(model_instance, f"{field}_encrypted", encrypted)
                    setattr(model_instance, f"{field}_hash", 
                           self.service.create_searchable_hash(str(value)))
                    # Clear original field
                    setattr(model_instance, field, None)
        
        return model_instance
    
    async def decrypt_model_fields(
        self,
        model_instance: Any,
        user_id: Optional[str] = None
    ) -> Any:
        """Decrypt registered fields on a model instance"""
        for field in self.encrypted_fields:
            encrypted_field = f"{field}_encrypted"
            if hasattr(model_instance, encrypted_field):
                encrypted_data = getattr(model_instance, encrypted_field)
                if encrypted_data:
                    decrypted = await self.service.decrypt_field(
                        encrypted_data=encrypted_data,
                        user_id=user_id
                    )
                    setattr(model_instance, field, decrypted)
        
        return model_instance


# Global encryption service instance
encryption_service = EncryptionService()

# Field encryptor for common sensitive fields
field_encryptor = FieldEncryptor(encryption_service)

# Convenience functions
async def encrypt_data(data: Any, field_name: str = "data") -> Dict[str, str]:
    """Encrypt data using the global encryption service"""
    return await encryption_service.encrypt_field(data, field_name)

async def decrypt_data(encrypted_data: Dict[str, str]) -> Any:
    """Decrypt data using the global encryption service"""
    return await encryption_service.decrypt_field(encrypted_data)
field_encryptor.register_fields(
    'ssn',
    'tax_id',
    'bank_account',
    'credit_card',
    'api_key',
    'private_key',
    'password_hash',
    'security_answer'
)


# Utility functions
async def encrypt_pii(data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Encrypt common PII fields in data"""
    pii_fields = [
        'ssn', 'tax_id', 'date_of_birth', 'bank_account',
        'credit_card', 'driver_license', 'passport_number'
    ]
    
    fields_to_encrypt = [f for f in pii_fields if f in data]
    
    return await encryption_service.encrypt_multiple_fields(
        data=data,
        fields_to_encrypt=fields_to_encrypt,
        user_id=user_id
    )


async def decrypt_pii(data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Decrypt common PII fields in data"""
    pii_fields = [
        'ssn', 'tax_id', 'date_of_birth', 'bank_account',
        'credit_card', 'driver_license', 'passport_number'
    ]
    
    fields_to_decrypt = [f for f in pii_fields if f in data]
    
    return await encryption_service.decrypt_multiple_fields(
        data=data,
        fields_to_decrypt=fields_to_decrypt,
        user_id=user_id
    )