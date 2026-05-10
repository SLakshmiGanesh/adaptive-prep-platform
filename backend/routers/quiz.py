from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.db import repo
from backend.models.schemas import QuizQuestion, SubmitAttemptRequest, SubmitAttemptResponse
from backend.services.skm import calculate_mastery
from backend.services.recommender import choose_next_question


router = APIRouter()


@router.get("/{student_id}/next-question", response_model=QuizQuestion)
def next_question(student_id: str) -> QuizQuestion:
    attempts = repo.list_attempts(student_id)
    mastery = calculate_mastery(repo.list_topics(), attempts)
    return choose_next_question(repo.list_questions(), mastery, repo.list_topics(), attempts)


@router.post("/attempts", response_model=SubmitAttemptResponse)
def submit_attempt(payload: SubmitAttemptRequest) -> SubmitAttemptResponse:
    try:
        question = repo.get_question(payload.question_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Question not found") from exc

    if payload.selected_index >= len(question.choices):
        raise HTTPException(status_code=400, detail="Selected option is out of range")

    attempt = repo.add_attempt(payload.student_id, question, payload.selected_index, payload.response_time_seconds)
    attempts = repo.list_attempts(payload.student_id)
    mastery = calculate_mastery(repo.list_topics(), attempts)
    updated_mastery = next(item for item in mastery if item.topic_id == attempt.topic_id)
    next_item = choose_next_question(repo.list_questions(), mastery, repo.list_topics(), attempts)
    return SubmitAttemptResponse(
        correct=attempt.correct,
        answer_index=question.answer_index,
        explanation=question.explanation,
        updated_mastery=updated_mastery,
        next_question=next_item,
    )
