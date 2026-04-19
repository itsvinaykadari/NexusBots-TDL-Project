#!/usr/bin/env python3
"""
Nexus Bots — B2 Ground-Truth Labeler

Reads server/logs/ai_sessions.jsonl (real sessions from B2 inject + organic usage),
assigns CORRECT {tool, arguments, ui_guide} labels using deterministic rules,
and writes research/dataset/raw/function_calls_b2_labeled.jsonl.

Rules are derived from the PLAN.md system prompt and the known expected labels
recorded in sarvam_logs.md.

Usage:
    python3 research/dataset/scripts/label_b2_sessions.py
"""

import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SESSIONS_PATH = PROJECT_ROOT / "server" / "logs" / "ai_sessions.jsonl"
OUT_PATH = PROJECT_ROOT / "research" / "dataset" / "raw" / "function_calls_b2_labeled.jsonl"

# ── Product catalog ───────────────────────────────────────────────────────────
PRODUCTS = [
    {"id": 1,  "name": "Amazon Astro",               "category": "Kitchen",      "price": 1599.99},
    {"id": 2,  "name": "Samsung Ballie",              "category": "Kitchen",      "price": 1299.99},
    {"id": 3,  "name": "Enabot EBO X",               "category": "Kitchen",      "price": 599.99},
    {"id": 4,  "name": "iRobot Roomba j9+",          "category": "Home Cleaner", "price": 799.99},
    {"id": 5,  "name": "Roborock S8 MaxV Ultra",     "category": "Home Cleaner", "price": 1799.99},
    {"id": 6,  "name": "Ecovacs WINBOT W2 Omni",    "category": "Home Cleaner", "price": 499.99},
    {"id": 7,  "name": "Ring Always Home Cam",       "category": "Drone",        "price": 249.99},
    {"id": 8,  "name": "DJI Matrice 30T",            "category": "Drone",        "price": 13600.0},
    {"id": 9,  "name": "Aiper Surfer S1",            "category": "Drone",        "price": 1399.99},
    {"id": 10, "name": "Miko 3",                     "category": "Humanoid",     "price": 249.99},
    {"id": 11, "name": "Wonder Workshop Dash",       "category": "Humanoid",     "price": 149.99},
    {"id": 12, "name": "LEGO Education Spike Prime", "category": "Humanoid",     "price": 395.95},
]

BY_CAT = {}
for p in PRODUCTS:
    BY_CAT.setdefault(p["category"], []).append(p)

SLUG = {"Kitchen": "kitchen", "Home Cleaner": "home-cleaner", "Drone": "drone", "Humanoid": "humanoid"}
GUIDE = {"Kitchen": "find_kitchen", "Home Cleaner": "find_home_cleaner", "Drone": "find_drone", "Humanoid": "find_humanoid"}

# Keyword → product ID
PRODUCT_KEYWORDS = {
    "astro": 1, "amazon astro": 1,
    "ballie": 2, "samsung ballie": 2,
    "enabot": 3, "ebo x": 3, "ebo": 3,
    "roomba": 4, "irobot": 4, "j9+": 4,
    "roborock": 5, "s8 maxv": 5,
    "winbot": 6, "ecovacs": 6, "w2 omni": 6,
    "ring always home": 7, "ring cam": 7, "ring always": 7,
    "dji matrice": 8, "matrice 30t": 8, "matrice": 8, "dji": 8,
    "aiper surfer": 9, "surfer s1": 9, "aiper": 9,
    "miko 3": 10, "miko": 10,
    "wonder workshop": 11, "workshop dash": 11, "dash": 11,
    "lego education": 12, "spike prime": 12, "lego spike": 12, "lego": 12,
}

# Sessions to skip (pure greeting, meta-questions, or ambiguous organic queries)
SKIP_PATTERNS = [
    r"^how are (you|u)[\s?!.]*$",
    r"^who (is|are) (you|the author|this)[\s?!.]*$",
    r"^hello[\s!?.]*$",
    r"^(hi|hey)[\s!?.]*$",
]


def find_product_id(text: str) -> int | None:
    """Return product ID for the first product name found in text."""
    text_lower = text.lower()
    # Longest match first
    for kw, pid in sorted(PRODUCT_KEYWORDS.items(), key=lambda x: -len(x[0])):
        if kw in text_lower:
            return pid
    return None


