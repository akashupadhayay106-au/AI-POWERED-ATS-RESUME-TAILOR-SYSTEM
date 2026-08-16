import faiss
import numpy as np
import google.generativeai as genai
from typing import List, Dict, Any, Tuple
import os
import re
from config import settings

class RAGService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key and "your_" not in self.api_key:
            genai.configure(api_key=self.api_key)
        self.dimension = 3072  # gemini-embedding-2 output dimension

    def _get_embedding(self, text: str) -> np.ndarray:
        """Fetch embedding vector for a single text chunk."""
        try:
            response = genai.embed_content(
                model="models/gemini-embedding-2",
                content=text,
                task_type="retrieval_document"
            )
            vector = response.get("embedding", [])
            return np.array(vector, dtype=np.float32)
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Return zero vector fallback
            return np.zeros(self.dimension, dtype=np.float32)

    def _get_embeddings_batch(self, texts: List[str]) -> np.ndarray:
        """Fetch embeddings for a batch of text chunks."""
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        try:
            # Batch embedding using API
            response = genai.embed_content(
                model="models/gemini-embedding-2",
                content=texts,
                task_type="retrieval_document"
            )
            # Response 'embedding' key will contain a list of vectors
            embeddings = response.get("embedding", [])
            return np.array(embeddings, dtype=np.float32)
        except Exception as e:
            print(f"Batch embedding error: {e}. Falling back to iterative embeddings.")
            # Iterative fallback
            vectors = [self._get_embedding(t) for t in texts]
            return np.array(vectors, dtype=np.float32)

    def _chunk_text(self, text: str) -> List[str]:
        """Split resume text into semantic chunks (by sections or paragraphs)."""
        # Split on double newlines or lines representing headings
        raw_chunks = re.split(r'\n\s*\n', text)
        chunks = []
        for chunk in raw_chunks:
            chunk_clean = chunk.strip()
            if len(chunk_clean) > 20:  # ignore empty/trivial lines
                chunks.append(chunk_clean)
        
        # If chunks is empty, fallback to lines
        if not chunks:
            chunks = [line.strip() for line in text.split('\n') if len(line.strip()) > 15]
            
        return chunks

    def retrieve_relevant_context(self, resume_text: str, jd_text: str, k: int = 5) -> str:
        """
        Build index of resume chunks, and search with the JD query to retrieve 
        the top k semantically relevant chunks.
        """
        if not resume_text or not resume_text.strip():
            return ""
        if not jd_text or not jd_text.strip():
            # If no JD is provided, return the full resume text as-is
            return resume_text

        # 1. Chunk resume text
        chunks = self._chunk_text(resume_text)
        if not chunks:
            return resume_text
        
        # 2. Get embeddings
        embeddings = self._get_embeddings_batch(chunks)
        if len(embeddings) == 0:
            return resume_text

        # 3. Create FAISS index and add vectors
        index = faiss.IndexFlatL2(self.dimension)
        index.add(embeddings)

        # 4. Embed query (the job description)
        try:
            query_response = genai.embed_content(
                model="models/gemini-embedding-2",
                content=jd_text,
                task_type="retrieval_query"
            )
            query_vector = np.array([query_response.get("embedding", [])], dtype=np.float32)
        except Exception as e:
            print(f"Query embedding generation failed: {e}")
            return resume_text

        # 5. Search in index
        k_val = min(k, len(chunks))
        distances, indices = index.search(query_vector, k_val)

        # 6. Gather and sort results by original order to preserve flow
        retrieved_indices = [int(idx) for idx in indices[0] if idx != -1]
        retrieved_indices.sort()  # preserves document chronology
        
        retrieved_chunks = [chunks[idx] for idx in retrieved_indices]
        
        return "\n\n".join(retrieved_chunks)

rag_service = RAGService()
