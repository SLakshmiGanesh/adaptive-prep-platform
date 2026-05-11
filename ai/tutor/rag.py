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


class RAGTutor:

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
        self.chat_model = settings.OPENAI_CHAT_MODEL
        self.top_k = 4  # number of chunks to retrieve

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
        # Step 1: Embed the question
        question_embedding = await self.embed(question)

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
