#!/usr/bin/env python3
"""Sarvam response generator with resilient fallback mode."""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

ALLOWED_LANGUAGES = {"en", "hi", "te"}


def _normalize_language(language: Any) -> str:
    if not isinstance(language, str):
        return "en"
    language = language.strip().lower()
    return language if language in ALLOWED_LANGUAGES else "en"


def _language_name(code: str) -> str:
    return {
        "en": "English",
        "hi": "Hindi",
        "te": "Telugu",
    }.get(code, "English")


def _compact_product_list(tool_payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    result = tool_payload.get("toolResult")
    if not isinstance(result, dict):
        return []

    products: List[Dict[str, Any]] = []

    if isinstance(result.get("products"), list):
        for item in result["products"]:
            if isinstance(item, dict):
                products.append(item)

    if isinstance(result.get("recommendations"), list):
        for item in result["recommendations"]:
            if isinstance(item, dict):
                products.append(item)

    if isinstance(result.get("product"), dict):
        products.append(result["product"])

    comparison = result.get("comparison")
    if isinstance(comparison, dict):
        if isinstance(comparison.get("product_1"), dict):
            products.append(comparison["product_1"])
        if isinstance(comparison.get("product_2"), dict):
            products.append(comparison["product_2"])

    if isinstance(result.get("added"), dict):
        products.append(result["added"])

    if isinstance(result.get("target_product"), dict):
        products.append(result["target_product"])

    dedup: Dict[int, Dict[str, Any]] = {}
    for item in products:
        try:
            pid = int(item.get("id"))
        except Exception:
            continue
        if pid not in dedup:
            dedup[pid] = item

    return list(dedup.values())[:6]


def _build_system_prompt(language: str, proficiency: str) -> str:
    style = (
        "Use short, simple sentences and avoid jargon unless needed."
        if proficiency == "beginner"
        else "Be technical and include practical specs/tradeoffs when relevant."
    )

    return (
        "You are Nexus Bots AI assistant for robotics e-commerce. "
        f"Respond in {_language_name(language)}. "
        f"User proficiency is {proficiency}. {style} "
        "Ground every recommendation in the provided tool result and product data only. "
        "If data is missing, say so clearly instead of inventing facts."
    )


def _build_user_prompt(tool_payload: Dict[str, Any], context: Dict[str, Any], language: str) -> str:
    compact_payload = {
        "toolCalled": tool_payload.get("toolCalled"),
        "toolArgs": tool_payload.get("toolArgs"),
        "toolResult": tool_payload.get("toolResult"),
        "productsReferenced": tool_payload.get("productsReferenced", []),
    }
    compact_products = _compact_product_list(tool_payload)

    prompt = {
        "response_language": language,
        "current_context": context,
        "tool_execution": compact_payload,
        "products": compact_products,
        "response_task": [
            "Answer user intent based on tool output.",
            "Mention concrete product names where relevant.",
            "Keep tone aligned with user proficiency.",
        ],
    }
    return json.dumps(prompt, ensure_ascii=False)


def _strip_thinking_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks from model output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _extract_text_from_response(data: Dict[str, Any]) -> Optional[str]:
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return _strip_thinking_tags(message["content"].strip())

    if isinstance(data.get("response"), str):
        return _strip_thinking_tags(data["response"].strip())

    output = data.get("output")
    if isinstance(output, list) and output:
        first = output[0]
        if isinstance(first, dict) and isinstance(first.get("content"), str):
            return _strip_thinking_tags(first["content"].strip())

    return None


def _call_sarvam(messages: List[Dict[str, str]]) -> Tuple[Optional[str], Optional[str]]:
    api_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not api_key:
        return None, "Missing SARVAM_API_KEY"

    endpoint = os.getenv("SARVAM_CHAT_ENDPOINT",
                         "https://api.sarvam.ai/v1/chat/completions")
    model = os.getenv("SARVAM_MODEL", "sarvam-m")
    timeout_seconds = int(os.getenv("SARVAM_TIMEOUT_SEC", "25"))

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.35,
        "max_tokens": 500,
    }

    data = json.dumps(payload).encode("utf-8")
    auth_header = os.getenv("SARVAM_AUTH_HEADER",
                            "api-subscription-key").strip()
    headers = {
        "Content-Type": "application/json",
    }
    if auth_header.lower() == "authorization":
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers[auth_header] = api_key

    request = urllib.request.Request(
        endpoint,
        data=data,
        method="POST",
        headers=headers,
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            text = _extract_text_from_response(parsed)
            if text:
                return text, None
            return None, "Sarvam response did not include readable text"
    except urllib.error.HTTPError as error:
        body = ""
        try:
            body = error.read().decode("utf-8")
        except Exception:
            body = str(error)
        return None, f"Sarvam HTTP {error.code}: {body[:500]}"
    except Exception as error:
        return None, str(error)


def _fallback_text(
    *,
    tool_payload: Dict[str, Any],
    proficiency: str,
    language: str,
    error_message: Optional[str] = None,
) -> str:
    tool = tool_payload.get("toolCalled", "search_products")
    result = tool_payload.get("toolResult") if isinstance(
        tool_payload.get("toolResult"), dict) else {}
    products = _compact_product_list(tool_payload)

    prefix = {
        "en": "",
        "hi": "[Fallback] ",
        "te": "[Fallback] ",
    }.get(language, "")

    if tool == "recommend":
        if not products:
            return prefix + "I could not find strong matches right now, but I can refine by budget and category if you share them."

        names = ", ".join(product.get("name", "Unknown")
                          for product in products[:3])
        if proficiency == "expert":
            detail = " | ".join(
                f"{product.get('name', 'Unknown')} (${float(product.get('price', 0.0)):.2f}, rating {float(product.get('rating', 0.0)):.1f})"
                for product in products[:3]
            )
            return prefix + f"Top recommendation set: {detail}."

        return prefix + f"Best options for you are: {names}. I can compare these side by side if you want."

    if tool == "compare_products":
        comparison = result.get("comparison") if isinstance(
            result.get("comparison"), dict) else {}
        p1 = comparison.get("product_1") if isinstance(
            comparison.get("product_1"), dict) else None
        p2 = comparison.get("product_2") if isinstance(
            comparison.get("product_2"), dict) else None
        if p1 and p2:
            if proficiency == "expert":
                return (
                    prefix
                    + f"Comparison complete: {p1.get('name')} (${float(p1.get('price', 0.0)):.2f}) vs "
                    + f"{p2.get('name')} (${float(p2.get('price', 0.0)):.2f})."
                )
            return prefix + f"I compared {p1.get('name')} and {p2.get('name')} for you."
        return prefix + "I could not complete the comparison because one product was missing."

    if tool == "get_product":
        product = result.get("product") if isinstance(
            result.get("product"), dict) else None
        if product:
            return prefix + f"{product.get('name')} is priced at ${float(product.get('price', 0.0)):.2f} in {product.get('category', 'Unknown')} category."
        return prefix + "I could not find that product ID."

    if tool == "add_to_cart":
        added = result.get("added") if isinstance(
            result.get("added"), dict) else None
        if added:
            return prefix + f"{added.get('name')} is ready to be added to your cart."
        return prefix + "I could not add that item because the product ID was invalid."

    if tool == "navigate_to":
        navigation = result.get("navigation") if isinstance(
            result.get("navigation"), dict) else {}
        route = navigation.get("route", "/")
        target = result.get("target_product") if isinstance(
            result.get("target_product"), dict) else None
        if target:
            name = target.get("name", "the selected robot")
            category = target.get("category", "")
            if category:
                return prefix + f"The target robot is {name} in {category} category. Guided navigation has started at {route}."
            return prefix + f"The target robot is {name}. Guided navigation has started at {route}."
        return prefix + f"You can continue at {route}."

    if products:
        names = ", ".join(product.get("name", "Unknown")
                          for product in products[:4])
        return prefix + f"I found these relevant products: {names}."

    message = result.get("summary") if isinstance(
        result.get("summary"), str) else "I processed your request."
    if error_message:
        return prefix + f"{message} (Reason: {error_message})"
    return prefix + message


def generate_response(
    *,
    tool_payload: Dict[str, Any],
    language: str,
    context: Optional[Dict[str, Any]] = None,
    proficiency: str = "beginner",
) -> Dict[str, Any]:
    normalized_language = _normalize_language(language)
    proficiency = proficiency if proficiency in {
        "beginner", "expert"} else "beginner"
    context = context if isinstance(context, dict) else {}

    messages = [
        {
            "role": "system",
            "content": _build_system_prompt(language=normalized_language, proficiency=proficiency),
        },
        {
            "role": "user",
            "content": _build_user_prompt(tool_payload=tool_payload, context=context, language=normalized_language),
        },
    ]

    text, error = _call_sarvam(messages)
    if text:
        return {
            "ok": True,
            "source": "sarvam",
            "language": normalized_language,
            "response": text,
        }

    fallback = _fallback_text(
        tool_payload=tool_payload,
        proficiency=proficiency,
        language=normalized_language,
        error_message=error,
    )
    return {
        "ok": False,
        "source": "fallback",
        "language": normalized_language,
        "response": fallback,
        "error": error,
    }


def _cli() -> int:
    try:
        raw = sys.stdin.read().strip()
        payload = json.loads(raw) if raw else {}

        tool_payload = payload.get("toolPayload")
        if not isinstance(tool_payload, dict):
            tool_payload = payload.get("pipeline") if isinstance(
                payload.get("pipeline"), dict) else {}

        language = payload.get("language", "en")
        context = payload.get("context", {})
        proficiency = payload.get(
            "proficiency", tool_payload.get("proficiency", "beginner"))

        result = generate_response(
            tool_payload=tool_payload,
            language=language,
            context=context,
            proficiency=proficiency,
        )
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as error:
        output = {
            "ok": False,
            "source": "fallback",
            "language": "en",
            "response": "I can help you with robot recommendations once configuration is complete.",
            "error": str(error),
        }
        sys.stdout.write(json.dumps(output, ensure_ascii=False))
        return 0


def _worker() -> int:
    """Long-lived worker: reads JSON lines from stdin, writes JSON lines to stdout."""
    sys.stdout.write(json.dumps({"ready": True}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            tool_payload = payload.get("toolPayload")
            if not isinstance(tool_payload, dict):
                tool_payload = payload.get("pipeline") if isinstance(
                    payload.get("pipeline"), dict) else {}
            language = payload.get("language", "en")
            context = payload.get("context", {})
            proficiency = payload.get(
                "proficiency", tool_payload.get("proficiency", "beginner"))
            output = generate_response(
                tool_payload=tool_payload, language=language,
                context=context, proficiency=proficiency)
        except Exception as error:
            output = {
                "ok": False, "source": "fallback", "language": "en",
                "response": "Pipeline error. Please try again.",
                "error": str(error),
            }
        sys.stdout.write(json.dumps(output, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        raise SystemExit(_worker())
    raise SystemExit(_cli())
