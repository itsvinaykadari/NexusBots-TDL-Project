#!/usr/bin/env python3
"""
Nexus Bots — Python template dataset generator v2 (B3-revised).

Covers all intent groups from the PLAN.md target distribution (~1050 rows):
  1.  browse_category       → search_products + find_{category}
  2.  search_by_name        → search_products + find_{category}   (specific product-name queries)
  3.  get_product           → get_product + null
  4.  compare_products      → compare_products + compare_products
  5.  recommend             → recommend + find_{category}          (incl. cheapest/sasta/takkuva)
  6.  add_to_cart           → add_to_cart + null
  7.  nav_orders_support    → navigate_to orders + open_support/new_ticket/view_tickets/check_orders
  8.  nav_cart_home         → navigate_to cart|home + update_cart|null
  9.  nav_location          → navigate_to catalog + locate_path:{cat}:{id}
  10. out_of_scope          → search_products query=robot + null

B3 improvements (based on B2 base-model failure analysis):
  - Cheapest/budget-only → recommend: "sasta X", "takkuva X", "cheapest X" patterns
  - Home navigation args: no empty params ({"page":"home"} not {"page":"home","params":{}})
  - nav_support sub-intents: cycle-distributed evenly across all 4 sub-intents
  - search_by_name: uses actual product names as queries (not just generic category terms)
  - add_to_cart: adds "the current robot" context-based patterns
  - Bumped HI/TE rows in failing categories (recommend, add_to_cart, get_product)
"""

import json
import random
from pathlib import Path

# ── Seeded RNG ────────────────────────────────────────────────────────────────
RNG = random.Random(6420)

def pick(seq):
    return RNG.choice(seq)

def pickn(seq, n):
    return [RNG.choice(seq) for _ in range(n)]

def cycle_pick(seq, i):
    return seq[i % len(seq)]

# ── Catalog ───────────────────────────────────────────────────────────────────
PRODUCTS = [
    {"id": 1,  "name": "Amazon Astro",               "category": "Kitchen",      "price": 1599.99, "note": "kitchen voice assistant"},
    {"id": 2,  "name": "Samsung Ballie",              "category": "Kitchen",      "price": 1299.99, "note": "kitchen projector companion"},
    {"id": 3,  "name": "Enabot EBO X",               "category": "Kitchen",      "price": 599.99,  "note": "kitchen monitoring camera"},
    {"id": 4,  "name": "iRobot Roomba j9+",          "category": "Home Cleaner", "price": 799.99,  "note": "smart vacuum auto-empty"},
    {"id": 5,  "name": "Roborock S8 MaxV Ultra",     "category": "Home Cleaner", "price": 1799.99, "note": "vacuum mop combo"},
    {"id": 6,  "name": "Ecovacs WINBOT W2 Omni",    "category": "Home Cleaner", "price": 499.99,  "note": "window cleaner"},
    {"id": 7,  "name": "Ring Always Home Cam",       "category": "Drone",        "price": 249.99,  "note": "cheapest indoor patrol drone"},
    {"id": 8,  "name": "DJI Matrice 30T",            "category": "Drone",        "price": 13600.0, "note": "enterprise thermal drone"},
    {"id": 9,  "name": "Aiper Surfer S1",            "category": "Drone",        "price": 1399.99, "note": "pool surface drone"},
    {"id": 10, "name": "Miko 3",                     "category": "Humanoid",     "price": 249.99,  "note": "kids companion age 5-12"},
    {"id": 11, "name": "Wonder Workshop Dash",       "category": "Humanoid",     "price": 149.99,  "note": "cheapest humanoid coding"},
    {"id": 12, "name": "LEGO Education Spike Prime", "category": "Humanoid",     "price": 395.95,  "note": "classroom python robot"},
]

BY_CAT = {}
for p in PRODUCTS:
    BY_CAT.setdefault(p["category"], []).append(p)

CATEGORIES = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
CATEGORY_SLUG = {"Kitchen": "kitchen", "Home Cleaner": "home-cleaner", "Drone": "drone", "Humanoid": "humanoid"}
CATEGORY_GUIDE = {"Kitchen": "find_kitchen", "Home Cleaner": "find_home_cleaner", "Drone": "find_drone", "Humanoid": "find_humanoid"}

FOCUS_BY_CAT = {
    "Kitchen":      ["price", "battery", "camera", "safety", "specs", "warranty"],
    "Home Cleaner": ["price", "suction", "battery", "maintenance", "specs", "warranty"],
    "Drone":        ["price", "battery", "camera", "payload", "safety", "specs"],
    "Humanoid":     ["price", "battery", "safety", "specs", "warranty"],
}

NEEDS_BY_CAT = {
    "Kitchen":      ["cooking assistance", "kitchen monitoring", "recipe help", "hands-free cooking control", "smart home management"],
    "Home Cleaner": ["daily floor cleaning", "pet hair removal", "deep mopping", "window cleaning", "hands-free vacuuming"],
    "Drone":        ["home security patrol", "indoor surveillance", "pool cleaning", "aerial inspection", "thermal survey"],
    "Humanoid":     ["kids coding practice", "STEM education", "child entertainment", "classroom learning", "programming lessons"],
}

