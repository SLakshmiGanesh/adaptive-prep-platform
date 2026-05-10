from __future__ import annotations

from fastapi import APIRouter

from backend.models.schemas import LoginRequest, LoginResponse


router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    token = f"demo-token-for-{payload.email}"
    return LoginResponse(access_token=token)
