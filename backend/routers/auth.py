"""
routers/auth.py — JWT auth: register, login, profile
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, settings
from models.orm import User

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    exam_target: Optional[str] = None
    exam_date: Optional[str] = None
    weekly_goal_hours: int = 20


class TokenRes(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str


class ProfileRes(BaseModel):
    id: str; email: str; name: str
    exam_target: Optional[str]; exam_date: Optional[str]
    xp: int; streak_days: int; level: int; level_title: str
    weekly_goal_hours: int
    study_hours_today: float = 0.0


def hash_pw(p: str) -> str:
    return pwd.hash(p)

def verify_pw(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)

def make_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": exp}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2),
    db: AsyncSession = Depends(get_db),
) -> User:
    exc = HTTPException(status_code=401, detail="Invalid or expired token",
                        headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        uid: str = payload.get("sub")
        if not uid:
            raise exc
    except JWTError:
        raise exc

    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one_or_none()
    if not user:
        raise exc

    user.last_active = datetime.now(timezone.utc)
    return user


@router.post("/register", response_model=TokenRes, status_code=201)
async def register(body: RegisterReq, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    exam_date = None
    if body.exam_date:
        try:
            exam_date = date.fromisoformat(body.exam_date)
        except ValueError:
            raise HTTPException(400, "exam_date must be YYYY-MM-DD")

    user = User(
        email=body.email,
        hashed_password=hash_pw(body.password),
        name=body.name,
        exam_target=body.exam_target,
        exam_date=exam_date,
        weekly_goal_hours=body.weekly_goal_hours,
    )
    db.add(user)
    await db.flush()
    return TokenRes(access_token=make_token(user.id), user_id=user.id, name=user.name)


@router.post("/login", response_model=TokenRes)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.email == form.username))
    user = res.scalar_one_or_none()
    if not user or not verify_pw(form.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    return TokenRes(access_token=make_token(user.id), user_id=user.id, name=user.name)


@router.get("/me", response_model=ProfileRes)
async def me(current_user: User = Depends(get_current_user)):
    return ProfileRes(
        id=current_user.id, email=current_user.email, name=current_user.name,
        exam_target=current_user.exam_target,
        exam_date=str(current_user.exam_date) if current_user.exam_date else None,
        xp=current_user.xp, streak_days=current_user.streak_days,
        level=current_user.level, level_title=current_user.level_title,
        weekly_goal_hours=current_user.weekly_goal_hours,
    )