def find_two_product_ids(text: str) -> tuple[int | None, int | None]:
    """Return up to two distinct product IDs found in text."""
    text_lower = text.lower()
    found = []
    for kw, pid in sorted(PRODUCT_KEYWORDS.items(), key=lambda x: -len(x[0])):
        if kw in text_lower and pid not in found:
            found.append(pid)
        if len(found) == 2:
            break
    p1 = found[0] if len(found) > 0 else None
    p2 = found[1] if len(found) > 1 else None
    return p1, p2


def detect_category(text: str) -> str | None:
    text_lower = text.lower()
    if "kitchen" in text_lower:
        return "Kitchen"
    if "drone" in text_lower:
        return "Drone"
    if re.search(r"home cleaner|vacuum|mop|floor clean|window clean", text_lower):
        return "Home Cleaner"
    if re.search(r"humanoid|kids|bacchon|pillalaki|children|classroom|coding robot", text_lower):
        return "Humanoid"
    return None


def extract_budget(text: str) -> int:
    m = re.search(r"\$\s*(\d[\d,]*)", text)
    if m:
        return int(m.group(1).replace(",", ""))
    # "1000 mein", "500 lopu"
    m = re.search(r"\b(\d{2,5})\s*(mein|lopu|under|within|budget)", text.lower())
    if m:
        return int(m.group(1))
    return 500  # default


def detect_compare_focus(text: str) -> str:
    text_lower = text.lower()
    if re.search(r"suction|power|vacuum|mop", text_lower):
        return "suction"
    if re.search(r"camera|cam|photo|video|zoom", text_lower):
        return "camera"
    if re.search(r"price|cost|cheap|sasta|budget", text_lower):
        return "price"
    if re.search(r"battery|charge|runtime", text_lower):
        return "battery"
    if re.search(r"payload|weight|carry", text_lower):
        return "payload"
    if re.search(r"safety|safe", text_lower):
        return "safety"
    if re.search(r"spec|technical|feature", text_lower):
        return "specs"
    return "specs"


def should_skip(msg: str) -> bool:
    for pat in SKIP_PATTERNS:
        if re.search(pat, msg.strip(), re.IGNORECASE):
            return True
    # Skip native script queries (not romanized)
    if re.search(r"[\u0900-\u097F\u0C00-\u0C7F]", msg):
        return True
    return False


def label_session(session: dict) -> dict | None:
    """Return a raw-v2-format row, or None if session should be skipped."""
    inp = session["input"]
    pipeline = session["pipeline"]
    msg = inp["message"]
    lang = pipeline.get("language", "en")

    if should_skip(msg):
        return None

    # Build page context from session input
    page_context = {
        "currentPage": inp.get("page", "home"),
        "selectedCategory": inp.get("selectedCategory", ""),
        "searchQuery": inp.get("searchQuery", ""),
        "viewedProducts": [],
        "cart": [],
        "currentProduct": inp.get("currentProduct"),
    }

    tool, args, ui_guide = assign_label(msg, page_context, lang, pipeline)

    if tool is None:
        return None

    return {
        "language": lang,
        "proficiency": "beginner",  # real sessions default to beginner
        "user_query": msg,
        "page_context": page_context,
        "function_call": {"name": tool, "arguments": args},
        "ui_guide": ui_guide,
        "metadata": {
            "intent": _infer_intent(tool, args, ui_guide),
            "source": "b2_session_log",
            "split": "train",
        },
    }


