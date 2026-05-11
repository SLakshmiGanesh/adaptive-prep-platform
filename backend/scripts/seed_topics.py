"""
scripts/seed_topics.py — Seed JEE/NEET topics and sample questions

Run: python scripts/seed_topics.py
"""

import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import settings

engine = create_async_engine(settings.DATABASE_URL)
Session = async_sessionmaker(engine)


JEE_TOPICS = [
    # Physics
    {"subject": "Physics", "name": "Kinematics", "difficulty_baseline": 0.4, "weight": 1.2},
    {"subject": "Physics", "name": "Newton's Laws of Motion", "difficulty_baseline": 0.45, "weight": 1.3},
    {"subject": "Physics", "name": "Work, Energy & Power", "difficulty_baseline": 0.50, "weight": 1.2},
    {"subject": "Physics", "name": "Thermodynamics", "difficulty_baseline": 0.60, "weight": 1.5},
    {"subject": "Physics", "name": "Electrostatics", "difficulty_baseline": 0.65, "weight": 1.6},
    {"subject": "Physics", "name": "Current Electricity", "difficulty_baseline": 0.60, "weight": 1.4},
    {"subject": "Physics", "name": "Optics", "difficulty_baseline": 0.55, "weight": 1.3},
    {"subject": "Physics", "name": "Modern Physics", "difficulty_baseline": 0.70, "weight": 1.5},
    # Chemistry
    {"subject": "Chemistry", "name": "Atomic Structure", "difficulty_baseline": 0.45, "weight": 1.2},
    {"subject": "Chemistry", "name": "Chemical Bonding", "difficulty_baseline": 0.55, "weight": 1.4},
    {"subject": "Chemistry", "name": "Thermochemistry", "difficulty_baseline": 0.60, "weight": 1.3},
    {"subject": "Chemistry", "name": "Electrochemistry", "difficulty_baseline": 0.65, "weight": 1.5},
    {"subject": "Chemistry", "name": "Organic Reaction Mechanisms", "difficulty_baseline": 0.70, "weight": 1.7},
    {"subject": "Chemistry", "name": "Coordination Compounds", "difficulty_baseline": 0.65, "weight": 1.4},
    # Mathematics
    {"subject": "Mathematics", "name": "Limits & Continuity", "difficulty_baseline": 0.50, "weight": 1.3},
    {"subject": "Mathematics", "name": "Differentiation", "difficulty_baseline": 0.55, "weight": 1.4},
    {"subject": "Mathematics", "name": "Integration", "difficulty_baseline": 0.65, "weight": 1.6},
    {"subject": "Mathematics", "name": "Differential Equations", "difficulty_baseline": 0.70, "weight": 1.5},
    {"subject": "Mathematics", "name": "Matrices & Determinants", "difficulty_baseline": 0.55, "weight": 1.3},
    {"subject": "Mathematics", "name": "Probability", "difficulty_baseline": 0.60, "weight": 1.4},
    {"subject": "Mathematics", "name": "Coordinate Geometry", "difficulty_baseline": 0.50, "weight": 1.4},
    {"subject": "Mathematics", "name": "Vectors & 3D Geometry", "difficulty_baseline": 0.65, "weight": 1.5},
]

