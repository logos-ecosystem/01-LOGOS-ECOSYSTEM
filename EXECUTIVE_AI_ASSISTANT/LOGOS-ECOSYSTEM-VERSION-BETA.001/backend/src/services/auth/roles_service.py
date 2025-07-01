"""Role and permission management service."""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import uuid4

from ...shared.models.user import User, Role, Permission, user_roles, role_permissions
from ...shared.utils.logger import get_logger
from ...shared.utils.exceptions import ResourceNotFoundError, ValidationError

logger = get_logger(__name__)


class RolesService:
    """Service for managing roles and permissions."""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_role(
        self,
        name: str,
        description: str,
        hierarchy_level: int = 100,
        permissions: List[str] = None
    ) -> Role:
        """Create a new role with optional permissions."""
        # Check if role already exists
        existing = self.db.query(Role).filter(Role.name == name).first()
        if existing:
            raise ValidationError(f"Role '{name}' already exists")
        
        # Create role
        role = Role(
            id=str(uuid4()),
            name=name,
            description=description,
            hierarchy_level=hierarchy_level,
            is_system=False
        )
        self.db.add(role)
        
        # Add permissions if provided
        if permissions:
            perms = self.db.query(Permission).filter(
                Permission.name.in_(permissions)
            ).all()
            role.permissions.extend(perms)
        
        self.db.commit()
        self.db.refresh(role)
        
        logger.info(f"Created role: {name}")
        return role
    
    async def assign_role_to_user(self, user_id: str, role_name: str) -> User:
        """Assign a role to a user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException("User not found")
        
        role = self.db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise NotFoundException(f"Role '{role_name}' not found")
        
        if role not in user.roles:
            user.roles.append(role)
            self.db.commit()
            self.db.refresh(user)
            logger.info(f"Assigned role '{role_name}' to user {user_id}")
        
        return user
    
    async def remove_role_from_user(self, user_id: str, role_name: str) -> User:
        """Remove a role from a user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException("User not found")
        
        role = self.db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise NotFoundException(f"Role '{role_name}' not found")
        
        if role in user.roles:
            user.roles.remove(role)
            self.db.commit()
            self.db.refresh(user)
            logger.info(f"Removed role '{role_name}' from user {user_id}")
        
        return user
    
    async def get_user_permissions(self, user_id: str) -> List[Permission]:
        """Get all permissions for a user through their roles."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundException("User not found")
        
        permissions = set()
        for role in user.roles:
            permissions.update(role.permissions)
        
        return list(permissions)
    
    async def create_permission(
        self,
        name: str,
        resource: str,
        action: str,
        description: str = None
    ) -> Permission:
        """Create a new permission."""
        # Check if permission already exists
        existing = self.db.query(Permission).filter(Permission.name == name).first()
        if existing:
            raise ValidationError(f"Permission '{name}' already exists")
        
        permission = Permission(
            id=str(uuid4()),
            name=name,
            resource=resource,
            action=action,
            description=description
        )
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        
        logger.info(f"Created permission: {name}")
        return permission
    
    async def add_permission_to_role(self, role_name: str, permission_name: str) -> Role:
        """Add a permission to a role."""
        role = self.db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise NotFoundException(f"Role '{role_name}' not found")
        
        permission = self.db.query(Permission).filter(
            Permission.name == permission_name
        ).first()
        if not permission:
            raise NotFoundException(f"Permission '{permission_name}' not found")
        
        if permission not in role.permissions:
            role.permissions.append(permission)
            self.db.commit()
            self.db.refresh(role)
            logger.info(f"Added permission '{permission_name}' to role '{role_name}'")
        
        return role
    
    async def check_user_permission(
        self,
        user_id: str,
        resource: str,
        action: str
    ) -> bool:
        """Check if a user has a specific permission."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        return user.has_permission(resource, action)
    
    async def get_all_roles(self) -> List[Role]:
        """Get all roles in the system."""
        return self.db.query(Role).order_by(Role.hierarchy_level.desc()).all()
    
    async def get_all_permissions(self) -> List[Permission]:
        """Get all permissions in the system."""
        return self.db.query(Permission).order_by(Permission.resource, Permission.action).all()
    
    async def initialize_default_user_role(self, user_id: str):
        """Assign default 'user' role to new users."""
        await self.assign_role_to_user(user_id, "user")
    
    async def upgrade_to_premium(self, user_id: str):
        """Upgrade user to premium role."""
        await self.assign_role_to_user(user_id, "premium_user")
        # Optionally remove basic user role to avoid conflicts
        # await self.remove_role_from_user(user_id, "user")
    
    async def make_seller(self, user_id: str, verified: bool = False):
        """Make user a seller (verified or basic)."""
        role_name = "verified_seller" if verified else "seller"
        await self.assign_role_to_user(user_id, role_name)