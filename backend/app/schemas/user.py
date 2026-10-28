from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from ..models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    organization_id: Optional[str] = None

class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
