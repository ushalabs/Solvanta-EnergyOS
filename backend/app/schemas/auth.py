from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=255)
    organization_name: Optional[str] = Field(default=None, max_length=255)

    @field_validator('password')
    @classmethod
    def bcrypt_size(cls, value):
        if not value.strip():
            raise ValueError('Password cannot be blank')
        if len(value.encode('utf-8')) > 72:
            raise ValueError('Password must be at most 72 UTF-8 bytes')
        return value

    @field_validator('full_name')
    @classmethod
    def nonblank_name(cls, value):
        if not value.strip():
            raise ValueError('Full name cannot be blank')
        return value.strip()
