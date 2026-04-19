#!/usr/bin/env python3
"""
Nexus Bots — Python template dataset generator v2.

Covers all intent groups from the PLAN.md target distribution (970 rows):
  1.  browse_category       → search_products + find_{category}
  2.  search_by_name        → search_products + find_{category}
  3.  get_product           → get_product + null
  4.  compare_products      → compare_products + compare_products
  5.  recommend             → recommend + find_{category}
  6.  add_to_cart           → add_to_cart + null
  7.  nav_orders_support    → navigate_to orders + open_support/new_ticket/view_tickets/check_orders
  8.  nav_cart_home         → navigate_to cart|home + update_cart|null
  9.  nav_location          → navigate_to catalog + locate_path:{cat}:{id}
  10. out_of_scope          → search_products query=robot + null

Improvements over JS v1:
  - ui_guide field embedded in raw data (no heuristic needed in prepare_dataset.py)
  - Support flows: open_support / new_ticket / view_tickets
  - Location intent: "drone kahan milega" → navigate_to + locate_path
  - Out-of-scope robustness set
  - Proficiency ~50/50 split per language per intent
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
    cat_ids = [p["id"] for p in BY_CAT[cat]]
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

# ── Target distribution ───────────────────────────────────────────────────────
# (intent, tool): {lang: count}
TARGETS = {
    "browse_category":    {"en": 70, "hi": 35, "te": 25},
    "search_by_name":     {"en": 50, "hi": 25, "te": 15},
    "get_product":        {"en": 60, "hi": 30, "te": 20},
    "compare":            {"en": 65, "hi": 30, "te": 15},
    "recommend":          {"en": 65, "hi": 30, "te": 15},
    "add_to_cart":        {"en": 50, "hi": 25, "te": 15},
    "nav_support":        {"en": 70, "hi": 35, "te": 25},
    "nav_cart_home":      {"en": 40, "hi": 20, "te": 10},
    "nav_location":       {"en": 50, "hi": 25, "te": 15},
    "out_of_scope":       {"en": 25, "hi": 10, "te":  5},
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
    q = pick(SEARCH_BY_CAT[cat])
    en = {
        "beginner": [
            f"Find {q}",
            f"Search for {q}",
            f"Looking for {q}",
            f"Show me {q}",
            f"I need {q}",
        ],
        "expert": [
            f"Search catalog for {q}",
            f"Filter products by {q}",
            f"Query for {q} in {cat}",
            f"Find {q} listings",
        ],
    }
    hi = {
        "beginner": [
            f"{q} dhundho",
            f"Mujhe {q} chahiye",
            f"{q} search karo",
            f"{q} dikhao",
        ],
        "expert": [
            f"{q} ke liye catalog search karo",
            f"{cat} mein {q} filter karo",
            f"{q} listings fetch karo",
        ],
    }
    te = {
        "beginner": [
            f"{q} search cheyyi",
            f"Naaku {q} kavali",
            f"{q} chupinchu",
            f"{q} dorikutundo cheppu",
        ],
        "expert": [
            f"{q} catalog lo search cheyyi",
            f"{cat} lo {q} filter cheyyi",
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

def query_add_to_cart(lang, prof, p1):
    n = p1["name"]
    en = {
        "beginner": [
            f"Add {n} to my cart",
            f"Put {n} in cart",
            f"I want to buy {n}",
            f"Add {n} please",
            f"Buy {n}",
        ],
        "expert": [
            f"Add {n} to checkout shortlist",
            f"Queue {n} in cart",
            f"Stage {n} for purchase",
            f"Insert {n} into purchase cart",
        ],
    }
    hi = {
        "beginner": [
            f"{n} cart mein add karo",
            f"Mere cart mein {n} daal do",
            f"{n} kharidna hai, cart mein dalo",
            f"{n} add karo cart mein",
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
        ],
        "expert": [
            f"{n} ni cart shortlist lo add cheyyi",
            f"{n} ni purchase cart lo insert cheyyi",
            f"{n} cart queue lo pettu",
        ],
    }
    return _q({"en": en, "hi": hi, "te": te}[lang], prof)

# Support intent queries — ui_guide varies by sub-intent
SUPPORT_SUBINTENTS = [
    ("check_orders",   0.30),  # check order status
    ("open_support",   0.30),  # open a support ticket
    ("new_ticket",     0.20),  # file a new ticket
    ("view_tickets",   0.20),  # view existing tickets
]

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

# ── Row builders ──────────────────────────────────────────────────────────────

def make_row(idx, intent, lang, prof, cat=None):
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
        budget = realistic_budget(cat)
        need = pick(NEEDS_BY_CAT[cat])
        query = query_recommend(lang, prof, cat, budget, need)
        tool = "recommend"
        args = {"need": need, "budget": budget, "category": cat}
        ui_guide = CATEGORY_GUIDE[cat]

    elif intent == "add_to_cart":
        query = query_add_to_cart(lang, prof, p1)
        tool = "add_to_cart"
        args = {"product_id": p1["id"]}
        ui_guide = None

    elif intent == "nav_support":
        weights = [w for _, w in SUPPORT_SUBINTENTS]
        sub = RNG.choices([s for s, _ in SUPPORT_SUBINTENTS], weights=weights, k=1)[0]
        query = query_nav_support(lang, prof, sub)
        tool = "navigate_to"
        args = {"page": "orders", "params": {}}
        ui_guide = sub

    elif intent == "nav_cart_home":
        page = RNG.choice(["cart", "home"])
        query = query_nav_cart_home(lang, prof, page)
        tool = "navigate_to"
        args = {"page": page, "params": {}}
        ui_guide = "update_cart" if page == "cart" else None

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
            "source": "template_generator_v2_py",
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
                row = make_row(global_idx, intent, lang, prof, cat)
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

    print(f"Written {len(rows)} rows → {out_path}")
    print(f"By language:   {dict(by_lang)}")
    print(f"By intent:     {dict(by_intent)}")
    print(f"By tool:       {dict(by_tool)}")
    print(f"By proficiency:{dict(by_prof)}")
    print(f"ui_guide null: {ui_guide_null}")

if __name__ == "__main__":
    main()
