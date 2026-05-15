"""
ai/tutor/rag.py — Retrieval-Augmented Generation (RAG) Tutor Pipeline

Flow:
  1. Embed user question using text-embedding-3-small
  2. pgvector similarity search → top-k relevant document chunks
  3. Build context-aware prompt with retrieved chunks
  4. Stream GPT-4o-mini response token by token

The tutor adapts its teaching style based on topic difficulty and
the student's mastery level (passed as context).
"""

from typing import AsyncIterator, Optional
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db import settings


LOCAL_TOPIC_NOTES = {
    "Physics": "Start by listing known quantities, target quantity, formula, substitution, and unit check.",
    "Kinematics": "Kinematics describes motion using displacement, velocity, acceleration, and time.",
    "Newton's Laws of Motion": "Newton's second law says net force equals mass times acceleration: F = ma.",
    "Thermodynamics": "Thermodynamics connects heat, work, temperature, and internal energy.",
    "Electrostatics": "Electrostatics studies forces, fields, and potentials due to charges at rest.",
    "Integration": "Integration accumulates small changes and is often the reverse of differentiation.",
    "General": "Break the doubt into concept, formula or rule, example, and one practice question.",
}


class RAGTutor:

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
        self.chat_model = settings.OPENAI_CHAT_MODEL
        self.top_k = 4  # number of chunks to retrieve

    def _has_real_openai_key(self) -> bool:
        key = (settings.OPENAI_API_KEY or "").strip()
        if not key.startswith("sk-"):
            return False
        return key != "sk-..." and "placeholder" not in key.lower()

    async def _stream_local_answer(
        self,
        question: str,
        topic: str,
        context_chunks: Optional[list[str]] = None,
    ) -> AsyncIterator[str]:
        topic_note = LOCAL_TOPIC_NOTES.get(topic, LOCAL_TOPIC_NOTES["General"])
        context_note = ""
        if context_chunks:
            context_note = f"\n\nRelevant note from your material: {context_chunks[0][:500]}"

        answer = f"""I can help with this locally. A real OpenAI key is not configured, so I am using the built-in tutor mode.

Topic: {topic}

Core idea:
{topic_note}

For your question:
{question}

How to approach it:
1. Identify what the question is asking.
2. Write the relevant definition, formula, or rule.
3. Substitute known values or connect the concept to a simple example.
4. Check the final answer against units, signs, and assumptions.

Example:
If this is about Newton's second law, remember that acceleration changes only when there is a net external force. The relation F = ma means a larger force gives larger acceleration, while larger mass makes acceleration smaller for the same force.{context_note}

Follow-up: which exact step feels confusing: the formula, the meaning of the terms, or applying it to a question?"""

        for token in answer.replace("\n", " ").split(" "):
            yield token + " "

    async def embed(self, text_input: str) -> list[float]:
        """Generate embedding vector for a text string."""
        response = await self.client.embeddings.create(
            input=text_input,
            model=self.embedding_model,
        )
        return response.data[0].embedding

    async def retrieve_chunks(
        self,
        question_embedding: list[float],
        topic_id: Optional[str],
        db: AsyncSession,
    ) -> list[str]:
        """
        Find top-k most similar document chunks using pgvector cosine similarity.
        Optionally filter by topic_id.
        """
        embedding_str = "[" + ",".join(str(x) for x in question_embedding) + "]"

        if topic_id:
            query = text("""
                SELECT content
                FROM document_chunks
                WHERE topic_id = :topic_id
                ORDER BY embedding <=> :embedding ::vector
                LIMIT :k
            """)
            result = await db.execute(
                query,
                {"topic_id": topic_id, "embedding": embedding_str, "k": self.top_k}
            )
        else:
            query = text("""
                SELECT content
                FROM document_chunks
                ORDER BY embedding <=> :embedding ::vector
                LIMIT :k
            """)
            result = await db.execute(query, {"embedding": embedding_str, "k": self.top_k})

        rows = result.fetchall()
        return [row[0] for row in rows]

    def _build_system_prompt(
        self,
        topic: str,
        context_chunks: list[str],
        mastery_level: Optional[float] = None,
    ) -> str:
        """Build a rich system prompt with retrieved context."""
        level_instruction = ""
        if mastery_level is not None:
            if mastery_level < 0.3:
                level_instruction = """
The student is a BEGINNER in this topic.
- Use very simple language and everyday analogies
- Avoid jargon; define any technical terms you use
- Break down complex ideas into tiny steps
- Use examples before abstract principles
"""
            elif mastery_level < 0.7:
                level_instruction = """
The student has INTERMEDIATE understanding of this topic.
- Assume basic familiarity with terminology
- Build on foundational knowledge
- Introduce nuance and edge cases
- Use worked examples for complex problems
"""
            else:
                level_instruction = """
The student is ADVANCED in this topic.
- Assume strong foundational knowledge
- Focus on subtle distinctions and advanced applications
- Discuss edge cases, exceptions, and real-world complexity
- Use precise technical language
"""

        context_block = ""
        if context_chunks:
            context_block = "\n\n## Reference Material\n" + "\n\n---\n\n".join(context_chunks)

        return f"""You are an expert tutor specializing in {topic}.
Your goal is to help the student deeply understand concepts, not just memorize answers.

{level_instruction}

Teaching principles:
1. Start with the core intuition before formal definitions
2. Use diagrams in text form (ASCII) when helpful
3. Give concrete examples from JEE/NEET/UPSC exam context when relevant
4. If the student's question has a misconception, gently correct it
5. End your response with one thought-provoking follow-up question

{context_block}

If the reference material doesn't contain the answer, say so honestly and answer from your knowledge.
NEVER hallucinate formulas, values, or facts. If uncertain, say you're uncertain."""

    async def stream_answer(
        self,
        question: str,
        topic: str,
        topic_id: Optional[str] = None,
        mastery_level: Optional[float] = None,
        db: Optional[AsyncSession] = None,
    ) -> AsyncIterator[str]:
        """
        Full RAG pipeline: embed → retrieve → generate (streamed).

        Yields text chunks as they arrive from the LLM.
        """
        if not self._has_real_openai_key():
            async for chunk in self._stream_local_answer(question, topic):
                yield chunk
            return

        # Step 1: Embed the question
        try:
            question_embedding = await self.embed(question)
        except Exception:
            async for chunk in self._stream_local_answer(question, topic):
                yield chunk
            return

        # Step 2: Retrieve relevant context (only if DB is available)
        context_chunks: list[str] = []
        if db is not None:
            try:
                context_chunks = await self.retrieve_chunks(
                    question_embedding, topic_id, db
                )
            except Exception:
                # Graceful degradation: answer without context
                context_chunks = []

        # Step 3: Build system prompt with context
        system_prompt = self._build_system_prompt(topic, context_chunks, mastery_level)

        # Step 4: Stream LLM response
        try:
            stream = await self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
                max_tokens=1024,
                temperature=0.7,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception:
            async for chunk in self._stream_local_answer(question, topic, context_chunks):
                yield chunk
