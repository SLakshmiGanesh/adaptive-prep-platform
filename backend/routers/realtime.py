"""
routers/realtime.py — WebSocket endpoint for real-time dashboard updates

Broadcasts events:
  - mastery_update: when BKT recalculates after quiz
  - xp_gained: when XP is awarded
  - plan_update: when daily plan changes
  - streak_update: when streak changes

Frontend connects and receives live events as JSON.
"""

import json
import asyncio
from datetime import datetime, timezone
from typing import Callable

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_redis, settings
from models.orm import User

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id -> list of active WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self._connections:
            self._connections[user_id] = [
                ws for ws in self._connections[user_id] if ws is not websocket
            ]
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: str, event: dict):
        if user_id not in self._connections:
            return
        dead = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def broadcast(self, event: dict):
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, event)

    @property
    def active_users(self) -> int:
        return len(self._connections)


manager = ConnectionManager()


def _decode_token(token: str) -> str | None:
    """Decode JWT and return user_id, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    user_id = _decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await manager.connect(websocket, user_id)

    try:
        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connected",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }))

        # Keep connection alive with ping/pong
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data)

                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

            except asyncio.TimeoutError:
                # Send heartbeat
                await websocket.send_text(json.dumps({"type": "heartbeat"}))

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


# ── Event broadcasting helpers ────────────────────────────────────────────────

async def broadcast_mastery_update(
    user_id: str,
    topic_id: str,
    topic_name: str,
    new_mastery: float,
    delta: float,
):
    await manager.send_to_user(user_id, {
        "type": "mastery_update",
        "topic_id": topic_id,
        "topic_name": topic_name,
        "new_mastery": new_mastery,
        "delta": delta,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_xp_gained(
    user_id: str,
    xp: int,
    total_xp: int,
    reason: str,
):
    await manager.send_to_user(user_id, {
        "type": "xp_gained",
        "xp": xp,
        "total_xp": total_xp,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def broadcast_streak_update(
    user_id: str,
    streak_days: int,
    broken: bool = False,
):
    await manager.send_to_user(user_id, {
        "type": "streak_update",
        "streak_days": streak_days,
        "broken": broken,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