SEARCH_BY_CAT = {
    "Kitchen":      ["kitchen assistant robots", "smart kitchen robots", "cooking helper robot", "kitchen monitoring", "voice controlled kitchen robot"],
    "Home Cleaner": ["robot vacuum cleaner", "automatic floor cleaner", "mop robot", "window cleaning robot", "self-emptying vacuum"],
    "Drone":        ["indoor security drone", "home patrol drone", "pool cleaning drone", "enterprise inspection drone", "thermal camera drone"],
    "Humanoid":     ["kids coding robot", "STEM education robot", "interactive learning robot", "classroom robot kit", "programming robot"],
}

def realistic_budget(cat):
    prices = [p["price"] for p in BY_CAT[cat]]
    lo = max(50, int(min(prices) * 0.8))
    hi = int(max(prices) * 1.2)
    raw = RNG.randint(lo, hi)
    return round(raw / 50) * 50

def page_context(cat, p1, p2=None):
    viewed = [p1["id"]]
    if p2:
        viewed.append(p2["id"])
    else:
        others = [p["id"] for p in BY_CAT[cat] if p["id"] != p1["id"]]
        if others:
            viewed.append(pick(others))
    cart = [pick(PRODUCTS)["id"]] if RNG.random() > 0.6 else []
    pages = ["home", "catalog", "product"]
    return {
        "currentPage": pick(pages),
        "selectedCategory": cat,
        "lastSearch": pick(SEARCH_BY_CAT[cat]),
        "viewedProducts": viewed,
        "cart": cart,
        "currentProduct": p1["id"],
    }

def page_context_on_catalog(cat, p1):
    """Force currentPage='catalog' — user is BROWSING the category page.
    Used for context-implicit rows where the query has no category name.
    """
    others = [p["id"] for p in BY_CAT[cat] if p["id"] != p1["id"]]
    viewed = [p1["id"]]
    if others:
        viewed.append(pick(others))
    cart = [pick(PRODUCTS)["id"]] if RNG.random() > 0.7 else []
    return {
        "currentPage": "catalog",
        "selectedCategory": cat,
        "lastSearch": pick(SEARCH_BY_CAT[cat]),
        "viewedProducts": viewed,
        "cart": cart,
        "currentProduct": None,
    }

def page_context_on_product(cat, p1):
    """Force currentPage='product' and currentProduct=p1 — user is on a product detail page.
    Used for context-implicit add_to_cart rows.
    """
    others = [p["id"] for p in BY_CAT[cat] if p["id"] != p1["id"]]
    viewed = [p1["id"]]
    if others:
        viewed.append(pick(others))
    cart = [pick(PRODUCTS)["id"]] if RNG.random() > 0.7 else []
    return {
        "currentPage": "product",
        "selectedCategory": cat,
        "lastSearch": pick(SEARCH_BY_CAT[cat]),
        "viewedProducts": viewed,
        "cart": cart,
        "currentProduct": p1["id"],
    }

# ── Target distribution ───────────────────────────────────────────────────────
# B3 revised — bumped HI/TE and failing categories based on B2 analysis.
# context_recommend / context_browse: user query has NO category name; model must read context.
TARGETS = {
    "browse_category":    {"en": 70,  "hi": 35, "te": 25},
    "search_by_name":     {"en": 55,  "hi": 28, "te": 17},  # +10 for product-name specificity
    "get_product":        {"en": 65,  "hi": 35, "te": 22},  # +12 HI/TE (get_product confusion)
    "compare":            {"en": 65,  "hi": 30, "te": 15},
    "recommend":          {"en": 75,  "hi": 38, "te": 22},  # +20 for cheapest/budget variants
    "add_to_cart":        {"en": 55,  "hi": 30, "te": 18},  # +18 for name→ID teaching
    "nav_support":        {"en": 72,  "hi": 36, "te": 24},  # even multiples of 4 sub-intents
    "nav_cart_home":      {"en": 40,  "hi": 20, "te": 10},
    "nav_location":       {"en": 50,  "hi": 25, "te": 15},
    "out_of_scope":       {"en": 25,  "hi": 10, "te":  5},
    # Context-implicit: query has NO category name, model must read selectedCategory from context
    "context_recommend":  {"en": 20,  "hi": 12, "te":  8},  # "which is cheapest here?" on catalog page
    "context_browse":     {"en": 15,  "hi":  8, "te":  5},  # "show me all of them" on catalog page
    "context_add_cart":   {"en": 15,  "hi":  8, "te":  5},  # "add this to cart" on product page
}

# ── Query templates ───────────────────────────────────────────────────────────

def _q(pool, prof):
    return pick(pool["expert"] if prof == "expert" else pool["beginner"])

