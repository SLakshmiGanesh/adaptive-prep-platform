from __future__ import annotations

from datetime import datetime, timezone

from backend.models.schemas import Attempt, Mastery, RevisionItem


def build_revision_queue(mastery: list[Mastery], attempts: list[Attempt]) -> list[RevisionItem]:
    last_seen = {}
    for attempt in attempts:
        last_seen[attempt.topic_id] = max(last_seen.get(attempt.topic_id, attempt.created_at), attempt.created_at)

    now = datetime.now(timezone.utc)
    due_items: list[RevisionItem] = []
    for item in mastery:
        last = last_seen.get(item.topic_id)
        days = 99 if last is None else (now - last).days
        if item.mastery < 0.55 or days >= 3:
            due_items.append(
                RevisionItem(
                    topic_id=item.topic_id,
                    topic_name=item.topic_name,
                    due_label="Due now" if item.mastery < 0.55 else f"{days} days since review",
                    mastery=item.mastery,
                )
            )
    return sorted(due_items, key=lambda item: item.mastery)[:4]
