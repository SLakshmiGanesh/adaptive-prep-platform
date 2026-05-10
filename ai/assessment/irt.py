from __future__ import annotations

import math


def probability_correct(ability: float, difficulty: float, discrimination: float = 1.0) -> float:
    return 1 / (1 + math.exp(-discrimination * (ability - difficulty)))