def query_browse_category(lang, prof, cat, p1):
    en = {
        "beginner": [
            f"Show me {cat} robots",
            f"I want to see {cat} robots",
            f"What {cat} robots do you have?",
            f"List {cat} options please",
            f"Can you show {cat} category?",
            f"Browse {cat} robots",
            f"I'm looking for {cat} robots",
        ],
        "expert": [
            f"Search {cat} category for all available models",
            f"Filter {cat} inventory by available units",
            f"List {cat} segment with specs",
            f"Show {cat} product range",
            f"Query {cat} category — full inventory",
        ],
    }
    hi = {
        "beginner": [
            f"Mujhe {cat} robots dikhao",
            f"{cat} category ke robots list karo",
            f"{cat} mein kya options hain?",
            f"{cat} robots show karo please",
            f"Kya aap {cat} category dikhao?",
        ],
        "expert": [
            f"{cat} inventory filter karo, available models only",
            f"{cat} segment ka curated list do",
            f"{cat} category mein top models search karo",
            f"{cat} products ka filtered list chahiye",
        ],
    }
    te = {
        "beginner": [
            f"{cat} robots chupinchandi",
            f"Naaku {cat} robots kavali",
            f"{cat} options chupinchu",
            f"{cat} lo emunnayi?",
            f"{cat} robots list cheyyi",
        ],
        "expert": [
            f"{cat} lo available models search cheyyi",
            f"{cat} inventory ni filter cheyyi",
            f"{cat} category curated list ivvu",
            f"{cat} products filtered ga chupinchu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_search_by_name(lang, prof, cat, p1):
    # B3 fix: use actual product name p1["name"] so model learns name→search mapping
    n = p1["name"]
    q = pick(SEARCH_BY_CAT[cat])
    en = {
        "beginner": [
            f"Search for {n}",
            f"Find {n}",
            f"I'm looking for {n}",
            f"Show me {n}",
            f"Find me {q}",
            f"Looking for {q}",
        ],
        "expert": [
            f"Search catalog for {n}",
            f"Filter {cat} by {n}",
            f"Find {n} in inventory",
            f"Query for {q} in {cat}",
        ],
    }
    hi = {
        "beginner": [
            f"{n} dhundho",
            f"{n} search karo",
            f"Mujhe {n} chahiye",
            f"{q} dikhao",
            f"{n} dikhao",
        ],
        "expert": [
            f"{n} ke liye catalog search karo",
            f"{cat} mein {n} filter karo",
            f"{q} listings fetch karo",
        ],
    }
    te = {
        "beginner": [
            f"{n} search cheyyi",
            f"{n} chupinchu",
            f"Naaku {n} kavali",
            f"{q} search cheyyi",
            f"{n} dorikutundo cheppu",
        ],
        "expert": [
            f"{n} catalog lo search cheyyi",
            f"{cat} lo {n} filter cheyyi",
            f"{q} listings fetch cheyyi",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_get_product(lang, prof, p1):
    n = p1["name"]
    en = {
        "beginner": [
            f"Tell me about {n}",
            f"What is {n}?",
            f"Give me details of {n}",
            f"Show me {n} info",
            f"I want to know about {n}",
            f"What can you tell me about {n}?",
        ],
        "expert": [
            f"Get complete specs for {n}",
            f"Retrieve technical profile of {n}",
            f"Show full product data for {n}",
            f"Pull up {n} specification sheet",
            f"Fetch {n} detailed metadata",
        ],
    }
    hi = {
        "beginner": [
            f"{n} ke bare mein batao",
            f"{n} ke details do",
            f"{n} kya hai?",
            f"{n} ka info chahiye",
            f"{n} dikhao",
        ],
        "expert": [
            f"{n} ka complete technical profile do",
            f"{n} specification sheet fetch karo",
            f"{n} ka detailed product data chahiye",
            f"{n} ka full spec sheet nikaalo",
        ],
    }
    te = {
        "beginner": [
            f"{n} gurinchi cheppu",
            f"{n} details ivvu",
            f"{n} full info kavali",
            f"{n} enti?",
            f"{n} chupinchu",
        ],
        "expert": [
            f"{n} complete technical profile fetch cheyyi",
            f"{n} specification sheet ivvu",
            f"{n} detailed product data kavali",
            f"{n} full spec sheet ivvu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_compare(lang, prof, p1, p2, focus):
    n1, n2 = p1["name"], p2["name"]
    en = {
        "beginner": [
            f"Compare {n1} and {n2} on {focus}",
            f"Which is better for {focus}: {n1} or {n2}?",
            f"{n1} vs {n2} on {focus}",
            f"Help me choose between {n1} and {n2}",
            f"What's the difference between {n1} and {n2} in {focus}?",
        ],
        "expert": [
            f"Run {focus}-based side-by-side: {n1} vs {n2}",
            f"Contrast {n1} and {n2} on {focus} trade-offs",
            f"Evaluate {n1} against {n2} on {focus} metrics",
            f"{focus} comparison of {n1} vs {n2}",
        ],
    }
    hi = {
        "beginner": [
            f"{n1} aur {n2} ko {focus} pe compare karo",
            f"{focus} ke liye {n1} ya {n2} better hai?",
            f"{n1} vs {n2} mein {focus} kiska accha hai?",
            f"{n1} aur {n2} mein kya fark hai {focus} mein?",
        ],
        "expert": [
            f"{n1} vs {n2} ka {focus} based comparison do",
            f"{focus} parameter pe {n1} aur {n2} contrast karo",
            f"{n1} aur {n2} ka {focus} evaluation chahiye",
        ],
    }
    te = {
        "beginner": [
            f"{n1} mariyu {n2} ni {focus} meeda compare cheyyi",
            f"{focus} lo {n1} leda {n2} manchidi?",
            f"{n1} vs {n2} lo {focus} yedi better?",
            f"{n1} mariyu {n2} madya {focus} lo teda enti?",
        ],
        "expert": [
            f"{n1} vs {n2} ni {focus} meeda detailed compare cheyyi",
            f"{focus} parameter meeda {n1} mariyu {n2} evaluate cheyyi",
            f"{focus} basis lo {n1} and {n2} contrast cheyyi",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_recommend(lang, prof, cat, budget, need):
    en = {
        "beginner": [
            f"Recommend a {cat} robot under ${budget} for {need}",
            f"Best {cat} option for {need} within ${budget}?",
            f"Suggest a {cat} robot for {need}, budget ${budget}",
            f"What {cat} robot should I get for {need}? My budget is ${budget}",
            f"I need a {cat} robot for {need}, can spend up to ${budget}",
        ],
        "expert": [
            f"Recommend {cat} platform for {need}, cap ${budget}",
            f"Best-fit {cat} for {need} under ${budget} ceiling",
            f"Shortlist {cat} options for {need} within ${budget} range",
            f"{cat} recommendation: {need} use-case, ${budget} limit",
        ],
    }
    hi = {
        "beginner": [
            f"{need} ke liye ${budget} mein {cat} robot suggest karo",
            f"${budget} budget mein {cat} option chahiye for {need}",
            f"{need} ke liye kaunsa {cat} robot lun? Budget ${budget}",
            f"{cat} robot chahiye {need} ke liye, budget ${budget}",
        ],
        "expert": [
            f"{need} use-case ke liye {cat} recommend karo, max ${budget}",
            f"${budget} cap mein best-fit {cat} suggest karo for {need}",
            f"{need} requirement ke liye {cat} shortlist do under ${budget}",
        ],
    }
    te = {
        "beginner": [
            f"{need} kosam ${budget} lopu {cat} recommend cheyyi",
            f"${budget} budget lo {cat} option suggest cheyyi for {need}",
            f"{need} ki tagina {cat} robot kavali, budget ${budget}",
            f"{cat} robot kavali {need} kosam, ${budget} limit lo",
        ],
        "expert": [
            f"{need} use-case kosam {cat} recommend cheyyi, cap ${budget}",
            f"${budget} limit lo best-fit {cat} suggest cheyyi for {need}",
            f"{need} requirement ki {cat} shortlist ivvu under ${budget}",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)


def query_recommend_cheapest(lang, prof, cat):
    """B3 addition: cheapest/sasta/takkuva → recommend patterns.
    These are short queries without explicit budget — the model must learn
    that 'cheapest/sasta/takkuva' keywords → recommend tool, not search_products.
    """
    en = {
        "beginner": [
            f"What is the cheapest {cat} robot?",
            f"Most affordable {cat} option",
            f"Cheapest {cat} robot you have",
            f"Budget {cat} robot please",
            f"Lowest price {cat} option",
            f"Show me the most affordable {cat} robot",
        ],
        "expert": [
            f"Minimum cost {cat} in catalog",
            f"Most cost-effective {cat} available",
            f"Entry-level {cat} recommendation",
        ],
    }
    hi = {
        "beginner": [
            f"Sabse sasta {cat} robot kaun sa hai?",
            f"{cat} mein sasta kya hai?",
            f"Sasta {cat} robot dikhao",
            f"Budget-friendly {cat} chahiye",
            f"{cat} robot saste mein chahiye",
        ],
        "expert": [
            f"Minimum cost {cat} option suggest karo",
            f"Sabse affordable {cat} recommend karo",
            f"Entry-level {cat} platform kaunsa hai?",
        ],
    }
    te = {
        "beginner": [
            f"{cat} lo cheepa robot edi?",
            f"Takkuva dhara lo {cat} kavali",
            f"Sasta {cat} robot chupinchu",
            f"Budget lo {cat} robot suggest cheyyi",
            f"{cat} lo affordable option edi?",
        ],
        "expert": [
            f"Minimum cost {cat} suggest cheyyi",
            f"{cat} lo most affordable option cheppu",
            f"Entry-level {cat} platform edi?",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_add_to_cart(lang, prof, p1):
    n = p1["name"]
    en = {
        "beginner": [
            f"Add {n} to my cart",
            f"Put {n} in cart",
            f"I want to buy {n}",
            f"Add {n} please",
            f"Buy {n}",
            f"Add this robot to cart",
            f"I'll take {n}, add it",
        ],
        "expert": [
            f"Add {n} to checkout shortlist",
            f"Queue {n} in cart",
            f"Stage {n} for purchase",
            f"Insert {n} into purchase cart",
            f"Cart: add {n}",
        ],
    }
    hi = {
        "beginner": [
            f"{n} cart mein add karo",
            f"Mere cart mein {n} daal do",
            f"{n} kharidna hai, cart mein dalo",
            f"{n} add karo cart mein",
            f"Is robot ko cart mein daal do",
            f"{n} le lena hai",
        ],
        "expert": [
            f"{n} ko cart shortlist mein add karo",
            f"{n} cart queue mein daalo",
            f"{n} purchase cart mein insert karo",
        ],
    }
    te = {
        "beginner": [
            f"{n} cart lo add cheyyi",
            f"{n} na cart lo pettu",
            f"{n} konali, cart lo add cheyyi",
            f"{n} add cheyyi cart lo",
            f"Ee robot ni cart lo add cheyyi",
            f"{n} teesukuntanu, add cheyyi",
        ],
        "expert": [
            f"{n} ni cart shortlist lo add cheyyi",
            f"{n} ni purchase cart lo insert cheyyi",
            f"{n} cart queue lo pettu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

# Support intent queries — ui_guide varies by sub-intent
# B3 fix: cycle-distributed instead of weighted random for even coverage
SUPPORT_SUBINTENTS = ["check_orders", "open_support", "new_ticket", "view_tickets"]

def query_nav_support(lang, prof, sub):
    en = {
        "check_orders": {
            "beginner": ["Where is my order?", "Show me my orders", "Check my order status", "I want to see my orders", "Track my order"],
            "expert": ["Retrieve my order history", "Navigate to orders dashboard", "Open order tracking view", "Pull up my recent orders"],
        },
        "open_support": {
            "beginner": ["I need support", "Can I get help?", "Open support please", "I have a problem with my robot", "Help me with an issue"],
            "expert": ["Open support ticket interface", "Navigate to support section", "Access customer support portal", "Initiate a support request"],
        },
        "new_ticket": {
            "beginner": ["I want to file a complaint", "Create a new ticket", "Submit a complaint", "File a new support ticket", "I have an issue, raise a ticket"],
            "expert": ["Create support ticket for defective unit", "File a new complaint ticket", "Submit new support request", "Open a defect report ticket"],
        },
        "view_tickets": {
            "beginner": ["Show me my tickets", "Where are my complaints?", "Check my support tickets", "I want to see my previous tickets"],
            "expert": ["Retrieve all open support tickets", "View my ticket history", "List all filed complaints", "Show support ticket dashboard"],
        },
    }
    hi = {
        "check_orders": {
            "beginner": ["Mera order kahan hai?", "Mere orders dikhao", "Order status check karo", "Mujhe apne orders dekhne hain", "Mera order track karo"],
            "expert": ["Mere order history retrieve karo", "Orders dashboard pe navigate karo", "Order tracking view open karo"],
        },
        "open_support": {
            "beginner": ["Mujhe support chahiye", "Kya help mil sakti hai?", "Support open karo", "Mere robot mein problem hai", "Madad karo"],
            "expert": ["Support ticket interface open karo", "Support section pe navigate karo", "Customer support portal access karo"],
        },
        "new_ticket": {
            "beginner": ["Mujhe complaint file karni hai", "Naya ticket create karo", "Complaint submit karo", "Nayi support ticket banao", "Issue hai, ticket raise karo"],
            "expert": ["Defective unit ke liye support ticket create karo", "Naya complaint ticket file karo", "Support request submit karo"],
        },
        "view_tickets": {
            "beginner": ["Mere tickets dikhao", "Meri complaints kahan hain?", "Support tickets check karo", "Purane tickets dekhne hain"],
            "expert": ["Saare open tickets retrieve karo", "Ticket history dekho", "Filed complaints list karo"],
        },
    }
    te = {
        "check_orders": {
            "beginner": ["Naa order ekkada undi?", "Naa orders chupinchu", "Order status check cheyyi", "Naa orders chudali", "Naa order track cheyyi"],
            "expert": ["Naa order history retrieve cheyyi", "Orders dashboard ki navigate cheyyi", "Order tracking view open cheyyi"],
        },
        "open_support": {
            "beginner": ["Naaku support kavali", "Sahayam cheyagalara?", "Support open cheyyi", "Naa robot lo problem undi", "Help cheyyi"],
            "expert": ["Support ticket interface open cheyyi", "Support section ki navigate cheyyi", "Customer support portal access cheyyi"],
        },
        "new_ticket": {
            "beginner": ["Naaku complaint file cheyali", "Kotta ticket create cheyyi", "Complaint submit cheyyi", "Kotta support ticket create cheyyi"],
            "expert": ["Defective unit kosam support ticket create cheyyi", "Kotta complaint ticket file cheyyi", "Support request submit cheyyi"],
        },
        "view_tickets": {
            "beginner": ["Naa tickets chupinchu", "Naa complaints ekkada unnaayi?", "Support tickets check cheyyi", "Paata tickets chudali"],
            "expert": ["Anni open tickets retrieve cheyyi", "Ticket history chupinchu", "Filed complaints list cheyyi"],
        },
    }
    return _q({"en": en, "hi": hi, "te": te}[lang][sub], prof)

def query_nav_cart_home(lang, prof, page):
    en = {
        "beginner": {
            "cart": ["Open my cart", "Show me my cart", "Go to cart", "I want to see my cart", "Take me to the cart"],
            "home": ["Go to home", "Take me home", "Open home page", "I want to go to home", "Back to main page"],
        },
        "expert": {
            "cart": ["Navigate to cart", "Open cart view", "Route to cart page"],
            "home": ["Navigate to home", "Route to main page", "Switch to home view"],
        },
    }
    hi = {
        "beginner": {
            "cart": ["Mera cart dikhao", "Cart open karo", "Cart pe jana hai", "Mujhe cart dekhna hai"],
            "home": ["Home page pe jao", "Home open karo", "Mujhe home pe le chalo", "Main page pe jana hai"],
        },
        "expert": {
            "cart": ["Cart pe navigate karo", "Cart view open karo", "Cart page pe route karo"],
            "home": ["Home pe navigate karo", "Main page pe route karo", "Home view switch karo"],
        },
    }
    te = {
        "beginner": {
            "cart": ["Naa cart chupinchu", "Cart open cheyyi", "Cart ki vellali", "Naa cart chudali"],
            "home": ["Home page ki vellali", "Home open cheyyi", "Naanu home ki teesukellu"],
        },
        "expert": {
            "cart": ["Cart ki navigate cheyyi", "Cart view open cheyyi", "Cart page ki route cheyyi"],
            "home": ["Home ki navigate cheyyi", "Main page ki route cheyyi", "Home view switch cheyyi"],
        },
    }
    pool = {"en": en, "hi": hi, "te": te}[lang]
    prof_key = "expert" if prof == "expert" else "beginner"
    return pick(pool[prof_key][page])

def query_nav_location(lang, prof, cat, p1):
    n = p1["name"]
    en = {
        "beginner": [
            f"Where can I find {cat} robots?",
            f"Where is {n} located?",
            f"Show me where {cat} robots are",
            f"Take me to {cat} section",
            f"Where to find {n}?",
            f"How do I get to {cat} robots?",
        ],
        "expert": [
            f"Navigate to {cat} catalog",
            f"Locate {n} in the store",
            f"Open {cat} product listing",
            f"Route to {cat} category with {n}",
        ],
    }
    hi = {
        "beginner": [
            f"{cat} robots kahan milenge?",
            f"{n} kahan hai?",
            f"{cat} section kahan hai?",
            f"Mujhe {cat} wala section dikhao",
            f"{n} kahan milega?",
        ],
        "expert": [
            f"{cat} catalog pe navigate karo",
            f"Store mein {n} locate karo",
            f"{cat} category ke saath {n} route karo",
        ],
    }
    te = {
        "beginner": [
            f"{cat} robots ekkada dorikutaayi?",
            f"{n} ekkada undi?",
            f"{cat} section ekkada undi?",
            f"Naaku {cat} section chupinchu",
            f"{n} ekkada dorikutundi?",
        ],
        "expert": [
            f"{cat} catalog ki navigate cheyyi",
            f"Store lo {n} locate cheyyi",
            f"{cat} category ki {n} tho route cheyyi",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

def query_out_of_scope(lang, prof):
    en = {
        "beginner": [
            "What's the weather today?",
            "Can you tell me a joke?",
            "What is 2+2?",
            "Who is the president?",
            "Tell me a recipe for pasta",
            "What movies are showing?",
        ],
        "expert": [
            "Run a sentiment analysis on this review",
            "Calculate compound interest for me",
            "What is the capital of France?",
            "Summarize this document",
        ],
    }
    hi = {
        "beginner": [
            "Aaj mausam kaisa hai?",
            "Ek joke sunao",
            "2+2 kya hota hai?",
            "Pasta ka recipe batao",
        ],
        "expert": [
            "Is review ka sentiment analyze karo",
            "Compound interest calculate karo mujhe",
            "France ki capital kya hai?",
        ],
    }
    te = {
        "beginner": [
            "Ee roju vanakaalam ela undi?",
            "Oka joke cheppu",
            "Pasta recipe cheppu",
        ],
        "expert": [
            "Ee review sentiment analyze cheyyi",
            "France capital emi?",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)


# ── Context-implicit query templates ─────────────────────────────────────────
# These queries do NOT mention the product category — the model must read
# selectedCategory from the page context to answer correctly.

def query_context_recommend(lang, prof):
    """User is on a catalog page and asks for a recommendation WITHOUT naming the category."""
    en = {
        "beginner": [
            "Which one is cheapest here?",
            "What's the most affordable option?",
            "Which robot should I buy?",
            "Suggest me one from this section",
            "What's the best one here?",
            "I want the budget-friendly option",
            "Show me something affordable",
        ],
        "expert": [
            "Most cost-effective option in this section",
            "Recommend one from the current category",
            "Best value pick here",
            "Entry-level option from this section",
        ],
    }
    hi = {
        "beginner": [
            "Yahan sabse sasta kaun sa hai?",
            "Iska koi suggest karo",
            "Konsa lena chahiye yahan?",
            "Budget mein kaun sa accha hai?",
            "Sasta wala dikhao",
            "Koi ek suggest karo yahan se",
        ],
        "expert": [
            "Is category mein best-value option suggest karo",
            "Yahan best-fit recommend karo",
            "Is section mein entry-level kaunsa hai?",
        ],
    }
    te = {
        "beginner": [
            "Ikkada cheapest edi?",
            "Naaku oka suggest cheyyi",
            "Ikkada best edi?",
            "Budget lo emi konali ikkada?",
            "Takkuva dhara lo oka cheppu",
        ],
        "expert": [
            "Ee category lo best value suggest cheyyi",
            "Ikkada entry-level option edi?",
            "Is section lo best pick recommend cheyyi",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)


def query_context_browse(lang, prof):
    """User is on a catalog page and asks to see everything — no category name in query."""
    en = {
        "beginner": [
            "Show me all of them",
            "List everything here",
            "What do you have in this section?",
            "Show all robots",
            "I want to see all options",
            "Display everything available",
        ],
        "expert": [
            "List all products in this category",
            "Show full inventory for this section",
            "Filter: show all in current category",
        ],
    }
    hi = {
        "beginner": [
            "Yahan ke sab robots dikhao",
            "Sab kuch list karo",
            "Is section mein kya hai?",
            "Sab options dikhao",
        ],
        "expert": [
            "Is category ke sab products list karo",
            "Is section ka full inventory dikhao",
            "Current category mein sab filter karo",
        ],
    }
    te = {
        "beginner": [
            "Ikkada unna anni chupinchu",
            "Anni list cheyyi",
            "Ee section lo emi undi?",
            "Anni options chupinchu",
        ],
        "expert": [
            "Ee category lo anni products list cheyyi",
            "Is section full inventory chupinchu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)


def query_context_add_cart(lang, prof, p1):
    """User is on a product page and asks to add THE CURRENT product — no product name in query."""
    n = p1["name"]
    en = {
        "beginner": [
            "Add this to my cart",
            "I'll buy this one",
            "Put this in cart",
            "Add this robot to cart",
            "I want to buy this",
            f"Order this ({n})",
        ],
        "expert": [
            "Add current product to cart",
            "Stage this for purchase",
            f"Cart: add {n}",
            "Add this to checkout list",
        ],
    }
    hi = {
        "beginner": [
            "Isko cart mein daalo",
            "Yeh wala lena hai",
            "Ise cart mein add karo",
            "Yeh robot kharidna hai",
            "Is wale ko cart mein daalo",
        ],
        "expert": [
            "Current product ko cart mein add karo",
            "Ise checkout list mein add karo",
            f"{n} ko cart mein daalo",
        ],
    }
    te = {
        "beginner": [
            "Idi cart lo add cheyyi",
            "Ee robot konali",
            "Ee robot cart lo pettu",
            "Idi konali, cart lo add cheyyi",
            "Ee robot ni cart lo add cheyyi",
        ],
        "expert": [
            "Current product ni cart lo add cheyyi",
            "Idi checkout list lo add cheyyi",
            f"{n} ni cart lo pettu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)


# ── Row builders ──────────────────────────────────────────────────────────────

def make_row(idx, intent, lang, prof, cat=None, sub_idx=0):
    p1 = pick(BY_CAT[cat]) if cat else pick(PRODUCTS)
    p2 = None
    tool, args, ui_guide, query = None, {}, None, ""

    if intent == "browse_category":
        query = query_browse_category(lang, prof, cat, p1)
        q = pick(SEARCH_BY_CAT[cat])
        tool = "search_products"
        args = {"query": q, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]

    elif intent == "search_by_name":
        # B3 fix: pass p1 so the query uses the actual product name
        query = query_search_by_name(lang, prof, cat, p1)
        q = pick(SEARCH_BY_CAT[cat])
        tool = "search_products"
        args = {"query": q, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]

    elif intent == "get_product":
        query = query_get_product(lang, prof, p1)
        tool = "get_product"
        args = {"product_id": p1["id"]}
        ui_guide = None

    elif intent == "compare":
        same_cat = [p for p in BY_CAT[cat] if p["id"] != p1["id"]]
        p2 = pick(same_cat)
        focus = pick(FOCUS_BY_CAT[cat])
        query = query_compare(lang, prof, p1, p2, focus)
        tool = "compare_products"
        args = {"product_id_1": p1["id"], "product_id_2": p2["id"], "focus": focus}
        ui_guide = "compare_products"

    elif intent == "recommend":
        # B3 fix: ~30% of rows use cheapest/sasta/takkuva patterns (no explicit budget in query)
        if RNG.random() < 0.30:
            query = query_recommend_cheapest(lang, prof, cat)
            # Budget = cheapest product in this category + small buffer
            min_price = min(p["price"] for p in BY_CAT[cat])
            budget = int(min_price * 1.15) + 50
        else:
            budget = realistic_budget(cat)
            need = pick(NEEDS_BY_CAT[cat])
            query = query_recommend(lang, prof, cat, budget, need)
        need = pick(NEEDS_BY_CAT[cat])
        tool = "recommend"
        args = {"need": need, "budget": budget, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]

    elif intent == "add_to_cart":
        query = query_add_to_cart(lang, prof, p1)
        tool = "add_to_cart"
        args = {"product_id": p1["id"]}
        ui_guide = None

    elif intent == "nav_support":
        # B3 fix: cycle through sub-intents evenly instead of weighted random
        sub = SUPPORT_SUBINTENTS[sub_idx % len(SUPPORT_SUBINTENTS)]
        query = query_nav_support(lang, prof, sub)
        tool = "navigate_to"
        args = {"page": "orders", "params": {}}
        ui_guide = sub

    elif intent == "nav_cart_home":
        page = RNG.choice(["cart", "home"])
        query = query_nav_cart_home(lang, prof, page)
        tool = "navigate_to"
        if page == "cart":
            # B3 fix: explicit params for cart (consistent with pipeline expectations)
            args = {"page": "cart", "params": {}}
            ui_guide = "update_cart"
        else:
            # B3 fix: home navigation has NO params ({"page":"home"} only)
            args = {"page": "home"}
            ui_guide = None

    elif intent == "nav_location":
        cat = cat or pick(CATEGORIES)
        p1 = pick(BY_CAT[cat])
        query = query_nav_location(lang, prof, cat, p1)
        tool = "navigate_to"
        slug = CATEGORY_SLUG[cat]
        args = {"page": "catalog", "params": {"category": slug, "product_id": p1["id"]}}
        ui_guide = f"locate_path:{slug}:{p1['id']}"

    elif intent == "out_of_scope":
        query = query_out_of_scope(lang, prof)
        tool = "search_products"
        args = {"query": "robot", "category": None}
        ui_guide = None

    elif intent == "context_recommend":
        # Query has NO category name; model must use selectedCategory from context.
        # Force currentPage=catalog so the context clearly shows the user's location.
        query = query_context_recommend(lang, prof)
        budget = realistic_budget(cat)
        need = pick(NEEDS_BY_CAT[cat])
        tool = "recommend"
        args = {"need": need, "budget": budget, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]
        ctx = page_context_on_catalog(cat, p1)
        return {
            "id": f"v2_{lang}_{intent}_{idx:04d}",
            "language": lang,
            "proficiency": prof,
            "user_query": query,
            "page_context": ctx,
            "function_call": {"name": tool, "arguments": args},
            "ui_guide": ui_guide,
            "metadata": {"intent": intent, "source": "template_generator_v2_py_b3", "split": "train"},
        }

    elif intent == "context_browse":
        # Query has NO category name; model must use selectedCategory from context.
        query = query_context_browse(lang, prof)
        q = pick(SEARCH_BY_CAT[cat])
        tool = "search_products"
        args = {"query": q, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]
        ctx = page_context_on_catalog(cat, p1)
        return {
            "id": f"v2_{lang}_{intent}_{idx:04d}",
            "language": lang,
            "proficiency": prof,
            "user_query": query,
            "page_context": ctx,
            "function_call": {"name": tool, "arguments": args},
            "ui_guide": ui_guide,
            "metadata": {"intent": intent, "source": "template_generator_v2_py_b3", "split": "train"},
        }

    elif intent == "context_add_cart":
        # User is on a product page and says "add this" — no product name in query.
        # Force currentPage=product, currentProduct=p1["id"] so the model can resolve it.
        query = query_context_add_cart(lang, prof, p1)
        tool = "add_to_cart"
        args = {"product_id": p1["id"]}
        ui_guide = None
        ctx = page_context_on_product(cat, p1)
        return {
            "id": f"v2_{lang}_{intent}_{idx:04d}",
            "language": lang,
            "proficiency": prof,
            "user_query": query,
            "page_context": ctx,
            "function_call": {"name": tool, "arguments": args},
            "ui_guide": ui_guide,
            "metadata": {"intent": intent, "source": "template_generator_v2_py_b3", "split": "train"},
        }

    ctx = page_context(cat or pick(CATEGORIES), p1, p2)

    return {
        "id": f"v2_{lang}_{intent}_{idx:04d}",
        "language": lang,
        "proficiency": prof,
        "user_query": query,
        "page_context": ctx,
        "function_call": {"name": tool, "arguments": args},
        "ui_guide": ui_guide,
        "metadata": {
            "intent": intent,
            "source": "template_generator_v2_py_b3",
            "split": "train",
        },
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    rows = []
    global_idx = 1

    for intent, lang_counts in TARGETS.items():
        for lang, total in lang_counts.items():
            # Alternate proficiency beginner/expert
            for i in range(total):
                prof = "beginner" if i % 2 == 0 else "expert"
                cat = pick(CATEGORIES)
                # Pass i as sub_idx so nav_support cycles evenly through all 4 sub-intents
                row = make_row(global_idx, intent, lang, prof, cat, sub_idx=i)
                rows.append(row)
                global_idx += 1

    # Shuffle
    RNG.shuffle(rows)

    out_path = Path(__file__).resolve().parent.parent / "raw" / "function_calls_raw_v2.jsonl"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    # Stats
    from collections import Counter
    by_lang = Counter(r["language"] for r in rows)
    by_intent = Counter(r["metadata"]["intent"] for r in rows)
    by_tool = Counter(r["function_call"]["name"] for r in rows)
    by_prof = Counter(r["proficiency"] for r in rows)
    ui_guide_null = sum(1 for r in rows if r["ui_guide"] is None)

    # Verify nav_support sub-intent distribution
    nav_support_rows = [r for r in rows if r["metadata"]["intent"] == "nav_support"]
    nav_sub_counts = Counter(r["ui_guide"] for r in nav_support_rows)

    print(f"Written {len(rows)} rows → {out_path}")
    print(f"By language:   {dict(by_lang)}")
    print(f"By intent:     {dict(by_intent)}")
    print(f"By tool:       {dict(by_tool)}")
    print(f"By proficiency:{dict(by_prof)}")
    print(f"ui_guide null: {ui_guide_null}")
    print(f"nav_support sub-intents: {dict(nav_sub_counts)}")

if __name__ == "__main__":
    main()
