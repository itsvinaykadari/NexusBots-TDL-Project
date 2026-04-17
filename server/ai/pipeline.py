#!/usr/bin/env python3
"""Nexus Bots function-calling pipeline.

This module exposes `run_pipeline(message, language, context)` and supports
stdin/stdout JSON mode for Node interop.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ALLOWED_CATEGORIES = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
ALLOWED_CATEGORY_SET = set(ALLOWED_CATEGORIES)
ALLOWED_PAGES = ["home", "catalog", "assistant", "product", "cart", "orders"]
ALLOWED_PAGE_SET = set(ALLOWED_PAGES)
ALLOWED_LANGUAGES = {"en", "hi", "te"}
ALLOWED_FOCUS = {
    "price",
    "suction",
    "battery",
    "payload",
    "safety",
    "maintenance",
    "camera",
    "mobility",
    "specs",
    "warranty",
}

CATEGORY_HINTS = {
    "Kitchen": ["kitchen", "cook", "cooking", "appliance", "recipe"],
    "Home Cleaner": ["clean", "cleaner", "vacuum", "mop", "window", "dust"],
    "Drone": ["drone", "fly", "flying", "thermal", "patrol", "aerial", "pool"],
    "Humanoid": ["humanoid", "kid", "kids", "child", "education", "classroom", "coding"],
}

PAGE_HINTS = {
    "orders": ["order", "orders", "track", "tracking", "delivery", "history"],
    "assistant": ["assistant", "chat", "ai", "help"],
    "catalog": ["catalog", "browse", "list", "products", "shop"],
    "product": ["product", "detail", "details", "spec", "specs", "robot"],
    "cart": ["cart", "checkout", "basket"],
    "home": ["home", "landing", "start"],
}

TECHNICAL_TOKENS = {
    "latency",
    "throughput",
    "payload",
    "ip55",
    "slam",
    "spec",
    "specs",
    "integration",
    "api",
    "sdk",
    "runtime",
    "thermal",
    "warranty",
    "maintenance",
    "precision",
    "coverage",
    "battery",
}

TECHNICAL_TOKENS_HI = {
    "विनिर्देश",
    "बैटरी",
    "सेंसर",
    "वारंटी",
    "रखरखाव",
    "पेलोड",
    "कैमरा",
    "थर्मल",
    "सटीकता",
    "एपीआई",
    "तुलना",
}

TECHNICAL_TOKENS_TE = {
    "వివరాలు",
    "బ్యాటరీ",
    "సెన్సార్",
    "వారెంటీ",
    "నిర్వహణ",
    "పేలోడ్",
    "కెమెరా",
    "థర్మల్",
    "ఖచ్చితత్వం",
    "ఏపీఐ",
    "పోలిక",
}

_ROUTE_MAP = {
    "home": "/",
    "catalog": "/catalog",
    "assistant": "/assistant",
    "orders": "/orders",
}

_FC_GENERATOR = None
_FC_MODEL_ERROR = None
_RUNTIME_SINGLETON: Optional["PipelineRuntime"] = None


def _get_runtime() -> "PipelineRuntime":
    global _RUNTIME_SINGLETON
    if _RUNTIME_SINGLETON is None:
        _RUNTIME_SINGLETON = PipelineRuntime()
    return _RUNTIME_SINGLETON


def _safe_json_loads(value: Any, default: Any) -> Any:
    if not isinstance(value, str):
        return default
    try:
        return json.loads(value)
    except Exception:
        return default


def _to_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    try:
        return int(value)
    except Exception:
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _normalize_language(language: Any) -> str:
    if not isinstance(language, str):
        return "en"
    code = language.strip().lower()
    return code if code in ALLOWED_LANGUAGES else "en"


def _normalize_page(page: Any) -> str:
    if not isinstance(page, str):
        return "home"

    normalized = page.strip().lower().replace("_", " ")
    if normalized in {"robot", "robot detail", "robot details", "detail", "details"}:
        return "product"
    if normalized == "/":
        return "home"

    compact = normalized.replace(" ", "")
    if compact == "orderhistory":
        return "orders"

    if normalized in ALLOWED_PAGE_SET:
        return normalized
    return "home"


def _normalize_category(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    value = value.strip()
    if value in ALLOWED_CATEGORY_SET:
        return value
    return ""


def normalize_context(context: Any) -> Dict[str, Any]:
    if not isinstance(context, dict):
        context = {}

    viewed_products = []
    for item in context.get("viewedProducts", [])[:20]:
        if not isinstance(item, dict):
            continue
        product_id = _to_int(item.get("id"))
        if product_id is None:
            continue
        viewed_products.append(
            {
                "id": product_id,
                "name": str(item.get("name", "")).strip(),
                "category": _normalize_category(item.get("category")),
                "timestamp": _to_int(item.get("timestamp"), 0) or 0,
            }
        )

    cart = []
    for item in context.get("cart", [])[:20]:
        if not isinstance(item, dict):
            continue
        product_id = _to_int(item.get("id"))
        if product_id is None:
            continue
        cart.append(
            {
                "id": product_id,
                "name": str(item.get("name", "")).strip(),
                "category": _normalize_category(item.get("category")),
                "price": _to_float(item.get("price")),
                "quantity": max(1, _to_int(item.get("quantity"), 1) or 1),
            }
        )

    current_product_raw = context.get("currentProduct")
    current_product = None
    if isinstance(current_product_raw, dict):
        current_product_id = _to_int(current_product_raw.get("id"))
        if current_product_id is not None:
            current_product = {
                "id": current_product_id,
                "name": str(current_product_raw.get("name", "")).strip(),
                "category": _normalize_category(current_product_raw.get("category")),
            }

    return {
        "currentPage": _normalize_page(context.get("currentPage", "home")),
        "viewedProducts": viewed_products,
        "cart": cart,
        "currentProduct": current_product,
        "searchQuery": str(context.get("searchQuery", "")).strip(),
        "selectedCategory": _normalize_category(context.get("selectedCategory")),
    }


class RecommendationRanker:
    """Semantic + context-aware recommendation ranker."""

    def __init__(self, products: List[Dict[str, Any]]) -> None:
        self.products = products
        self._encoder = None
        self._faiss = None
        self._np = None
        self._index = None
        self._vectors = None
        self._id_lookup: List[int] = []
        self.semantic_enabled = False
        self._init_semantic_stack()

    def _init_semantic_stack(self) -> None:
        enabled_flag = os.getenv("ENABLE_SEMANTIC_RAG", "0").strip().lower()
        if enabled_flag not in {"1", "true", "yes"}:
            self.semantic_enabled = False
            return

        model_name = os.getenv(
            "RAG_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        try:
            import numpy as np  # type: ignore
            import faiss  # type: ignore
            from sentence_transformers import SentenceTransformer  # type: ignore

            encoder = SentenceTransformer(model_name)
            corpus = [self._as_embedding_text(product)
                      for product in self.products]
            vectors = encoder.encode(
                corpus, normalize_embeddings=True, show_progress_bar=False)
            vectors = np.asarray(vectors, dtype="float32")
            index = faiss.IndexFlatIP(vectors.shape[1])
            index.add(vectors)

            self._encoder = encoder
            self._faiss = faiss
            self._np = np
            self._index = index
            self._vectors = vectors
            self._id_lookup = [product["id"] for product in self.products]
            self.semantic_enabled = True
        except Exception:
            self.semantic_enabled = False

    @staticmethod
    def _as_embedding_text(product: Dict[str, Any]) -> str:
        tags = " ".join(product.get("tags") or [])
        return " ".join(
            [
                str(product.get("name", "")),
                str(product.get("category", "")),
                str(product.get("short_desc", "")),
                str(product.get("description", "")),
                tags,
            ]
        ).strip()

    @staticmethod
    def _lexical_score(need: str, product: Dict[str, Any]) -> float:
        query_tokens = set(re.findall(r"[a-z0-9]+", need.lower()))
        if not query_tokens:
            return 0.0

        haystack = RecommendationRanker._as_embedding_text(product).lower()
        hits = 0
        for token in query_tokens:
            if token in haystack:
                hits += 1

        ratio = hits / max(1, len(query_tokens))
        rating_boost = float(product.get("rating") or 0.0) / 10.0
        return ratio + rating_boost

    @staticmethod
    def _context_boost(product: Dict[str, Any], context: Dict[str, Any]) -> float:
        score = 0.0
        selected_category = context.get("selectedCategory")
        if selected_category and selected_category == product.get("category"):
            score += 0.35

        current_product = context.get("currentProduct")
        if isinstance(current_product, dict) and current_product.get("id") == product.get("id"):
            score += 0.25

        viewed_ids = {item.get("id") for item in context.get(
            "viewedProducts", []) if isinstance(item, dict)}
        if product.get("id") in viewed_ids:
            score += 0.20

        cart_ids = {item.get("id") for item in context.get(
            "cart", []) if isinstance(item, dict)}
        if product.get("id") in cart_ids:
            score += 0.20

        return score

    @staticmethod
    def _budget_boost(product: Dict[str, Any], budget: int) -> float:
        price = float(product.get("price") or 0.0)
        if price <= 0:
            return 0.0
        if price <= budget:
            remaining = max(0.0, budget - price)
            return 0.15 + min(0.20, remaining / max(1.0, budget))
        overshoot = price - budget
        penalty = min(0.30, overshoot / max(1.0, budget))
        return -penalty

    def rank(
        self,
        need: str,
        budget: int,
        category: str,
        context: Dict[str, Any],
        top_k: int = 4,
    ) -> List[Tuple[Dict[str, Any], float]]:
        candidates = []
        for product in self.products:
            if category and product.get("category") != category:
                continue
            candidates.append(product)

        if not candidates:
            return []

        semantic_scores: Dict[int, float] = {
            product["id"]: 0.0 for product in candidates}

        if self.semantic_enabled and self._encoder is not None and self._index is not None:
            query_vec = self._encoder.encode(
                [need or "robot recommendation"], normalize_embeddings=True)
            query_vec = self._np.asarray(query_vec, dtype="float32")
            distances, indexes = self._index.search(
                query_vec, len(self._id_lookup))

            for distance, index in zip(distances[0], indexes[0]):
                if index < 0 or index >= len(self._id_lookup):
                    continue
                product_id = self._id_lookup[index]
                semantic_scores[product_id] = max(
                    semantic_scores.get(product_id, 0.0), float(distance))
        else:
            for product in candidates:
                semantic_scores[product["id"]
                                ] = self._lexical_score(need, product)

        scored = []
        for product in candidates:
            product_id = product["id"]
            base = semantic_scores.get(product_id, 0.0)
            total_score = base
            total_score += self._context_boost(product, context)
            total_score += self._budget_boost(product, budget)
            scored.append((product, total_score))

        scored.sort(key=lambda row: row[1], reverse=True)

        filtered = [row for row in scored if float(
            row[0].get("price") or 0.0) <= budget * 1.2]
        if not filtered:
            filtered = scored

        return filtered[:top_k]


class PipelineRuntime:
    def __init__(self, db_path: Optional[str] = None) -> None:
        default_db = Path(__file__).resolve(
        ).parents[1] / "database" / "nexusbots.db"
        self.db_path = Path(db_path or os.getenv(
            "NEXUSBOTS_DB_PATH", str(default_db))).resolve()
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row

        self.products = self._load_products()
        self.product_by_id = {product["id"]: product for product in self.products}
        self.ranker = RecommendationRanker(self.products)

    def _load_products(self) -> List[Dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM products ORDER BY id").fetchall()
        products = []
        for row in rows:
            item = dict(row)
            item["id"] = _to_int(item.get("id"), 0) or 0
            item["price"] = _to_float(item.get("price"), 0.0)
            item["rating"] = _to_float(item.get("rating"), 0.0)
            item["in_stock"] = bool(item.get("in_stock"))
            item["specs"] = _safe_json_loads(item.get("specs"), {})
            item["tags"] = _safe_json_loads(item.get("tags"), [])
            products.append(item)
        return products

    def close(self) -> None:
        try:
            self.conn.close()
        except Exception:
            pass

    @staticmethod
    def _extract_ids(text: str) -> List[int]:
        ids: List[int] = []
        lowered = text.lower()
        has_compare_ctx = any(
            tok in lowered for tok in ("compare", "vs", "versus", "difference", "between")
        )

        pattern = re.compile(
            r"(?:#|\bid\b|\bproduct\b|\brobot\b|\bitem\b)\s*:?#?\s*([1-9]|1[0-2])\b",
            re.IGNORECASE,
        )
        for match in pattern.findall(text):
            value = _to_int(match)
            if value is not None:
                ids.append(value)

        if has_compare_ctx and len(ids) < 2:
            pair = re.findall(
                r"\b([1-9]|1[0-2])\b\s*(?:and|&|,|vs|versus|to)\s*\b([1-9]|1[0-2])\b",
                lowered,
            )
            for a, b in pair:
                for raw in (a, b):
                    value = _to_int(raw)
                    if value is not None and value not in ids:
                        ids.append(value)

        return ids

    @staticmethod
    def _extract_budget(text: str) -> Optional[int]:
        lowered = text.lower()
        pattern = re.compile(
            r"(?:₹|rs\.?|inr|\$|usd|budget(?:\s+of)?|under|below|less than|upto|up to|around|about)\s*"
            r"([0-9]{2,5}(?:\.[0-9]{1,2})?)",
            re.IGNORECASE,
        )
        budgets: List[int] = []
        for value in pattern.findall(lowered):
            amount = _to_float(value)
            if 50 <= amount <= 50000:
                budgets.append(int(amount))

        trailing = re.findall(
            r"([0-9]{2,5}(?:\.[0-9]{1,2})?)\s*(?:dollars|usd|rupees|rs|inr)\b",
            lowered,
        )
        for value in trailing:
            amount = _to_float(value)
            if 50 <= amount <= 50000:
                budgets.append(int(amount))

        if not budgets:
            return None
        return max(budgets)

    @staticmethod
    def _extract_focus(text: str) -> str:
        text_lower = text.lower()
        for focus in ALLOWED_FOCUS:
            if focus in text_lower:
                return focus
        if "better" in text_lower or "best" in text_lower:
            return "specs"
        return "specs"

    def _detect_category(self, text: str, context: Dict[str, Any]) -> str:
        text_lower = text.lower()
        for category in ALLOWED_CATEGORIES:
            if category.lower() in text_lower:
                return category

        for category, hints in CATEGORY_HINTS.items():
            if any(hint in text_lower for hint in hints):
                return category

        selected = context.get("selectedCategory")
        if selected in ALLOWED_CATEGORY_SET:
            return selected

        current_product = context.get("currentProduct")
        if isinstance(current_product, dict):
            current_category = current_product.get("category")
            if current_category in ALLOWED_CATEGORY_SET:
                return current_category

        for item in reversed(context.get("viewedProducts", [])):
            if isinstance(item, dict) and item.get("category") in ALLOWED_CATEGORY_SET:
                return item["category"]

        return ""

    def _detect_page(self, text: str, context: Dict[str, Any]) -> str:
        text_lower = text.lower()
        for page, hints in PAGE_HINTS.items():
            if any(hint in text_lower for hint in hints):
                return page

        current_page = context.get("currentPage", "home")
        if current_page in ALLOWED_PAGE_SET:
            return current_page

        return "home"

    def _default_product_id(self, context: Dict[str, Any]) -> int:
        current_product = context.get("currentProduct")
        if isinstance(current_product, dict):
            product_id = _to_int(current_product.get("id"))
            if product_id in self.product_by_id:
                return product_id

        for item in reversed(context.get("viewedProducts", [])):
            product_id = _to_int(item.get("id"))
            if product_id in self.product_by_id:
                return product_id

        return 1

    def _heuristic_tool_call(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        text = message.lower()
        ids = self._extract_ids(text)
        category = self._detect_category(text, context)

        if any(token in text for token in ["compare", "difference", "vs", "versus"]):
            selected = ids[:2]
            if len(selected) < 2:
                fallback_id = self._default_product_id(context)
                selected.append(fallback_id)
                if len(selected) < 2:
                    selected.append(2)
                if selected[0] == selected[1]:
                    selected[1] = 2 if selected[0] != 2 else 3

            return {
                "tool": "compare_products",
                "arguments": {
                    "product_id_1": selected[0],
                    "product_id_2": selected[1],
                    "focus": self._extract_focus(text),
                },
            }

        if any(token in text for token in ["recommend", "best", "suggest", "which one", "what should i buy"]):
            budget = self._extract_budget(text)
            if budget is None:
                budget = 2000
            return {
                "tool": "recommend",
                "arguments": {
                    "need": message.strip() or "general purpose",
                    "budget": int(max(50, min(20000, budget))),
                    "category": category,
                },
            }

        if any(token in text for token in ["add to cart", "buy", "purchase", "add this"]):
            product_id = ids[0] if ids else self._default_product_id(context)
            return {
                "tool": "add_to_cart",
                "arguments": {"product_id": product_id},
            }

        if any(token in text for token in ["go to", "navigate", "open", "take me", "show page"]):
            page = self._detect_page(text, context)
            params: Dict[str, Any] = {}
            if category:
                params["category"] = category
            if ids:
                params["product_id"] = ids[0]
            query = context.get("searchQuery")
            if isinstance(query, str) and query.strip():
                params["query"] = query.strip()
            return {
                "tool": "navigate_to",
                "arguments": {
                    "page": page,
                    "params": params,
                },
            }

        if any(token in text for token in ["detail", "details", "spec", "specs", "price of", "about"]):
            product_id = ids[0] if ids else self._default_product_id(context)
            return {
                "tool": "get_product",
                "arguments": {"product_id": product_id},
            }

        return {
            "tool": "search_products",
            "arguments": {
                "query": message.strip() or context.get("searchQuery") or "robot",
                "category": category or context.get("selectedCategory") or "",
            },
        }

    def _model_tool_call(self, message: str, language: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        generator = _load_fc_generator()
        if generator is None:
            return None

        prompt = _build_function_prompt(
            message=message, language=language, context=context)
        try:
            outputs = generator(
                prompt,
                max_new_tokens=180,
                do_sample=False,
                temperature=0.0,
                return_full_text=False,
            )
            text = outputs[0].get("generated_text", "") if outputs else ""
            parsed = _extract_json_object(text)
            if not isinstance(parsed, dict):
                return None
            tool = parsed.get("tool")
            arguments = parsed.get("arguments")
            if tool not in {
                "search_products",
                "get_product",
                "compare_products",
                "recommend",
                "add_to_cart",
                "navigate_to",
            }:
                return None
            if not isinstance(arguments, dict):
                arguments = {}
            return {"tool": tool, "arguments": arguments}
        except Exception:
            return None

    def _sanitize_tool_call(self, tool_call: Dict[str, Any], message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        tool = tool_call.get("tool")
        args = tool_call.get("arguments") if isinstance(
            tool_call.get("arguments"), dict) else {}

        if tool == "search_products":
            category = _normalize_category(args.get("category"))
            if not category:
                category = self._detect_category(message, context)
            query = str(args.get("query", message)).strip() or "robot"
            return {"tool": tool, "arguments": {"query": query, "category": category}}

        if tool == "get_product":
            product_id = _to_int(args.get("product_id"),
                                 self._default_product_id(context))
            if product_id not in self.product_by_id:
                product_id = self._default_product_id(context)
            return {"tool": tool, "arguments": {"product_id": product_id}}

        if tool == "compare_products":
            pid1 = _to_int(args.get("product_id_1"),
                           self._default_product_id(context))
            pid2 = _to_int(args.get("product_id_2"), 2)
            if pid1 not in self.product_by_id:
                pid1 = self._default_product_id(context)
            if pid2 not in self.product_by_id:
                pid2 = 2 if pid1 != 2 else 3
            if pid1 == pid2:
                pid2 = 2 if pid1 != 2 else 3

            focus = str(args.get("focus", "specs")).strip().lower() or "specs"
            if focus not in ALLOWED_FOCUS:
                focus = "specs"

            return {
                "tool": tool,
                "arguments": {
                    "product_id_1": pid1,
                    "product_id_2": pid2,
                    "focus": focus,
                },
            }

        if tool == "recommend":
            need = str(args.get("need", message)).strip(
            ) or "general-purpose robotics"
            budget = _to_int(args.get("budget"),
                             self._extract_budget(message) or 2000) or 2000
            budget = int(max(50, min(20000, budget)))
            category = _normalize_category(args.get("category"))
            if not category:
                category = self._detect_category(message, context)
            return {
                "tool": tool,
                "arguments": {
                    "need": need,
                    "budget": budget,
                    "category": category,
                },
            }

        if tool == "add_to_cart":
            product_id = _to_int(args.get("product_id"),
                                 self._default_product_id(context))
            if product_id not in self.product_by_id:
                product_id = self._default_product_id(context)
            return {"tool": tool, "arguments": {"product_id": product_id}}

        if tool == "navigate_to":
            page = _normalize_page(
                args.get("page", self._detect_page(message, context)))
            params = args.get("params") if isinstance(
                args.get("params"), dict) else {}
            normalized_params: Dict[str, Any] = {}

            category = _normalize_category(params.get("category"))
            if category:
                normalized_params["category"] = category

            product_id = _to_int(params.get("product_id"))
            if product_id in self.product_by_id:
                normalized_params["product_id"] = product_id

            query = params.get("query")
            if isinstance(query, str) and query.strip():
                normalized_params["query"] = query.strip()

            sort = params.get("sort")
            if sort in {"price_asc", "price_desc", "rating_desc", "latest"}:
                normalized_params["sort"] = sort

            return {"tool": tool, "arguments": {"page": page, "params": normalized_params}}

        return self._heuristic_tool_call(message, context)

    def search_products(self, query: str, category: str) -> Dict[str, Any]:
        query_lower = query.lower()
        filtered = []
        category_active = category in ALLOWED_CATEGORY_SET
        for product in self.products:
            if category_active and product.get("category") != category:
                continue

            haystack = " ".join(
                [
                    str(product.get("name", "")),
                    str(product.get("short_desc", "")),
                    str(product.get("description", "")),
                    " ".join(product.get("tags") or []),
                ]
            ).lower()
            if query_lower in haystack:
                filtered.append(product)

        if not filtered:
            filtered = [
                product
                for product in self.products
                if category not in ALLOWED_CATEGORY_SET or product.get("category") == category
            ]
            filtered = sorted(filtered, key=lambda item: float(
                item.get("rating") or 0.0), reverse=True)[:4]

        return {
            "summary": f"Found {len(filtered)} product(s) for '{query}'.",
            "products": filtered[:6],
            "total": len(filtered),
        }

    def get_product(self, product_id: int) -> Dict[str, Any]:
        product = self.product_by_id.get(product_id)
        if not product:
            return {
                "summary": "Product not found for the provided ID.",
                "product": None,
            }
        return {
            "summary": f"Fetched details for {product['name']}.",
            "product": product,
        }

    def compare_products(self, product_id_1: int, product_id_2: int, focus: str) -> Dict[str, Any]:
        first = self.product_by_id.get(product_id_1)
        second = self.product_by_id.get(product_id_2)
        if not first or not second:
            return {
                "summary": "Unable to compare because one or both product IDs are invalid.",
                "comparison": None,
            }

        focus_key = focus or "specs"
        focus_values = {
            "product_1": first.get("specs", {}).get(focus_key),
            "product_2": second.get("specs", {}).get(focus_key),
        }

        price_diff = float(first.get("price") or 0.0) - \
            float(second.get("price") or 0.0)

        return {
            "summary": f"Compared {first['name']} and {second['name']} on {focus_key}.",
            "comparison": {
                "focus": focus_key,
                "product_1": first,
                "product_2": second,
                "focus_values": focus_values,
                "price_difference": round(price_diff, 2),
                "higher_rated": first["id"] if first.get("rating", 0) >= second.get("rating", 0) else second["id"],
            },
        }

    def recommend(self, need: str, budget: int, category: str, context: Dict[str, Any]) -> Dict[str, Any]:
        ranked = self.ranker.rank(
            need=need, budget=budget, category=category, context=context, top_k=4)
        recommendations = [
            {
                "rank_score": round(score, 4),
                "id": product["id"],
                "name": product["name"],
                "category": product["category"],
                "price": product["price"],
                "rating": product["rating"],
                "short_desc": product.get("short_desc"),
                "in_stock": product.get("in_stock", False),
            }
            for product, score in ranked
        ]

        return {
            "summary": f"Generated {len(recommendations)} recommendation(s) for category {category} under budget {budget}.",
            "recommendations": recommendations,
            "strategy": {
                "semantic_rag": self.ranker.semantic_enabled,
                "context_rerank": True,
            },
        }

    def add_to_cart(self, product_id: int) -> Dict[str, Any]:
        product = self.product_by_id.get(product_id)
        if not product:
            return {
                "summary": "Cannot add to cart because product ID is invalid.",
                "added": None,
            }

        return {
            "summary": f"Prepared {product['name']} for cart insertion.",
            "added": {
                "id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "category": product["category"],
            },
        }

    def navigate_to(self, page: str, params: Dict[str, Any]) -> Dict[str, Any]:
        page = _normalize_page(page)
        route = _ROUTE_MAP.get(page, "/")

        if page == "product":
            product_id = _to_int(params.get("product_id"))
            if product_id in self.product_by_id:
                route = f"/robot/{product_id}"
            else:
                route = "/catalog"

        if page == "cart":
            return {
                "summary": "Requested cart navigation; open the cart drawer in UI.",
                "navigation": {
                    "page": "cart",
                    "route": "/catalog",
                    "client_action": "open_cart_drawer",
                    "params": params,
                },
            }

        return {
            "summary": f"Navigate user to {page}.",
            "navigation": {
                "page": page,
                "route": route,
                "params": params,
            },
        }

    def execute_tool(self, tool: str, arguments: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        if tool == "search_products":
            return self.search_products(query=arguments["query"], category=arguments["category"])

        if tool == "get_product":
            return self.get_product(product_id=arguments["product_id"])

        if tool == "compare_products":
            return self.compare_products(
                product_id_1=arguments["product_id_1"],
                product_id_2=arguments["product_id_2"],
                focus=arguments["focus"],
            )

        if tool == "recommend":
            return self.recommend(
                need=arguments["need"],
                budget=arguments["budget"],
                category=arguments["category"],
                context=context,
            )

        if tool == "add_to_cart":
            return self.add_to_cart(product_id=arguments["product_id"])

        if tool == "navigate_to":
            return self.navigate_to(page=arguments["page"], params=arguments["params"])

        return {"summary": "Unknown tool requested."}

    @staticmethod
    def _collect_product_ids(payload: Any) -> List[int]:
        found: set[int] = set()

        def walk(node: Any) -> None:
            if isinstance(node, dict):
                value = _to_int(node.get("id"))
                if value is not None and 1 <= value <= 12:
                    found.add(value)
                for nested in node.values():
                    walk(nested)
            elif isinstance(node, list):
                for nested in node:
                    walk(nested)

        walk(payload)
        return sorted(found)

    def decide_tool(self, message: str, language: str, context: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
        tool_call = self._model_tool_call(
            message=message, language=language, context=context)
        if tool_call:
            return self._sanitize_tool_call(tool_call, message=message, context=context), "model"
        return self._sanitize_tool_call(self._heuristic_tool_call(message, context), message=message, context=context), "heuristic"


def detect_proficiency(message: str, context: Dict[str, Any], language: str = "en") -> str:
    text = message.lower()
    tokens = re.findall(r"[\w]+", text, flags=re.UNICODE)
    score = 0

    if len(tokens) >= 18:
        score += 1

    technical_hits = sum(1 for token in TECHNICAL_TOKENS if token in text)
    if language == "hi":
        technical_hits += sum(1 for token in TECHNICAL_TOKENS_HI if token in message)
    elif language == "te":
        technical_hits += sum(1 for token in TECHNICAL_TOKENS_TE if token in message)

    if technical_hits >= 2:
        score += 2
    elif technical_hits == 1:
        score += 1

    viewed = context.get("viewedProducts", [])
    cart = context.get("cart", [])
    if isinstance(viewed, list) and len(viewed) >= 4:
        score += 1
    if isinstance(cart, list) and len(cart) >= 2:
        score += 1

    en_keywords = ["compare", "benchmark", "tradeoff", "spec", "payload", "latency"]
    hi_keywords = ["तुलना", "विनिर्देश", "पेलोड"]
    te_keywords = ["పోలిక", "వివరాలు", "పేలోడ్"]
    if any(keyword in text for keyword in en_keywords):
        score += 1
    if language == "hi" and any(keyword in message for keyword in hi_keywords):
        score += 1
    if language == "te" and any(keyword in message for keyword in te_keywords):
        score += 1

    return "expert" if score >= 3 else "beginner"


def _build_function_prompt(message: str, language: str, context: Dict[str, Any]) -> str:
    context_json = json.dumps(context, ensure_ascii=False)
    return (
        "You are a robotics e-commerce function router. "
        "Return ONLY valid JSON with this shape: "
        '{"tool":"<tool_name>","arguments":{...}}. '
        "Allowed tools: search_products, get_product, compare_products, recommend, add_to_cart, navigate_to. "
        "Categories: Kitchen, Home Cleaner, Drone, Humanoid. "
        "Pages: home, catalog, assistant, product, cart, orders. "
        f"Language: {language}. "
        f"Context: {context_json}. "
        f"User message: {message}"
    )


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    text = text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    for match in re.findall(r"\{[\s\S]*?\}", text):
        try:
            parsed = json.loads(match)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue

    return None


def _load_fc_generator() -> Any:
    global _FC_GENERATOR
    global _FC_MODEL_ERROR

    if _FC_GENERATOR is not None:
        return _FC_GENERATOR
    if _FC_MODEL_ERROR is not None:
        return None

    enabled_flag = os.getenv("ENABLE_FC_MODEL", "0").strip().lower()
    if enabled_flag not in {"1", "true", "yes"}:
        _FC_MODEL_ERROR = "Function-calling model disabled (set ENABLE_FC_MODEL=1 to enable)."
        return None

    model_ref = os.getenv("FC_MODEL_PATH") or os.getenv("FC_MODEL_ID")
    if not model_ref:
        _FC_MODEL_ERROR = "FC_MODEL_PATH or FC_MODEL_ID not configured"
        return None

    local_only = bool(os.getenv("FC_MODEL_PATH"))

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline  # type: ignore

        tokenizer = AutoTokenizer.from_pretrained(
            model_ref, local_files_only=local_only)
        model = AutoModelForCausalLM.from_pretrained(
            model_ref, local_files_only=local_only)

        _FC_GENERATOR = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            device=-1,
        )
        return _FC_GENERATOR
    except Exception as error:
        _FC_MODEL_ERROR = str(error)
        return None


def run_pipeline(message: str, language: str = "en", context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    normalized_language = _normalize_language(language)
    normalized_context = normalize_context(context or {})
    user_message = (message or "").strip()

    if not user_message:
        user_message = "Show me recommended robots."

    runtime = _get_runtime()
    proficiency = detect_proficiency(user_message, normalized_context, normalized_language)
    selected_tool, tool_source = runtime.decide_tool(
        message=user_message,
        language=normalized_language,
        context=normalized_context,
    )

    tool_name = selected_tool["tool"]
    tool_args = selected_tool["arguments"]
    tool_result = runtime.execute_tool(
        tool_name, tool_args, normalized_context)
    referenced_ids = runtime._collect_product_ids(tool_result)

    return {
        "ok": True,
        "message": user_message,
        "language": normalized_language,
        "proficiency": proficiency,
        "toolCalled": tool_name,
        "toolArgs": tool_args,
        "toolResult": tool_result,
        "productsReferenced": referenced_ids,
        "toolSource": tool_source,
        "ragEnabled": runtime.ranker.semantic_enabled,
    }


def _cli() -> int:
    try:
        raw = sys.stdin.read().strip()
        payload = json.loads(raw) if raw else {}

        message = payload.get("message", "")
        language = payload.get("language", "en")
        context = payload.get("context", {})

        output = run_pipeline(
            message=message, language=language, context=context)
        sys.stdout.write(json.dumps(output, ensure_ascii=False))
        return 0
    except Exception as error:
        fallback = {
            "ok": False,
            "error": str(error),
            "toolCalled": "search_products",
            "toolArgs": {"query": "robot", "category": "Kitchen"},
            "toolResult": {
                "summary": "Pipeline fallback activated.",
                "products": [],
                "total": 0,
            },
            "productsReferenced": [],
            "proficiency": "beginner",
            "language": "en",
        }
        sys.stdout.write(json.dumps(fallback, ensure_ascii=False))
        return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
