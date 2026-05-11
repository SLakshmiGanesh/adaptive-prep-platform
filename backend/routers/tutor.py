"""
routers/tutor.py — Streaming AI tutor with RAG pipeline
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, get_redis
from models.orm import User
from ai.tutor.rag import RAGTutor
from routers.auth import get_current_user

router = APIRouter()
tutor = RAGTutor()


# ── Schemas ────────────────────────────────────────────────────────────────────

class AskBody(BaseModel):
    question: str
    topic_id: Optional[str] = None
    topic_name: Optional[str] = None


class HistoryItem(BaseModel):
    question: str
    answer: str
    topic_name: Optional[str]
    asked_at: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/ask")
async def ask_tutor(
    body: AskBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """
    Stream an AI tutor response using RAG.
    Returns Server-Sent Events (SSE) text/event-stream.
    """
    if not body.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    # Store question for history (answer accumulated during stream)
    history_key = f"tutor:history:{current_user.id}"

    async def generate():
        full_answer = []
        try:
            async for chunk in tutor.stream_answer(
                question=body.question,
                topic=body.topic_name or "General",
                topic_id=body.topic_id,
                db=db,
            ):
                if chunk:
                    full_answer.append(chunk)
                    yield f"data: {chunk}\n\n"

            # Save to Redis history (last 20 Q&A pairs)
            history_item = {
                "question": body.question,
                "answer": "".join(full_answer),
                "topic_name": body.topic_name,
                "asked_at": datetime.now(timezone.utc).isoformat(),
            }
            await redis.lpush(history_key, str(history_item))
            await redis.ltrim(history_key, 0, 19)

            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=list[HistoryItem])
async def get_history(
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
):
    history_key = f"tutor:history:{current_user.id}"
    raw_items = await redis.lrange(history_key, 0, 19)

    items = []
    for raw in raw_items:
        try:
            import ast
            item = ast.literal_eval(raw)
            items.append(HistoryItem(**item))
        except Exception:
            continue
    return items
