"""
scripts/seed_all_exams.py — Seed topics for ALL supported exams

Run: python scripts/seed_all_exams.py
"""

import asyncio, uuid, json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from db import settings

engine = create_async_engine(settings.DATABASE_URL)
Session = async_sessionmaker(engine)

# ────────────────────────────────────────────────────────────────────────────
ALL_TOPICS = [
  # ── JEE ──────────────────────────────────────────────────────────────────
  {"subject":"Physics","name":"Kinematics","exams":["JEE","NEET"],"weight":1.2,"diff":0.40},
  {"subject":"Physics","name":"Newton's Laws of Motion","exams":["JEE","NEET"],"weight":1.3,"diff":0.45},
  {"subject":"Physics","name":"Work, Energy & Power","exams":["JEE","NEET"],"weight":1.2,"diff":0.50},
  {"subject":"Physics","name":"Rotational Motion","exams":["JEE"],"weight":1.4,"diff":0.60},
  {"subject":"Physics","name":"Thermodynamics","exams":["JEE","NEET"],"weight":1.5,"diff":0.60},
  {"subject":"Physics","name":"Electrostatics","exams":["JEE","NEET"],"weight":1.6,"diff":0.65},
  {"subject":"Physics","name":"Current Electricity","exams":["JEE","NEET"],"weight":1.4,"diff":0.60},
  {"subject":"Physics","name":"Magnetism & EMI","exams":["JEE","NEET"],"weight":1.5,"diff":0.65},
  {"subject":"Physics","name":"Optics","exams":["JEE","NEET"],"weight":1.3,"diff":0.55},
  {"subject":"Physics","name":"Modern Physics","exams":["JEE","NEET"],"weight":1.5,"diff":0.70},
  {"subject":"Physics","name":"Waves & Oscillations","exams":["JEE"],"weight":1.3,"diff":0.55},
  {"subject":"Physics","name":"Fluid Mechanics","exams":["JEE"],"weight":1.2,"diff":0.55},

  {"subject":"Chemistry","name":"Atomic Structure","exams":["JEE","NEET"],"weight":1.2,"diff":0.45},
  {"subject":"Chemistry","name":"Chemical Bonding","exams":["JEE","NEET"],"weight":1.4,"diff":0.55},
  {"subject":"Chemistry","name":"Periodic Table & Periodicity","exams":["JEE","NEET"],"weight":1.2,"diff":0.40},
  {"subject":"Chemistry","name":"Thermochemistry","exams":["JEE","NEET"],"weight":1.3,"diff":0.60},
  {"subject":"Chemistry","name":"Chemical Equilibrium","exams":["JEE","NEET"],"weight":1.4,"diff":0.60},
  {"subject":"Chemistry","name":"Electrochemistry","exams":["JEE","NEET"],"weight":1.5,"diff":0.65},
  {"subject":"Chemistry","name":"Organic Reaction Mechanisms","exams":["JEE","NEET"],"weight":1.7,"diff":0.70},
  {"subject":"Chemistry","name":"Coordination Compounds","exams":["JEE","NEET"],"weight":1.4,"diff":0.65},
  {"subject":"Chemistry","name":"Stereochemistry","exams":["JEE"],"weight":1.3,"diff":0.65},
  {"subject":"Chemistry","name":"p-Block Elements","exams":["JEE","NEET"],"weight":1.4,"diff":0.55},
  {"subject":"Chemistry","name":"d & f Block Elements","exams":["JEE","NEET"],"weight":1.3,"diff":0.60},

  {"subject":"Mathematics","name":"Limits & Continuity","exams":["JEE"],"weight":1.3,"diff":0.50},
  {"subject":"Mathematics","name":"Differentiation","exams":["JEE"],"weight":1.4,"diff":0.55},
  {"subject":"Mathematics","name":"Integration","exams":["JEE"],"weight":1.6,"diff":0.65},
  {"subject":"Mathematics","name":"Differential Equations","exams":["JEE"],"weight":1.5,"diff":0.70},
  {"subject":"Mathematics","name":"Matrices & Determinants","exams":["JEE"],"weight":1.3,"diff":0.55},
  {"subject":"Mathematics","name":"Probability","exams":["JEE","CAT"],"weight":1.4,"diff":0.60},
  {"subject":"Mathematics","name":"Coordinate Geometry","exams":["JEE"],"weight":1.4,"diff":0.50},
  {"subject":"Mathematics","name":"Vectors & 3D Geometry","exams":["JEE"],"weight":1.5,"diff":0.65},
  {"subject":"Mathematics","name":"Permutations & Combinations","exams":["JEE","CAT"],"weight":1.3,"diff":0.60},
  {"subject":"Mathematics","name":"Complex Numbers","exams":["JEE"],"weight":1.3,"diff":0.60},

  # ── NEET Biology ──────────────────────────────────────────────────────────
  {"subject":"Biology","name":"Cell Biology & Cell Division","exams":["NEET"],"weight":1.5,"diff":0.50},
  {"subject":"Biology","name":"Genetics & Heredity","exams":["NEET"],"weight":1.6,"diff":0.60},
  {"subject":"Biology","name":"Molecular Biology & DNA","exams":["NEET"],"weight":1.7,"diff":0.65},
  {"subject":"Biology","name":"Plant Physiology","exams":["NEET"],"weight":1.4,"diff":0.55},
  {"subject":"Biology","name":"Human Physiology","exams":["NEET"],"weight":1.7,"diff":0.60},
  {"subject":"Biology","name":"Ecology & Environment","exams":["NEET"],"weight":1.4,"diff":0.45},
  {"subject":"Biology","name":"Evolution","exams":["NEET"],"weight":1.3,"diff":0.45},
  {"subject":"Biology","name":"Biotechnology","exams":["NEET"],"weight":1.4,"diff":0.60},
  {"subject":"Biology","name":"Reproduction","exams":["NEET"],"weight":1.5,"diff":0.55},

  # ── GATE CS ───────────────────────────────────────────────────────────────
  {"subject":"Computer Science","name":"Data Structures & Algorithms","exams":["GATE"],"weight":1.8,"diff":0.60},
  {"subject":"Computer Science","name":"Algorithm Design & Analysis","exams":["GATE"],"weight":1.7,"diff":0.65},
  {"subject":"Computer Science","name":"Theory of Computation","exams":["GATE"],"weight":1.6,"diff":0.70},
  {"subject":"Computer Science","name":"Operating Systems","exams":["GATE"],"weight":1.6,"diff":0.60},
  {"subject":"Computer Science","name":"Database Management Systems","exams":["GATE"],"weight":1.5,"diff":0.55},
  {"subject":"Computer Science","name":"Computer Networks","exams":["GATE"],"weight":1.5,"diff":0.60},
  {"subject":"Computer Science","name":"Computer Organization & Architecture","exams":["GATE"],"weight":1.5,"diff":0.65},
  {"subject":"Computer Science","name":"Compiler Design","exams":["GATE"],"weight":1.4,"diff":0.70},
  {"subject":"Computer Science","name":"Digital Logic","exams":["GATE"],"weight":1.3,"diff":0.50},

  {"subject":"Engineering Mathematics","name":"Linear Algebra","exams":["GATE"],"weight":1.5,"diff":0.60},
  {"subject":"Engineering Mathematics","name":"Calculus & Differential Equations","exams":["GATE"],"weight":1.4,"diff":0.60},
  {"subject":"Engineering Mathematics","name":"Probability & Statistics","exams":["GATE"],"weight":1.4,"diff":0.55},
  {"subject":"Engineering Mathematics","name":"Discrete Mathematics","exams":["GATE"],"weight":1.5,"diff":0.65},

  {"subject":"General Aptitude","name":"Verbal Ability","exams":["GATE"],"weight":1.0,"diff":0.40},
  {"subject":"General Aptitude","name":"Numerical Ability & Reasoning","exams":["GATE"],"weight":1.0,"diff":0.45},

  # ── UPSC ──────────────────────────────────────────────────────────────────
  {"subject":"History","name":"Ancient & Medieval Indian History","exams":["UPSC"],"weight":1.5,"diff":0.50},
  {"subject":"History","name":"Modern Indian History & Freedom Movement","exams":["UPSC"],"weight":1.7,"diff":0.55},
  {"subject":"History","name":"Post-Independence India","exams":["UPSC"],"weight":1.4,"diff":0.50},
  {"subject":"Geography","name":"Physical Geography","exams":["UPSC"],"weight":1.5,"diff":0.55},
  {"subject":"Geography","name":"Indian Geography","exams":["UPSC"],"weight":1.6,"diff":0.55},
  {"subject":"Geography","name":"World Geography","exams":["UPSC"],"weight":1.4,"diff":0.55},
  {"subject":"Polity","name":"Indian Constitution","exams":["UPSC"],"weight":1.8,"diff":0.55},
  {"subject":"Polity","name":"Governance & Social Justice","exams":["UPSC"],"weight":1.5,"diff":0.55},
  {"subject":"Polity","name":"International Relations","exams":["UPSC"],"weight":1.4,"diff":0.55},
  {"subject":"Economy","name":"Indian Economy","exams":["UPSC"],"weight":1.7,"diff":0.60},
  {"subject":"Economy","name":"Economic Development & Planning","exams":["UPSC"],"weight":1.5,"diff":0.60},
  {"subject":"Environment","name":"Ecology & Biodiversity","exams":["UPSC"],"weight":1.4,"diff":0.50},
  {"subject":"Environment","name":"Climate Change & Disaster Management","exams":["UPSC"],"weight":1.4,"diff":0.50},
  {"subject":"Science & Tech","name":"Science & Technology Developments","exams":["UPSC"],"weight":1.3,"diff":0.50},

  # ── CAT ───────────────────────────────────────────────────────────────────
  {"subject":"Quantitative Aptitude","name":"Arithmetic & Number Systems","exams":["CAT","GMAT","GRE"],"weight":1.5,"diff":0.50},
  {"subject":"Quantitative Aptitude","name":"Algebra","exams":["CAT","GMAT","GRE"],"weight":1.5,"diff":0.60},
  {"subject":"Quantitative Aptitude","name":"Geometry & Mensuration","exams":["CAT","GMAT","GRE"],"weight":1.4,"diff":0.60},
  {"subject":"Verbal Ability","name":"Reading Comprehension","exams":["CAT","GMAT","GRE"],"weight":1.6,"diff":0.55},
  {"subject":"Verbal Ability","name":"Para Jumbles & Summary","exams":["CAT"],"weight":1.4,"diff":0.55},
  {"subject":"Logical Reasoning","name":"Data Interpretation","exams":["CAT","GMAT"],"weight":1.5,"diff":0.65},
  {"subject":"Logical Reasoning","name":"Logical Reasoning & Puzzles","exams":["CAT"],"weight":1.5,"diff":0.65},
]

