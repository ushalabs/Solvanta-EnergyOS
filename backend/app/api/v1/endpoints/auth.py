from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ....core.security import verify_password, hash_password, create_access_token
from ....db.session import get_db
from ....models.user import User, Organization, UserRole
from ....schemas.auth import Token, UserRegister
from ....schemas.user import UserRead
from ...deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # 1. Pre-check if email already exists
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )

    # 2. Organization Handling: prevent arbitrary users from joining existing organizations
    org_id = None
    if payload.organization_name and payload.organization_name.strip():
        cleaned_org_name = payload.organization_name.strip()
        org_result = await db.execute(select(Organization).where(Organization.name == cleaned_org_name))
        existing_org = org_result.scalars().first()
        if existing_org:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An organization with this name already exists. To join an existing organization, request an invitation from the administrator."
            )
        new_org = Organization(name=cleaned_org_name)
        db.add(new_org)
        await db.flush()
        org_id = new_org.id

    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.CUSTOMER,
        organization_id=org_id,
        is_active=True,
        is_superuser=False,
    )
    db.add(new_user)
    
    # 3. Handle concurrent registration race conditions
    try:
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration conflict: a user with this email or organization already exists."
        )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")

@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
