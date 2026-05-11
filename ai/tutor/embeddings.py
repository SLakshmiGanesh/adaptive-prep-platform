"""
ai/tutor/embeddings.py — Document ingestion pipeline for RAG

Usage:
    python -m ai.tutor.embeddings --source "NCERT Physics Ch12" --file ./ncert_ch12.txt

This script:
  1. Reads a text file
  2. Splits into chunks (with overlap)
  3. Embeds each chunk using OpenAI
  4. Stores in PostgreSQL document_chunks table with pgvector
"""

import asyncio
import argparse
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from db import settings


client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

engine = create_async_engine(settings.DATABASE_URL)
AsyncSession = async_sessionmaker(engine)


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 100,
) -> list[str]:
    """
    Split text into overlapping chunks.
    Tries to break at sentence boundaries.
    """
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])

        # Try to end at a sentence boundary
        for punct in [". ", "! ", "? ", "\n\n"]:
            last_punct = chunk.rfind(punct)
            if last_punct > chunk_size * 0.6:
                chunk = chunk[: last_punct + 1]
                end = start + len(chunk.split())
                break

        chunks.append(chunk.strip())
        start = end - overlap

    return [c for c in chunks if len(c) > 50]  # filter very short chunks


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts. OpenAI allows up to 2048 per request."""
    response = await client.embeddings.create(
        input=texts,
        model=settings.OPENAI_EMBEDDING_MODEL,
    )
    return [item.embedding for item in response.data]


async def ingest_file(
    filepath: str,
    source_name: str,
    topic_id: Optional[str] = None,
    chunk_size: int = 500,
    overlap: int = 100,
):
    """
    Full pipeline: read file → chunk → embed → store.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
    print(f"Created {len(chunks)} chunks from {filepath}")

    # Embed in batches of 100
    batch_size = 100
    all_embeddings = []

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        embeddings = await embed_batch(batch)
        all_embeddings.extend(embeddings)
        print(f"  Embedded {min(i + batch_size, len(chunks))}/{len(chunks)} chunks...")

    # Store in database
    async with AsyncSession() as session:
        for idx, (chunk, embedding) in enumerate(zip(chunks, all_embeddings)):
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
            await session.execute(
                text("""
                    INSERT INTO document_chunks
                        (source, topic_id, content, embedding, chunk_index)
                    VALUES
                        (:source, :topic_id, :content, :embedding ::vector, :chunk_index)
                """),
                {
                    "source": source_name,
                    "topic_id": topic_id,
                    "content": chunk,
                    "embedding": embedding_str,
                    "chunk_index": idx,
                },
            )
        await session.commit()

    print(f"✅ Ingested {len(chunks)} chunks from '{source_name}' into document_chunks")


async def main():
    parser = argparse.ArgumentParser(description="Ingest documents for RAG tutor")
    parser.add_argument("--file", required=True, help="Path to text file")
    parser.add_argument("--source", required=True, help="Source name (e.g. 'NCERT Physics Ch12')")
    parser.add_argument("--topic-id", default=None, help="Optional topic UUID to filter retrieval")
    parser.add_argument("--chunk-size", type=int, default=500)
    parser.add_argument("--overlap", type=int, default=100)
    args = parser.parse_args()

    await ingest_file(
        filepath=args.file,
        source_name=args.source,
        topic_id=args.topic_id,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
    )


if __name__ == "__main__":
    asyncio.run(main())