SAMPLE_QUESTIONS = [
    {
        "topic_name": "Kinematics",
        "text": "A particle moves with uniform acceleration. Its velocity changes from 20 m/s to 60 m/s over 4 seconds. What is the distance covered during this time?",
        "options": [
            {"id": "A", "text": "120 m", "correct": False},
            {"id": "B", "text": "160 m", "correct": True},
            {"id": "C", "text": "200 m", "correct": False},
            {"id": "D", "text": "80 m", "correct": False},
        ],
        "correct_answer": "B",
        "explanation": "Using s = (u+v)/2 × t = (20+60)/2 × 4 = 40 × 4 = 160 m. The average velocity is (20+60)/2 = 40 m/s over 4 seconds.",
        "difficulty": 0.40,
        "discrimination": 1.2,
    },
    {
        "topic_name": "Kinematics",
        "text": "A ball is thrown vertically upward with velocity 20 m/s. How long does it take to return to the starting point? (g = 10 m/s²)",
        "options": [
            {"id": "A", "text": "2 s", "correct": False},
            {"id": "B", "text": "4 s", "correct": True},
            {"id": "C", "text": "1 s", "correct": False},
            {"id": "D", "text": "3 s", "correct": False},
        ],
        "correct_answer": "B",
        "explanation": "Time to reach max height = v/g = 20/10 = 2 s. Total time = 2 × 2 = 4 s by symmetry.",
        "difficulty": 0.30,
        "discrimination": 1.0,
    },
    {
        "topic_name": "Thermodynamics",
        "text": "An ideal gas undergoes an isothermal expansion. Which of the following statements is correct?",
        "options": [
            {"id": "A", "text": "Internal energy increases", "correct": False},
            {"id": "B", "text": "Temperature increases", "correct": False},
            {"id": "C", "text": "Work done by gas equals heat absorbed", "correct": True},
            {"id": "D", "text": "Entropy decreases", "correct": False},
        ],
        "correct_answer": "C",
        "explanation": "For isothermal process: ΔU = 0 (temperature constant for ideal gas). By First Law: Q = W. All heat absorbed is converted to work.",
        "difficulty": 0.55,
        "discrimination": 1.4,
    },
    {
        "topic_name": "Integration",
        "text": "Evaluate: ∫₀^π sin(x) dx",
        "options": [
            {"id": "A", "text": "0", "correct": False},
            {"id": "B", "text": "π", "correct": False},
            {"id": "C", "text": "2", "correct": True},
            {"id": "D", "text": "1", "correct": False},
        ],
        "correct_answer": "C",
        "explanation": "∫₀^π sin(x) dx = [-cos(x)]₀^π = -cos(π) - (-cos(0)) = 1 + 1 = 2.",
        "difficulty": 0.35,
        "discrimination": 1.1,
    },
    {
        "topic_name": "Electrostatics",
        "text": "Two charges +4μC and -4μC are placed 10 cm apart. What is the electric potential at the midpoint?",
        "options": [
            {"id": "A", "text": "Zero", "correct": True},
            {"id": "B", "text": "720 kV", "correct": False},
            {"id": "C", "text": "360 kV", "correct": False},
            {"id": "D", "text": "-360 kV", "correct": False},
        ],
        "correct_answer": "A",
        "explanation": "Electric potential is a scalar. V = kQ/r. At midpoint, r is equal for both charges. V = k(+4μC)/0.05 + k(-4μC)/0.05 = 0. The potentials cancel.",
        "difficulty": 0.50,
        "discrimination": 1.3,
    },
]


async def seed():
    async with Session() as session:
        # Insert topics
        topic_id_map = {}
        print("Seeding topics...")
        for t in JEE_TOPICS:
            tid = str(uuid.uuid4())
            topic_id_map[t["name"]] = tid
            await session.execute(
                text("""
                    INSERT INTO topics (id, subject, name, difficulty_baseline, exam_targets, weight, order_index)
                    VALUES (:id, :subject, :name, :diff, :exams, :weight, 0)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": tid, "subject": t["subject"], "name": t["name"],
                    "diff": t["difficulty_baseline"],
                    "exams": '["JEE", "NEET"]',
                    "weight": t["weight"],
                }
            )

        # Insert sample questions
        print("Seeding questions...")
        for q in SAMPLE_QUESTIONS:
            topic_id = topic_id_map.get(q["topic_name"])
            if not topic_id:
                continue
            import json
            await session.execute(
                text("""
                    INSERT INTO questions
                        (id, topic_id, text, options, correct_answer, explanation, difficulty, discrimination)
                    VALUES
                        (:id, :tid, :text, :opts::jsonb, :ans, :expl, :diff, :disc)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": str(uuid.uuid4()),
                    "tid": topic_id,
                    "text": q["text"],
                    "opts": json.dumps(q["options"]),
                    "ans": q["correct_answer"],
                    "expl": q["explanation"],
                    "diff": q["difficulty"],
                    "disc": q["discrimination"],
                }
            )

        await session.commit()
        print(f"✅ Seeded {len(JEE_TOPICS)} topics and {len(SAMPLE_QUESTIONS)} questions")


if __name__ == "__main__":
    asyncio.run(seed())