def assign_label(
    msg: str, ctx: dict, lang: str, pipeline: dict
) -> tuple[str, dict, str | None]:
    """
    Deterministically assign the correct tool, arguments, and ui_guide
    based on the message content and rules from PLAN.md.
    """
    ml = msg.lower()

    # ── 1. Order/delivery tracking ─────────────────────────────────────────
    if re.search(
        r"order kahan|mera order|where (are|is) my order|order (status|track)|"
        r"where is (my|the) order|naa order|order ekkada|check my order|"
        r"order section|order history",
        ml,
    ):
        return "navigate_to", {"page": "orders", "params": {}}, "check_orders"

    # ── 2. Support: view existing tickets ──────────────────────────────────
    if re.search(
        r"purane tickets|previous tickets|my tickets|tickets dikhao|naa tickets|"
        r"support tickets check|view (my )?tickets|show (me )?(my )?tickets|"
        r"filed complaints|ticket history",
        ml,
    ):
        return "navigate_to", {"page": "orders", "params": {}}, "view_tickets"

    # ── 3. Support: raise new ticket / complaint ───────────────────────────
    if re.search(
        r"raise a ticket|ticket banao|ticket create|new ticket|file a complaint|"
        r"complaint file|karni hai|ticket raise|robot (is |)broken|kharaab|"
        r"complaint cheyali|pani cheyyatledu|create.*ticket|submit.*complaint|"
        r"want to raise",
        ml,
    ):
        return "navigate_to", {"page": "orders", "params": {}}, "new_ticket"

    # ── 4. Support: open support (general help) ────────────────────────────
    if re.search(
        r"support chahiye|support kavali|open support|need (help|support)|"
        r"i need support|naaku support|help with (my |)robot|problem with (my |)robot|"
        r"mujhe support|support page|where is support|can i get help",
        ml,
    ):
        return "navigate_to", {"page": "orders", "params": {}}, "open_support"

    # ── 5. Add to cart (check BEFORE cart navigation to avoid "my cart" clash) ──
    if re.search(
        r"add .{0,40}(to (my |)cart|cart mein (add|daal)|cart lo (add|pettu))|"
        r"(cart mein|cart lo) (add|daalo|pettu|daal)|"
        r"(stage|queue) .{0,30} (in|for) (cart|purchase)|"
        r"put .{0,30} in cart|"
        r"buy .{1,30}$",
        ml,
    ):
        pid = find_product_id(ml)
        if pid:
            return "add_to_cart", {"product_id": pid}, None
        # If we can't resolve the product, fall through

    # ── 6. Navigate to cart ────────────────────────────────────────────────
    if re.search(
        r"^(go to|open|show me|take me to) (my |the |)cart$|"
        r"\bmera cart\b|\bnaa cart\b|"
        r"naa cart (chupinchu|dikhao)|cart dikhao|cart open|cart pe jana|"
        r"cart view|open (my |the |)cart",
        ml,
    ):
        return "navigate_to", {"page": "cart", "params": {}}, "update_cart"

    # ── 7. Navigate to home ────────────────────────────────────────────────
    if re.search(
        r"take me home|go to home|home page|home pe (le chalo|jao|jana)|"
        r"home ki vellali|back to (main|home)|main page",
        ml,
    ):
        return "navigate_to", {"page": "home", "params": {}}, None

    # ── 8. Compare two products ────────────────────────────────────────────
    # (also catches standalone "cart dikhao" / "naa cart chupinchu" if missed above)
    if re.search(r"compare|vs\b|versus|kya fark|contrast|mariyu.*compare|compare.*mariyu", ml):
        p1, p2 = find_two_product_ids(ml)
        if p1 and p2:
            focus = detect_compare_focus(ml)
            return (
                "compare_products",
                {"product_id_1": p1, "product_id_2": p2, "focus": focus},
                "compare_products",
            )
        # Single product compare (can't compare, fall through)

    # ── 9. Location intent (kahan / ekkada / where is + product/category) ──
    if re.search(
        r"kahan (milega|hai|milenge)|ekkada (dorikutundi|undi|dorikutaayi)|"
        r"where (can i find|is|to find)|locate|kahan mil|show me where|"
        r"take me to .{0,20}(section|category)|navigate to .{0,20}catalog",
        ml,
    ):
        pid = find_product_id(ml)
        if pid:
            product = next(p for p in PRODUCTS if p["id"] == pid)
            cat = product["category"]
            slug = SLUG[cat]
            return (
                "navigate_to",
                {"page": "catalog", "params": {"category": slug, "product_id": pid}},
                f"locate_path:{slug}:{pid}",
            )
        cat = detect_category(ml)
        if cat:
            slug = SLUG[cat]
            first_pid = BY_CAT[cat][0]["id"]
            return (
                "navigate_to",
                {"page": "catalog", "params": {"category": slug, "product_id": first_pid}},
                f"locate_path:{slug}:{first_pid}",
            )

    # ── 10. Get product details ────────────────────────────────────────────
    if re.search(
        r"tell me about|ke bare mein|ke baare mein|details (do|ivvu|dikhao)|"
        r"gurinchi cheppu|what (is|can you tell me about)|ke details|"
        r"specification(s?) of this|specs of|full info|product info|"
        r"details about",
        ml,
    ):
        pid = find_product_id(ml)
        if pid is None and ctx.get("currentProduct"):
            pid = ctx["currentProduct"]
        if pid:
            return "get_product", {"product_id": pid}, None

    # ── 11. Recommend / budget / cheapest / best for need ─────────────────
    if re.search(
        r"cheapest|sasta|best (robot|option|model|.{0,20}) for|"
        r"suggest (a |)(robot|me)|recommend(ation)?|under \$|budget|"
        r"ke andar|lopu (.*robot|vacuum|drone)|"
        r"what (robot|should i|.{0,20}) (buy|get|choose)|which is best|"
        r"bacchon ke liye|pillalaki|for kids|good for|"
        r"most expensive|sasta",
        ml,
    ):
        budget = extract_budget(ml)
        cat = detect_category(ml)
        need = "best robot for my needs"
        if re.search(r"kids|bacchon|pillalaki|children|age 5", ml):
            need = "kids companion"
        elif re.search(r"security|patrol|surveillance|inspection", ml):
            need = "home security patrol"
        elif re.search(r"vacuum|floor|clean|suction|mop", ml):
            need = "daily floor cleaning"
        elif re.search(r"window", ml):
            need = "window cleaning"
        elif re.search(r"classroom|coding|stem|programm", ml):
            need = "classroom learning"
        elif re.search(r"kitchen|cooking|recipe", ml):
            need = "cooking assistance"
        elif re.search(r"pool", ml):
            need = "pool cleaning"

        # cheapest / most expensive don't have category: default budget
        if re.search(r"cheapest|most expensive|sasta.*robot|what .{0,15}cheapest", ml) and not cat:
            budget = 200

        args: dict = {"need": need, "budget": budget}
        if cat:
            args["category"] = cat
        guide = GUIDE.get(cat) if cat else None
        return "recommend", args, guide

    # ── 12. Browse category (show me / dikhao / list) ─────────────────────
    cat = detect_category(ml)
    if re.search(
        r"show me|dikhao|chupinchu|chupinchandi|list (karo|cheyyi)|"
        r"search (for |)(all |)robots|which robots|all (.*|)robots",
        ml,
    ):
        if cat:
            return (
                "search_products",
                {"query": f"{cat.lower()} robots", "category": cat},
                GUIDE[cat],
            )
        return "search_products", {"query": "robots", "category": None}, None

    # ── 13. Generic search with category ──────────────────────────────────
    if cat:
        return (
            "search_products",
            {"query": f"{cat.lower()} robots", "category": cat},
            GUIDE[cat],
        )

    # ── 14. Out-of-scope fallback ──────────────────────────────────────────
    if re.search(r"robot|mech|robo", ml):
        return "search_products", {"query": "robots", "category": None}, None

    # True out-of-scope
    return "search_products", {"query": "robot", "category": None}, None


