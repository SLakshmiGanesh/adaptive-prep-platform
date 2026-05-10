from __future__ import annotations

from ai.tutor.embeddings import similarity


NOTES = {
    "Algebra": "Use equations, factoring, substitution, and checking roots against the original expression.",
    "Calculus": "Use limits, derivative rules, and integral accumulation. Track the function before applying formulas.",
    "Mechanics": "List known values, choose the motion equation, substitute units, and verify direction.",
    "Electrostatics": "Use Coulomb's law, field direction, potential, and inverse-square distance relationships.",
    "Organic Chemistry": "Identify functional groups, reagent role, and whether the reaction is oxidation, reduction, or substitution.",
    "Chemical Equilibrium": "Apply Le Chatelier's principle and compare reaction quotient with equilibrium constant.",
}


def answer_with_retrieval(topic_name: str, question: str, mastery: float) -> tuple[str, str]:
    note = NOTES.get(topic_name, "Start from definitions, formulas, and one solved example.")
    relevance = similarity(question, note)
    level = "foundation" if mastery < 0.55 else "application"
    answer = (
        f"For {topic_name}, use a {level} approach. {note} "
        f"Your query relevance to the stored note is {relevance:.2f}, so revise the core concept before solving."
    )
    next_step = "Try one easy question first." if mastery < 0.55 else "Try one timed medium question and review the explanation."
    return answer, next_step
