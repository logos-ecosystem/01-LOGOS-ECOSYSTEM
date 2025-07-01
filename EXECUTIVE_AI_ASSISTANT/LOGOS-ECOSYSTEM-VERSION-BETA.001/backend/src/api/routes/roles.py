"""Role and permission management API routes."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from ...infrastructure.database import get_db
from ...shared.models.user import User, Role, Permission
from ...services.auth.roles_service import RolesService
from ..deps import get_current_active_user, require_admin, require_permission
from ..schemas.auth import RoleCreate, RoleUpdate, PermissionCreate, UserRoleAssignment
from ...shared.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("/", response_model=List[dict])
async def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all available roles."""
    roles_service = RolesService(db)
    roles = await roles_service.get_all_roles()
    
    return [
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "hierarchy_level": role.hierarchy_level,
            "is_system": role.is_system,
            "permissions_count": len(role.permissions)
        }
        for role in roles
    ]


@router.get("/permissions", response_model=List[dict])
async def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all available permissions."""
    roles_service = RolesService(db)
    permissions = await roles_service.get_all_permissions()
    
    return [
        {
            "id": perm.id,
            "name": perm.name,
            "resource": perm.resource,
            "action": perm.action,
            "description": perm.description
        }
        for perm in permissions
    ]


@router.get("/my-permissions", response_model=List[dict])
async def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's permissions."""
    roles_service = RolesService(db)
    permissions = await roles_service.get_user_permissions(current_user.id)
    
    return [
        {
            "id": perm.id,
            "name": perm.name,
            "resource": perm.resource,
            "action": perm.action,
            "description": perm.description
        }
        for perm in permissions
    ]


@router.post("/", response_model=dict)
@require_permission("system", "settings")
async def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new role (requires system settings permission)."""
    roles_service = RolesService(db)
    
    try:
        role = await roles_service.create_role(
            name=role_data.name,
            description=role_data.description,
            hierarchy_level=role_data.hierarchy_level,
            permissions=role_data.permissions
        )
        
        return {
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "hierarchy_level": role.hierarchy_level,
            "message": "Role created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/permissions", response_model=dict)
@require_permission("system", "settings")
async def create_permission(
    permission_data: PermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new permission (requires system settings permission)."""
    roles_service = RolesService(db)
    
    try:
        permission = await roles_service.create_permission(
            name=permission_data.name,
            resource=permission_data.resource,
            action=permission_data.action,
            description=permission_data.description
        )
        
        return {
            "id": permission.id,
            "name": permission.name,
            "resource": permission.resource,
            "action": permission.action,
            "message": "Permission created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating permission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/assign", response_model=dict)
@require_permission("users", "roles")
async def assign_role_to_user(
    assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign a role to a user (requires users.roles permission)."""
    roles_service = RolesService(db)
    
    try:
        user = await roles_service.assign_role_to_user(
            user_id=str(assignment.user_id),
            role_name=assignment.role_name
        )
        
        return {
            "user_id": user.id,
            "username": user.username,
            "roles": [role.name for role in user.roles],
            "message": f"Role '{assignment.role_name}' assigned successfully"
        }
    except Exception as e:
        logger.error(f"Error assigning role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/assign", response_model=dict)
@require_permission("users", "roles")
async def remove_role_from_user(
    assignment: UserRoleAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a role from a user (requires users.roles permission)."""
    roles_service = RolesService(db)
    
    try:
        user = await roles_service.remove_role_from_user(
            user_id=str(assignment.user_id),
            role_name=assignment.role_name
        )
        
        return {
            "user_id": user.id,
            "username": user.username,
            "roles": [role.name for role in user.roles],
            "message": f"Role '{assignment.role_name}' removed successfully"
        }
    except Exception as e:
        logger.error(f"Error removing role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{role_id}/permissions", response_model=dict)
@require_permission("system", "settings")
async def add_permission_to_role(
    role_id: UUID,
    permission_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a permission to a role (requires system settings permission)."""
    roles_service = RolesService(db)
    
    # Get role by ID
    role = db.query(Role).filter(Role.id == str(role_id)).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    try:
        updated_role = await roles_service.add_permission_to_role(
            role_name=role.name,
            permission_name=permission_name
        )
        
        return {
            "role_id": updated_role.id,
            "role_name": updated_role.name,
            "permissions": [p.name for p in updated_role.permissions],
            "message": f"Permission '{permission_name}' added to role"
        }
    except Exception as e:
        logger.error(f"Error adding permission to role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/check-permission", response_model=dict)
async def check_permission(
    resource: str,
    action: str,
    user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if a user has a specific permission."""
    roles_service = RolesService(db)
    
    # Check permission for specified user or current user
    target_user_id = str(user_id) if user_id else current_user.id
    
    # Only admins can check other users' permissions
    if user_id and str(user_id) != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check your own permissions"
        )
    
    has_permission = await roles_service.check_user_permission(
        user_id=target_user_id,
        resource=resource,
        action=action
    )
    
    return {
        "user_id": target_user_id,
        "resource": resource,
        "action": action,
        "has_permission": has_permission
    }