SAMPLE_QUESTIONS = [
  # GATE Numerical
  {
    "topic": "Data Structures & Algorithms",
    "text": "What is the time complexity of building a heap from an unsorted array of n elements?",
    "options": [
      {"id":"A","text":"O(n log n)","correct":False},
      {"id":"B","text":"O(n)","correct":True},
      {"id":"C","text":"O(log n)","correct":False},
      {"id":"D","text":"O(n²)","correct":False},
    ],
    "correct": "B",
    "explanation": "Building a heap using the heapify approach (bottom-up) takes O(n) time. While intuitively it seems like O(n log n), the mathematical analysis shows the sum of heights at each level converges to O(n).",
    "difficulty": 0.55, "discrimination": 1.4,
    "type": "mcq",
  },
  # GATE CS Numerical
  {
    "topic": "Data Structures & Algorithms",
    "text": "A binary search tree has 7 nodes. What is the minimum possible height of this BST?",
    "options": [],
    "correct": "2",
    "explanation": "Minimum height = ⌊log₂(7)⌋ = 2. A complete binary tree with 7 nodes has height 2 (3 levels: root at 0, children at 1, grandchildren at 2).",
    "difficulty": 0.50, "discrimination": 1.2,
    "type": "numerical",
  },
  # UPSC
  {
    "topic": "Indian Constitution",
    "text": "Which article of the Indian Constitution deals with the Right to Constitutional Remedies?",
    "options": [
      {"id":"A","text":"Article 19","correct":False},
      {"id":"B","text":"Article 21","correct":False},
      {"id":"C","text":"Article 32","correct":True},
      {"id":"D","text":"Article 226","correct":False},
    ],
    "correct": "C",
    "explanation": "Article 32 guarantees the Right to Constitutional Remedies, allowing citizens to approach the Supreme Court for enforcement of Fundamental Rights. Dr. Ambedkar called it the 'heart and soul' of the Constitution.",
    "difficulty": 0.35, "discrimination": 1.1,
    "type": "mcq",
  },
  # JEE
  {
    "topic": "Integration",
    "text": "Evaluate: ∫₀^(π/2) sin²(x) dx",
    "options": [
      {"id":"A","text":"π/4","correct":True},
      {"id":"B","text":"π/2","correct":False},
      {"id":"C","text":"1/2","correct":False},
      {"id":"D","text":"π","correct":False},
    ],
    "correct": "A",
    "explanation": "Using the identity sin²(x) = (1 - cos(2x))/2: ∫₀^(π/2) (1 - cos(2x))/2 dx = [x/2 - sin(2x)/4]₀^(π/2) = π/4.",
    "difficulty": 0.45, "discrimination": 1.2,
    "type": "mcq",
  },
  # NEET
  {
    "topic": "Human Physiology",
    "text": "Which of the following is NOT a function of the liver?",
    "options": [
      {"id":"A","text":"Synthesis of bile","correct":False},
      {"id":"B","text":"Detoxification of drugs","correct":False},
      {"id":"C","text":"Production of insulin","correct":True},
      {"id":"D","text":"Storage of glycogen","correct":False},
    ],
    "correct": "C",
    "explanation": "Insulin is produced by the beta cells of the islets of Langerhans in the pancreas, NOT the liver. The liver stores glycogen, synthesizes bile, and detoxifies harmful substances.",
    "difficulty": 0.40, "discrimination": 1.3,
    "type": "mcq",
  },
]

