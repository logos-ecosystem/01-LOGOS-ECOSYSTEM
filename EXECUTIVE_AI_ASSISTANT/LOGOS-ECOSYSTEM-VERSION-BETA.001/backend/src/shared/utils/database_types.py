"""Custom database types for cross-database compatibility."""

from sqlalchemy import TypeDecorator, String, JSON
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, JSONB as PostgresJSONB, ARRAY as PostgresARRAY
import uuid


class UUID(TypeDecorator):
    """Platform-independent UUID type.
    
    Uses PostgreSQL's UUID type when available, otherwise uses String(36).
    """
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value


class JSONB(TypeDecorator):
    """Platform-independent JSONB type.
    
    Uses PostgreSQL's JSONB type when available, otherwise uses JSON.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresJSONB())
        else:
            return dialect.type_descriptor(JSON())


class ARRAY(TypeDecorator):
    """Platform-independent ARRAY type.
    
    Uses PostgreSQL's ARRAY type when available, otherwise uses JSON.
    """
    impl = JSON
    cache_ok = True
    
    def __init__(self, item_type=None):
        super().__init__()
        self.item_type = item_type or String

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresARRAY(self.item_type))
        else:
            return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            # Convert list to JSON for non-PostgreSQL databases
            return value if isinstance(value, list) else []

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            # Ensure we return a list
            return value if isinstance(value, list) else []