def _infer_intent(tool: str, args: dict, ui_guide: str | None) -> str:
    if tool == "add_to_cart":
        return "add_to_cart"
    if tool == "get_product":
        return "get_product"
    if tool == "compare_products":
        return "compare"
    if tool == "recommend":
        return "recommend"
    if tool == "navigate_to":
        page = args.get("page", "")
        if page == "orders":
            return "nav_support"
        if page == "cart":
            return "nav_cart_home"
        if page == "home":
            return "nav_cart_home"
        if page == "catalog":
            return "nav_location"
    if tool == "search_products":
        return "browse_category" if args.get("category") else "out_of_scope"
    return "browse_category"


def main() -> None:
    if not SESSIONS_PATH.exists():
        print(f"ERROR: sessions log not found at {SESSIONS_PATH}", file=sys.stderr)
        sys.exit(1)

    sessions = [json.loads(line) for line in SESSIONS_PATH.read_text().splitlines() if line.strip()]
    print(f"Read {len(sessions)} sessions from {SESSIONS_PATH}")

    rows = []
    skipped = []
    for i, session in enumerate(sessions, 1):
        row = label_session(session)
        if row is None:
            skipped.append((i, session["input"]["message"]))
        else:
            row["id"] = f"b2_session_{i:04d}"
            rows.append(row)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    from collections import Counter
    by_tool  = Counter(r["function_call"]["name"] for r in rows)
    by_lang  = Counter(r["language"] for r in rows)
    by_intent = Counter(r["metadata"]["intent"] for r in rows)

    print(f"\nWritten {len(rows)} labeled rows → {OUT_PATH}")
    print(f"Skipped {len(skipped)} sessions:")
    for idx, msg in skipped:
        print(f"  [{idx:02d}] {msg[:60]}")
    print(f"\nBy tool:   {dict(by_tool)}")
    print(f"By lang:   {dict(by_lang)}")
    print(f"By intent: {dict(by_intent)}")


if __name__ == "__main__":
    main()
