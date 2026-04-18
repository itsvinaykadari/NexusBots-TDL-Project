"""
Nexus Bots — Benchmark B2 (Context-Aware RAG).

Evaluates retrieval quality:
  1. FAISS + context re-rank (ours)
  2. FAISS only (no re-rank)
  3. BM25 baseline

Metrics: Recall@3, MRR

Usage:
    python eval/bench_rag.py

Output:
    research/results/b2_rag.csv
    research/results/b2_rag.md
"""

import csv
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    PRODUCT_CATALOG_PATH,
    RESULTS_DIR,
    TEST_PATH,
)

# ── Load product catalog ─────────────────────────────────────────────────────

def load_catalog() -> list[dict]:
    with open(PRODUCT_CATALOG_PATH, "r") as f:
        return json.load(f)


def build_corpus(catalog: list[dict]) -> list[str]:
    """Build text corpus from product catalog for embedding."""
    texts = []
    for p in catalog:
        parts = [
            p.get("name", ""),
            p.get("category", ""),
            p.get("description", ""),
            p.get("tagline", ""),
        ]
        tags = p.get("tags", [])
        if isinstance(tags, list):
            parts.extend(tags)
        texts.append(" ".join(str(part) for part in parts if part))
    return texts


# ── Gold labels: extract recommend queries with expected product IDs ─────────

def extract_recommend_queries(test_path: Path) -> list[dict]:
    """Extract recommend-type queries and derive gold product IDs from context."""
    queries = []
    with open(test_path, "r") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            assistant_msg = None
            for msg in row.get("messages", []):
                if msg["role"] == "assistant":
                    assistant_msg = msg["content"]
                elif msg["role"] == "user":
                    user_msg = msg["content"]

            if not assistant_msg:
                continue

            obj = json.loads(assistant_msg)
            tool = obj.get("tool", "")

            # Use recommend and search queries for RAG evaluation
            if tool not in ("recommend", "search_products"):
                continue

            args = obj.get("arguments", {})
            category = args.get("category", "")

            # Extract context
            parts = user_msg.split("\nContext: ", 1)
            query_text = parts[0].replace("Query: ", "")
            context = json.loads(parts[1]) if len(parts) > 1 else {}

            # Gold: products in the matching category
            queries.append({
                "query": query_text,
                "category": category,
                "context": context,
                "arguments": args,
            })

    return queries


# ── FAISS retriever ──────────────────────────────────────────────────────────

class FAISSRetriever:
    def __init__(self, catalog: list[dict], corpus: list[str]):
        from sentence_transformers import SentenceTransformer
        import faiss

        self.catalog = catalog
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        embeddings = self.model.encode(corpus, normalize_embeddings=True)
        self.index = faiss.IndexFlatIP(embeddings.shape[1])
        self.index.add(np.array(embeddings, dtype=np.float32))

    def retrieve(self, query: str, top_k: int = 3) -> list[int]:
        """Return list of product IDs (1-indexed) for top-k results."""
        q_emb = self.model.encode([query], normalize_embeddings=True)
        _, indices = self.index.search(np.array(q_emb, dtype=np.float32), top_k)
        return [self.catalog[i]["id"] for i in indices[0] if i < len(self.catalog)]


class FAISSContextRetriever(FAISSRetriever):
    """FAISS + context-aware re-ranking."""

    def retrieve_with_context(
        self, query: str, context: dict, category: str = "", top_k: int = 3
    ) -> list[int]:
        # Get more candidates for re-ranking
        q_emb = self.model.encode([query], normalize_embeddings=True)
        scores, indices = self.index.search(np.array(q_emb, dtype=np.float32), min(12, len(self.catalog)))

        candidates = []
        for rank, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if idx >= len(self.catalog):
                continue
            product = self.catalog[idx]
            boost = 0.0

            # Category match boost
            if category and product.get("category", "").lower() == category.lower():
                boost += 0.35

            # Viewed products boost
            viewed = context.get("viewed_products", [])
            if product["id"] in viewed:
                boost += 0.20

            # Cart items boost
            cart = context.get("cart_items", [])
            if product["id"] in cart:
                boost += 0.20

            # Current product boost
            current = context.get("current_product")
            if current and product["id"] == current:
                boost += 0.25

            candidates.append((product["id"], float(score) + boost))

        # Sort by boosted score
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [pid for pid, _ in candidates[:top_k]]


# ── BM25 retriever ───────────────────────────────────────────────────────────