async def seed():
    async with Session() as session:
        # Insert topics
        print("🌱 Seeding topics for all exams...")
        topic_id_map = {}
        for t in ALL_TOPICS:
            tid = str(uuid.uuid4())
            topic_id_map[t["name"]] = tid
            await session.execute(text("""
                INSERT INTO topics (id, subject, name, difficulty_baseline, exam_targets, weight, order_index)
                VALUES (:id, :subject, :name, :diff, CAST(:exams AS jsonb), :weight, 0)
                ON CONFLICT DO NOTHING
            """), {
                "id": tid, "subject": t["subject"], "name": t["name"],
                "diff": t["diff"], "exams": json.dumps(t["exams"]), "weight": t["weight"],
            })

        # Insert questions
        print("📝 Seeding sample questions...")
        for q in SAMPLE_QUESTIONS:
            tid = topic_id_map.get(q["topic"])
            if not tid: continue
            await session.execute(text("""
                INSERT INTO questions
                    (id, topic_id, text, options, correct_answer, explanation,
                     difficulty, discrimination, question_type, tags)
                VALUES
                    (:id, :tid, :text, CAST(:opts AS jsonb), :ans, :expl, :diff, :disc, :qtype, '[]'::jsonb)
                ON CONFLICT DO NOTHING
            """), {
                "id": str(uuid.uuid4()), "tid": tid,
                "text": q["text"], "opts": json.dumps(q["options"]),
                "ans": q["correct"], "expl": q["explanation"],
                "diff": q["difficulty"], "disc": q["discrimination"],
                "qtype": q.get("type", "mcq"),
            })

        await session.commit()
        print(f"✅ Seeded {len(ALL_TOPICS)} topics + {len(SAMPLE_QUESTIONS)} questions")
        print(f"   JEE: {sum(1 for t in ALL_TOPICS if 'JEE' in t['exams'])} topics")
        print(f"   NEET: {sum(1 for t in ALL_TOPICS if 'NEET' in t['exams'])} topics")
        print(f"   GATE: {sum(1 for t in ALL_TOPICS if 'GATE' in t['exams'])} topics")
        print(f"   UPSC: {sum(1 for t in ALL_TOPICS if 'UPSC' in t['exams'])} topics")
        print(f"   CAT/GMAT/GRE: {sum(1 for t in ALL_TOPICS if 'CAT' in t['exams'])} topics")

if __name__ == "__main__":
    asyncio.run(seed())
