from __future__ import annotations


def simple_embedding(text: str) -> set[str]:
    return {token.strip(".,!?()").lower() for token in text.split() if len(token) > 2}


def similarity(left: str, right: str) -> float:
    left_tokens = simple_embedding(left)
    right_tokens = simple_embedding(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)
