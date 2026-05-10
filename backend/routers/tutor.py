from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.db import repo
from backend.models.schemas import TutorRequest, TutorResponse
from backend.services.skm import calculate_mastery
from ai.tutor.rag import answer_with_retrieval


router = APIRouter()


@router.post("", response_model=TutorResponse)
def tutor(payload: TutorRequest) -> TutorResponse:
    try:
        topic = repo.get_topic(payload.topic_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Topic not found") from exc

    mastery = calculate_mastery(repo.list_topics(), repo.list_attempts(payload.student_id))
    topic_mastery = next(item for item in mastery if item.topic_id == payload.topic_id)
    answer, next_step = answer_with_retrieval(topic.name, payload.question, topic_mastery.mastery)
    return TutorResponse(answer=answer, suggested_next_step=next_step)