class BM25Retriever:
    def __init__(self, catalog: list[dict], corpus: list[str]):
        from rank_bm25 import BM25Okapi

        self.catalog = catalog
        tokenized = [doc.lower().split() for doc in corpus]
        self.bm25 = BM25Okapi(tokenized)

    def retrieve(self, query: str, top_k: int = 3) -> list[int]:
        scores = self.bm25.get_scores(query.lower().split())
        top_indices = np.argsort(scores)[::-1][:top_k]
        return [self.catalog[i]["id"] for i in top_indices if i < len(self.catalog)]


# ── Metrics ──────────────────────────────────────────────────────────────────

def get_gold_ids(category: str, catalog: list[dict]) -> list[int]:
    """Gold = all products in the target category."""
    return [p["id"] for p in catalog if p.get("category", "").lower() == category.lower()]


def recall_at_k(retrieved: list[int], gold: list[int], k: int = 3) -> float:
    """Proportion of gold items found in top-k."""
    if not gold:
        return 0.0
    retrieved_k = set(retrieved[:k])
    return len(retrieved_k & set(gold)) / len(gold)


def reciprocal_rank(retrieved: list[int], gold: list[int]) -> float:
    """1/(rank of first relevant result)."""
    gold_set = set(gold)
    for i, pid in enumerate(retrieved):
        if pid in gold_set:
            return 1.0 / (i + 1)
    return 0.0


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not TEST_PATH.exists():
        print(f"Test set not found: {TEST_PATH}")
        print("Run prepare_dataset.py first.")
        sys.exit(1)

    if not PRODUCT_CATALOG_PATH.exists():
        print(f"Product catalog not found: {PRODUCT_CATALOG_PATH}")
        sys.exit(1)

    catalog = load_catalog()
    corpus = build_corpus(catalog)
    queries = extract_recommend_queries(TEST_PATH)

    print(f"Catalog: {len(catalog)} products")
    print(f"Eval queries: {len(queries)} (recommend + search)")

    if not queries:
        print("No recommend/search queries in test set. Skipping B2.")
        return

    # Initialize retrievers
    print("\nInitializing retrievers...")
    faiss_ctx = FAISSContextRetriever(catalog, corpus)
    faiss_only = FAISSRetriever(catalog, corpus)
    bm25 = BM25Retriever(catalog, corpus)

    systems = {
        "FAISS + Context Re-Rank (ours)": lambda q, ctx, cat: faiss_ctx.retrieve_with_context(q, ctx, cat),
        "FAISS Only": lambda q, ctx, cat: faiss_only.retrieve(q),
        "BM25": lambda q, ctx, cat: bm25.retrieve(q),
    }

    results = {}
    for sys_name, retrieve_fn in systems.items():
        print(f"\n=== {sys_name} ===")
        recall_sum = 0.0
        mrr_sum = 0.0
        n = 0

        for qobj in queries:
            gold = get_gold_ids(qobj["category"], catalog)
            if not gold:
                continue

            retrieved = retrieve_fn(qobj["query"], qobj["context"], qobj["category"])
            recall_sum += recall_at_k(retrieved, gold, k=3)
            mrr_sum += reciprocal_rank(retrieved, gold)
            n += 1

        results[sys_name] = {
            "recall_at_3": round(recall_sum / n, 4) if n else 0,
            "mrr": round(mrr_sum / n, 4) if n else 0,
            "count": n,
        }
        print(f"  Recall@3: {results[sys_name]['recall_at_3']}")
        print(f"  MRR:      {results[sys_name]['mrr']}")

    # Write results
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    csv_path = RESULTS_DIR / "b2_rag.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Method", "Recall@3", "MRR", "Queries"])
        for sys_name, r in results.items():
            writer.writerow([sys_name, r["recall_at_3"], r["mrr"], r["count"]])

    md_path = RESULTS_DIR / "b2_rag.md"
    with open(md_path, "w") as f:
        f.write("# B2 — Context-Aware RAG\n\n")
        f.write("| Method | Recall@3 | MRR |\n")
        f.write("|--------|----------|-----|\n")
        for sys_name, r in results.items():
            f.write(f"| {sys_name} | {r['recall_at_3']} | {r['mrr']} |\n")

    raw_path = RESULTS_DIR / "b2_raw.json"
    with open(raw_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults → {csv_path}")
    print(f"Table   → {md_path}")


if __name__ == "__main__":
    main()
