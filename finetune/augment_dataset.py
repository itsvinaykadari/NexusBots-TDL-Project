"""
Nexus Bots — Targeted Dataset Augmentation v3

Generates hard-focused examples for the three confirmed failure buckets:
  1. navigate_to (all pages, all languages) — was 36/49 failures
  2. search_products vs recommend disambiguation — was 26 failures
  3. add_to_cart / get_product / compare_products vs search — was 31 failures

Also doubles Telugu examples across all tools (TE was worst: 0.444 tool acc).

Output: research/dataset/raw/function_calls_augmented_v3.jsonl
        (merged into train/test via prepare_dataset.py)
"""

import json
import random
from pathlib import Path

random.seed(42)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = PROJECT_ROOT / "research" / "dataset" / "raw" / "function_calls_augmented_v3.jsonl"

PRODUCTS = [
    {"id": 1,  "name": "Amazon Astro",               "category": "Kitchen",      "price": 1599},
    {"id": 2,  "name": "Samsung Ballie",              "category": "Kitchen",      "price": 1299},
    {"id": 3,  "name": "Enabot EBO X",                "category": "Kitchen",      "price": 599},
    {"id": 4,  "name": "iRobot Roomba j9+",           "category": "Home Cleaner", "price": 799},
    {"id": 5,  "name": "Roborock S8 MaxV Ultra",      "category": "Home Cleaner", "price": 1799},
    {"id": 6,  "name": "Ecovacs WINBOT W2 Omni",      "category": "Home Cleaner", "price": 499},
    {"id": 7,  "name": "Ring Always Home Cam",        "category": "Drone",        "price": 249},
    {"id": 8,  "name": "DJI Matrice 30T",             "category": "Drone",        "price": 13600},
    {"id": 9,  "name": "Aiper Surfer S1",             "category": "Drone",        "price": 1399},
    {"id": 10, "name": "Miko 3",                      "category": "Humanoid",     "price": 249},
    {"id": 11, "name": "Wonder Workshop Dash",        "category": "Humanoid",     "price": 149},
    {"id": 12, "name": "LEGO Education Spike Prime",  "category": "Humanoid",     "price": 395},
]

CAT_SLUG = {"Kitchen": "kitchen", "Home Cleaner": "home-cleaner", "Drone": "drone", "Humanoid": "humanoid"}
CAT_GUIDE = {"Kitchen": "find_kitchen", "Home Cleaner": "find_home_cleaner", "Drone": "find_drone", "Humanoid": "find_humanoid"}

PAGES = ["home", "catalog", "assistant", "product", "cart", "orders"]

CONTEXTS = [
    {"currentPage": "home",    "selectedCategory": "",             "lastSearch": ""},
    {"currentPage": "catalog", "selectedCategory": "Drone",        "lastSearch": ""},
    {"currentPage": "product", "selectedCategory": "Home Cleaner", "lastSearch": ""},
    {"currentPage": "orders",  "selectedCategory": "",             "lastSearch": ""},
    {"currentPage": "catalog", "selectedCategory": "Kitchen",      "lastSearch": "robot"},
    {"currentPage": "home",    "selectedCategory": "Humanoid",     "lastSearch": ""},
    {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "lastSearch": "vacuum"},
    {"currentPage": "product", "selectedCategory": "Drone",        "lastSearch": ""},
]

rows = []
_id = 8000

def make_row(lang, proficiency, query, tool, args, ui_guide, context=None):
    global _id
    ctx = context or random.choice(CONTEXTS)
    row = {
        "id": f"aug_v3_{_id:04d}",
        "language": lang,
        "proficiency": proficiency,
        "user_query": query,
        "page_context": ctx,
        "function_call": {"name": tool, "arguments": args},
        "ui_guide": ui_guide,
        "metadata": {"source": "augmented_v3"},
    }
    _id += 1
    return row


# ═══════════════════════════════════════════════════════════════════════════════
# BUCKET 1 — navigate_to
# Key insight: model confuses ui_guide values (open_support, find_drone) with
# tool names. Need strong navigate_to signal with varied phrasings × all pages.
# ═══════════════════════════════════════════════════════════════════════════════

# --- 1a: orders page (check_orders ui_guide) ---
orders_en = [
    "Where are my orders?", "Show my order history", "I want to track my delivery",
    "Take me to order page", "Let me see my purchases", "My recent orders please",
    "Go to orders", "Order tracking", "I placed an order, where can I find it?",
    "Show me what I ordered", "How do I check delivery status?", "Open my orders",
    "Navigate to my orders page", "I want to see order details",
    "Can I view my past purchases?", "Check order status",
]
orders_hi = [
    "Mera order kahan hai?", "Mere orders dikhao", "Order track karna hai",
    "Orders page pe le jao", "Meri delivery kab aayegi?", "Main apne orders dekhna chahta hun",
    "Order history dikhao", "Meri purchase history", "Delivery status check karo",
    "Orders section mein le jao", "Mera order status kya hai?", "Orders page kholo",
    "Pichle orders dikhao", "Order ki jankari chahiye",
]
orders_te = [
    "Naa order ekkada undi?", "Naa orders chupinchu", "Order track cheyyali",
    "Orders page ki teesuko", "Delivery status chupinchu", "Naa purchases chupinchu",
    "Order history kavali", "Orders section ki navigate cheyyi", "Delivery ennapudu vasthundi?",
    "Naa order details chupinchu", "Orders page ki vello", "Order status check cheyyi",
]

for q in orders_en:
    rows.append(make_row("en", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, "check_orders"))
for q in orders_hi:
    rows.append(make_row("hi", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, "check_orders"))
for q in orders_te:
    rows.append(make_row("te", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, "check_orders"))

# --- 1b: support/ticket page (open_support, new_ticket, view_tickets) ---
# This was the #1 failure: model outputting "open_support" as tool name
support_en = [
    ("I need help with my robot", "open_support"),
    ("Contact customer support", "open_support"),
    ("Something is wrong with my order", "open_support"),
    ("I have a complaint", "open_support"),
    ("Talk to support team", "open_support"),
    ("Open a support chat", "open_support"),
    ("I need assistance", "open_support"),
    ("Help me with an issue", "open_support"),
    ("File a new complaint", "new_ticket"),
    ("Create a support ticket", "new_ticket"),
    ("Submit a new ticket about my order", "new_ticket"),
    ("I want to raise a complaint", "new_ticket"),
    ("Log a new issue", "new_ticket"),
    ("File a ticket for defective product", "new_ticket"),
    ("View my open tickets", "view_tickets"),
    ("Show my support tickets", "view_tickets"),
    ("Check ticket status", "view_tickets"),
    ("My existing complaints", "view_tickets"),
]
support_hi = [
    ("Support se baat karni hai", "open_support"),
    ("Mujhe help chahiye", "open_support"),
    ("Customer support se connect karo", "open_support"),
    ("Meri problem solve karo", "open_support"),
    ("Issue report karna hai", "open_support"),
    ("Complaint karni hai", "new_ticket"),
    ("Naya ticket file karo", "new_ticket"),
    ("Mera product kharab hai, ticket banao", "new_ticket"),
    ("Support ticket submit karo", "new_ticket"),
    ("Mere purane tickets dikhao", "view_tickets"),
    ("Ticket status kya hai?", "view_tickets"),
    ("Open complaints dikhao", "view_tickets"),
]
support_te = [
    ("Naaku help kavali", "open_support"),
    ("Support team tho matladali", "open_support"),
    ("Customer support open cheyyi", "open_support"),
    ("Naa issue fix cheyyi", "open_support"),
    ("New complaint file cheyyi", "new_ticket"),
    ("Ticket create cheyyi", "new_ticket"),
    ("Naa product lo problem undi, ticket raise cheyyi", "new_ticket"),
    ("Naa tickets chupinchu", "view_tickets"),
    ("Open tickets status chupinchu", "view_tickets"),
    ("Naa complaints chupinchu", "view_tickets"),
]

for q, guide in support_en:
    rows.append(make_row("en", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, guide))
for q, guide in support_hi:
    rows.append(make_row("hi", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, guide))
for q, guide in support_te:
    rows.append(make_row("te", random.choice(["beginner","intermediate"]), q,
                         "navigate_to", {"page": "orders", "params": {}}, guide))

# --- 1c: cart page ---
cart_en = [
    "Go to my cart", "Open cart", "View my shopping cart", "Show my basket",
    "I want to checkout", "Take me to checkout", "Cart page please", "What's in my cart?",
    "Open my basket", "Proceed to checkout",
]
cart_hi = [
    "Cart dikhao", "Shopping cart kholo", "Checkout pe le jao", "Mera cart dekhna hai",
    "Cart mein kya hai?", "Checkout karna hai", "Cart page kholo",
]
cart_te = [
    "Cart chupinchu", "Shopping cart open cheyyi", "Checkout ki vello",
    "Naa cart lo emundi?", "Cart page ki teesuko", "Checkout cheyali",
]

for q in cart_en:
    rows.append(make_row("en", "intermediate", q,
                         "navigate_to", {"page": "cart", "params": {}}, "update_cart"))
for q in cart_hi:
    rows.append(make_row("hi", "intermediate", q,
                         "navigate_to", {"page": "cart", "params": {}}, "update_cart"))
for q in cart_te:
    rows.append(make_row("te", "intermediate", q,
                         "navigate_to", {"page": "cart", "params": {}}, "update_cart"))

# --- 1d: catalog page with category (find_<cat> ui_guide) ---
catalog_templates = {
    "Kitchen":      (["Show kitchen robots", "Browse kitchen bots", "Kitchen robot list", "All kitchen products", "Show me kitchen category"],
                     ["Kitchen robots dikhao", "Kitchen category kholo", "Sab kitchen robots"],
                     ["Kitchen robots chupinchu", "Kitchen category open cheyyi", "Kitchen bots list"]),
    "Home Cleaner": (["Show home cleaner robots", "Browse vacuum bots", "Home cleaning robots", "All cleaning products", "Show cleaners"],
                     ["Home cleaner robots dikhao", "Vacuum bots dikhao", "Cleaning robots list"],
                     ["Home cleaner robots chupinchu", "Vacuum bots chupinchu", "Cleaning robots list"]),
    "Drone":        (["Show drones", "Browse drones", "Drone robot list", "All drones", "Show drone category"],
                     ["Drones dikhao", "Drone category kholo", "Sab drones dikhao"],
                     ["Drones chupinchu", "Drone category open cheyyi", "Drone list"]),
    "Humanoid":     (["Show humanoid robots", "Browse humanoids", "Humanoid robot list", "All humanoids", "Show humanoid category"],
                     ["Humanoid robots dikhao", "Humanoid category kholo", "Sab humanoid robots"],
                     ["Humanoid robots chupinchu", "Humanoid category open cheyyi", "Humanoid bots list"]),
}

for cat, (en_qs, hi_qs, te_qs) in catalog_templates.items():
    slug = CAT_SLUG[cat]
    guide = CAT_GUIDE[cat]
    for q in en_qs:
        rows.append(make_row("en", "beginner", q,
                             "navigate_to", {"page": "catalog", "params": {"category": slug}}, guide))
    for q in hi_qs:
        rows.append(make_row("hi", "beginner", q,
                             "navigate_to", {"page": "catalog", "params": {"category": slug}}, guide))
    for q in te_qs:
        rows.append(make_row("te", "beginner", q,
                             "navigate_to", {"page": "catalog", "params": {"category": slug}}, guide))

# --- 1e: home/main page ---
home_en  = ["Go home", "Take me to main page", "Back to home", "Home page", "Return to main", "Go to homepage"]
home_hi  = ["Home pe le jao", "Main page kholo", "Ghar wapas jao", "Home page dikhao"]
home_te  = ["Home ki vello", "Main page ki teesuko", "Home page chupinchu"]
for q in home_en:
    rows.append(make_row("en", "beginner", q, "navigate_to", {"page": "home", "params": {}}, None))
for q in home_hi:
    rows.append(make_row("hi", "beginner", q, "navigate_to", {"page": "home", "params": {}}, None))
for q in home_te:
    rows.append(make_row("te", "beginner", q, "navigate_to", {"page": "home", "params": {}}, None))

# --- 1f: product detail page (navigate_to product with id) ---
for p in PRODUCTS:
    en_qs = [f"Show {p['name']} product page", f"Go to {p['name']} page", f"Open {p['name']} details page"]
    hi_qs = [f"{p['name']} ka product page dikhao", f"{p['name']} page kholo"]
    te_qs = [f"{p['name']} product page chupinchu", f"{p['name']} page open cheyyi"]
    for q in random.sample(en_qs, 1):
        rows.append(make_row("en", "intermediate", q,
                             "navigate_to", {"page": "product", "params": {"product_id": p["id"]}}, None,
                             {"currentPage": "catalog", "selectedCategory": p["category"], "product_id": p["id"]}))
    for q in random.sample(hi_qs, 1):
        rows.append(make_row("hi", "intermediate", q,
                             "navigate_to", {"page": "product", "params": {"product_id": p["id"]}}, None,
                             {"currentPage": "catalog", "selectedCategory": p["category"], "product_id": p["id"]}))
    for q in random.sample(te_qs, 1):
        rows.append(make_row("te", "intermediate", q,
                             "navigate_to", {"page": "product", "params": {"product_id": p["id"]}}, None,
                             {"currentPage": "catalog", "selectedCategory": p["category"], "product_id": p["id"]}))


# ═══════════════════════════════════════════════════════════════════════════════
# BUCKET 2 — search_products vs recommend DISAMBIGUATION
# Core signal: recommend = "which/best/suggest/under budget/for X need"
#              search    = "find/show/list/browse"
# ═══════════════════════════════════════════════════════════════════════════════

# --- 2a: recommend (clear advisory / budget / need signals) ---
recommend_cases = [
    # (query, need, budget, category, lang)
    # EN
    ("Which kitchen robot should I buy?",         "general kitchen assistant", 2000, "Kitchen",      "en"),
    ("Best kitchen robot under $1500",             "kitchen tasks",            1500, "Kitchen",      "en"),
    ("Suggest a good home cleaner for me",         "floor cleaning",           1000, "Home Cleaner", "en"),
    ("What drone do you recommend for beginners?", "entry level drone",        500,  "Drone",        "en"),
    ("I need a humanoid robot for my classroom",   "classroom education",      500,  "Humanoid",     "en"),
    ("Best robot under 500 dollars",               "general",                  500,  "",             "en"),
    ("What is the best budget drone?",             "budget drone",             400,  "Drone",        "en"),
    ("Can you suggest a cleaner for small homes?", "compact cleaner",          800,  "Home Cleaner", "en"),
    ("Which humanoid is good for kids?",           "kids education",           300,  "Humanoid",     "en"),
    ("Recommend me a drone for surveillance",      "surveillance",             2000, "Drone",        "en"),
    ("What would you suggest for window cleaning?","window cleaning",          600,  "Home Cleaner", "en"),
    ("I want the best kitchen bot available",      "premium kitchen",          2000, "Kitchen",      "en"),
    ("Good robot for child aged 8",                "kids learning",            300,  "Humanoid",     "en"),
    ("Which robot fits my $800 budget?",           "general",                  800,  "",             "en"),
    # HI
    ("Konsa kitchen robot lena chahiye?",          "kitchen help",             1500, "Kitchen",      "hi"),
    ("Best home cleaner robot suggest karo",       "floor cleaning",           1000, "Home Cleaner", "hi"),
    ("Budget drone kaun sa best hai?",             "budget drone",             400,  "Drone",        "hi"),
    ("Mere liye achha robot recommend karo",       "general",                  1000, "",             "hi"),
    ("Bacchon ke liye robot kaun sa better hai?",  "kids education",           300,  "Humanoid",     "hi"),
    ("Sabse achha kitchen assistant kya hai?",     "kitchen assistant",        2000, "Kitchen",      "hi"),
    ("1000 rupee mein best cleaner kaun sa?",      "budget cleaner",           1000, "Home Cleaner", "hi"),
    ("Drone lena hai, kaun sa suggest karoge?",    "drone",                    1500, "Drone",        "hi"),
    # TE
    ("Entha manchi kitchen robot kaavali?",        "kitchen help",             1500, "Kitchen",      "te"),
    ("Budget drone suggest cheyyi",                "budget drone",             400,  "Drone",        "te"),
    ("Home cleaner robot suggest cheyyi",          "cleaning",                 800,  "Home Cleaner", "te"),
    ("Pillalaki manchi robot edi?",                "kids learning",            300,  "Humanoid",     "te"),
    ("Best drone ekkada dorkutundi?",              "drone",                    1500, "Drone",        "te"),
    ("Naaku oka good robot recommend cheyyi",      "general",                  1000, "",             "te"),
    ("500 dollarslo best robot edi?",              "budget",                   500,  "",             "te"),
    ("Surveillance ki drone suggest cheyyi",       "surveillance drone",       2000, "Drone",        "te"),
]

for (query, need, budget, cat, lang) in recommend_cases:
    guide = CAT_GUIDE.get(cat) if cat else None
    args = {"need": need, "budget": budget}
    if cat:
        args["category"] = cat
    rows.append(make_row(lang, "intermediate", query, "recommend", args, guide))

# --- 2b: search_products (explicit browse/find/list/show signals) ---
search_cases = [
    # (query, search_query, category, lang)
    # EN
    ("Show me kitchen robots",          "kitchen robots",       "Kitchen",      "en"),
    ("Find home cleaning bots",         "home cleaning",        "Home Cleaner", "en"),
    ("List all drones",                 "drones",               "Drone",        "en"),
    ("Search for humanoid robots",      "humanoid robots",      "Humanoid",     "en"),
    ("Show all available robots",       "robots",               "",             "en"),
    ("Find Roomba",                     "Roomba",               "Home Cleaner", "en"),
    ("Search kitchen bots",             "kitchen bots",         "Kitchen",      "en"),
    ("Browse drones under $500",        "drones under 500",     "Drone",        "en"),
    ("Look up floor cleaning robots",   "floor cleaning robot", "Home Cleaner", "en"),
    ("Show me all products",            "robots",               "",             "en"),
    ("Find robots for kids",            "robots for kids",      "Humanoid",     "en"),
    ("Search for Roomba alternatives",  "Roomba alternatives",  "Home Cleaner", "en"),
    ("Find enterprise drones",          "enterprise drone",     "Drone",        "en"),
    ("Show pool cleaning drones",       "pool cleaning drone",  "Drone",        "en"),
    # HI
    ("Kitchen robots dikhao",           "kitchen robots",       "Kitchen",      "hi"),
    ("Drones ki list dikhao",           "drones",               "Drone",        "hi"),
    ("Cleaning robots search karo",     "cleaning robots",      "Home Cleaner", "hi"),
    ("Sab robots dikhao",               "robots",               "",             "hi"),
    ("Humanoid robots dhundho",         "humanoid robots",      "Humanoid",     "hi"),
    ("Drone category mein search karo", "drones",               "Drone",        "hi"),
    ("Home cleaner robots dikhao",      "home cleaner",         "Home Cleaner", "hi"),
    ("Sab products ki list chahiye",    "robots",               "",             "hi"),
    # TE
    ("Kitchen robots chupinchu",        "kitchen robots",       "Kitchen",      "te"),
    ("Drones list chupinchu",           "drones",               "Drone",        "te"),
    ("Cleaning robots search cheyyi",   "cleaning robots",      "Home Cleaner", "te"),
    ("Anni robots chupinchu",           "robots",               "",             "te"),
    ("Humanoid robots chupinchu",       "humanoid robots",      "Humanoid",     "te"),
    ("Home cleaner robots list",        "home cleaner",         "Home Cleaner", "te"),
    ("Drone search cheyyi",             "drones",               "Drone",        "te"),
    ("Anni products chupinchu",         "robots",               "",             "te"),
]

for (query, sq, cat, lang) in search_cases:
    guide = CAT_GUIDE.get(cat) if cat else None
    args = {"query": sq}
    if cat:
        args["category"] = cat
    rows.append(make_row(lang, "beginner", query, "search_products", args, guide))


# ═══════════════════════════════════════════════════════════════════════════════
# BUCKET 3 — add_to_cart / get_product / compare_products
# Model was collapsing these to search_products (31 failures)
# Key signals: add_to_cart = add/buy/purchase/cart + product_id in context
#              get_product  = show details/info/specs + product_id
#              compare      = compare/difference/vs/better
# ═══════════════════════════════════════════════════════════════════════════════

# --- 3a: add_to_cart ---
for p in PRODUCTS:
    cat = p["category"]
    ctx = {"currentPage": "product", "selectedCategory": cat, "product_id": p["id"]}
    en_qs = [
        f"Add {p['name']} to cart",
        f"Buy {p['name']}",
        f"Purchase {p['name']}",
        f"Add this to my cart",
        f"Put {p['name']} in my basket",
        f"I want to buy {p['name']}",
        f"Add to cart",
    ]
    hi_qs = [
        f"{p['name']} cart mein add karo",
        f"{p['name']} kharidna hai",
        f"Ise cart mein daalo",
        f"{p['name']} purchase karna hai",
        f"Cart mein add karo",
    ]
    te_qs = [
        f"{p['name']} ni cart lo add cheyyi",
        f"{p['name']} konu",
        f"Idi cart lo add cheyyi",
        f"{p['name']} purchase cheyyi",
        f"Cart ki add cheyyi",
    ]
    sample_en = random.sample(en_qs, min(3, len(en_qs)))
    sample_hi = random.sample(hi_qs, min(2, len(hi_qs)))
    sample_te = random.sample(te_qs, min(2, len(te_qs)))
    for q in sample_en:
        rows.append(make_row("en", random.choice(["beginner","intermediate"]), q,
                             "add_to_cart", {"product_id": p["id"]}, None, ctx))
    for q in sample_hi:
        rows.append(make_row("hi", random.choice(["beginner","intermediate"]), q,
                             "add_to_cart", {"product_id": p["id"]}, None, ctx))
    for q in sample_te:
        rows.append(make_row("te", random.choice(["beginner","intermediate"]), q,
                             "add_to_cart", {"product_id": p["id"]}, None, ctx))

# --- 3b: get_product (show details, not buy/search) ---
for p in PRODUCTS:
    cat = p["category"]
    ctx = {"currentPage": "catalog", "selectedCategory": cat, "product_id": p["id"]}
    en_qs = [
        f"Show details of {p['name']}",
        f"Tell me about {p['name']}",
        f"What are the specs of {p['name']}?",
        f"Show {p['name']} specifications",
        f"Get info on {p['name']}",
        f"Product details for {p['name']}",
        f"Show me {p['name']} features",
    ]
    hi_qs = [
        f"{p['name']} ki details dikhao",
        f"{p['name']} ke baare mein batao",
        f"{p['name']} ki specs kya hain?",
        f"{p['name']} ki jankari do",
        f"{p['name']} ka product info dikhao",
    ]
    te_qs = [
        f"{p['name']} details chupinchu",
        f"{p['name']} gurinchi cheppu",
        f"{p['name']} specs em undi?",
        f"{p['name']} product info chupinchu",
        f"{p['name']} features chupinchu",
    ]
    sample_en = random.sample(en_qs, min(2, len(en_qs)))
    sample_hi = random.sample(hi_qs, min(2, len(hi_qs)))
    sample_te = random.sample(te_qs, min(2, len(te_qs)))
    for q in sample_en:
        rows.append(make_row("en", "intermediate", q,
                             "get_product", {"product_id": p["id"]}, None, ctx))
    for q in sample_hi:
        rows.append(make_row("hi", "intermediate", q,
                             "get_product", {"product_id": p["id"]}, None, ctx))
    for q in sample_te:
        rows.append(make_row("te", "intermediate", q,
                             "get_product", {"product_id": p["id"]}, None, ctx))

# --- 3c: compare_products (clear vs/compare/difference signals) ---
compare_pairs = [
    (1, 2,  "price"),
    (4, 5,  "suction"),
    (7, 9,  "battery"),
    (10, 11, "safety"),
    (5, 6,  "maintenance"),
    (8, 7,  "camera"),
    (2, 3,  "specs"),
    (11, 12, "price"),
    (4, 6,  "suction"),
    (7, 8,  "price"),
    (10, 12, "specs"),
    (1, 3,  "price"),
]

for (id1, id2, focus) in compare_pairs:
    p1 = next(p for p in PRODUCTS if p["id"] == id1)
    p2 = next(p for p in PRODUCTS if p["id"] == id2)
    en_qs = [
        f"Compare {p1['name']} vs {p2['name']}",
        f"What is the difference between {p1['name']} and {p2['name']}?",
        f"Which is better, {p1['name']} or {p2['name']}?",
        f"{p1['name']} vs {p2['name']} comparison",
    ]
    hi_qs = [
        f"{p1['name']} aur {p2['name']} mein kya fark hai?",
        f"{p1['name']} vs {p2['name']} compare karo",
        f"Konsa better hai, {p1['name']} ya {p2['name']}?",
    ]
    te_qs = [
        f"{p1['name']} vs {p2['name']} compare cheyyi",
        f"{p1['name']} mariyu {p2['name']} lo teda em?",
        f"Eedi better, {p1['name']} or {p2['name']}?",
    ]
    for q in en_qs:
        rows.append(make_row("en", "intermediate", q,
                             "compare_products", {"product_id_1": id1, "product_id_2": id2, "focus": focus},
                             "compare_products"))
    for q in hi_qs:
        rows.append(make_row("hi", "intermediate", q,
                             "compare_products", {"product_id_1": id1, "product_id_2": id2, "focus": focus},
                             "compare_products"))
    for q in te_qs:
        rows.append(make_row("te", "intermediate", q,
                             "compare_products", {"product_id_1": id1, "product_id_2": id2, "focus": focus},
                             "compare_products"))


# ═══════════════════════════════════════════════════════════════════════════════
# BUCKET 4 — Hard negatives: near-boundary cases with clear labels
# These teach the model the EXACT distinguishing signals
# ═══════════════════════════════════════════════════════════════════════════════

hard_negatives = [
    # search vs recommend boundary
    ("Find kitchen robots under $500",   "search_products", {"query": "kitchen robots under 500", "category": "Kitchen"}, CAT_GUIDE["Kitchen"], "en"),
    ("Which kitchen robot is under $500?","recommend",      {"need": "budget kitchen robot", "budget": 500, "category": "Kitchen"}, CAT_GUIDE["Kitchen"], "en"),
    ("Show drones",                       "search_products", {"query": "drones", "category": "Drone"}, CAT_GUIDE["Drone"], "en"),
    ("Suggest a drone for me",            "recommend",      {"need": "general drone", "budget": 2000, "category": "Drone"}, CAT_GUIDE["Drone"], "en"),
    ("List all home cleaners",            "search_products", {"query": "home cleaners", "category": "Home Cleaner"}, CAT_GUIDE["Home Cleaner"], "en"),
    ("Best home cleaner for my needs",    "recommend",      {"need": "home cleaning", "budget": 1000, "category": "Home Cleaner"}, CAT_GUIDE["Home Cleaner"], "en"),
    # add_to_cart vs get_product boundary
    ("Tell me more about iRobot Roomba j9+", "get_product", {"product_id": 4}, None, "en"),
    ("Add iRobot Roomba j9+ to cart",        "add_to_cart",  {"product_id": 4}, None, "en"),
    ("What are the specs of DJI Matrice 30T?","get_product", {"product_id": 8}, None, "en"),
    ("Buy DJI Matrice 30T",                   "add_to_cart",  {"product_id": 8}, None, "en"),
    # HI hard negatives
    ("Drones ki list chahiye",           "search_products", {"query": "drones", "category": "Drone"}, CAT_GUIDE["Drone"], "hi"),
    ("Best drone suggest karo",          "recommend",      {"need": "drone", "budget": 1500, "category": "Drone"}, CAT_GUIDE["Drone"], "hi"),
    ("Miko 3 ki details dikhao",         "get_product",    {"product_id": 10}, None, "hi"),
    ("Miko 3 kharidna hai",              "add_to_cart",    {"product_id": 10}, None, "hi"),
    # TE hard negatives
    ("Drones list chupinchu",            "search_products", {"query": "drones", "category": "Drone"}, CAT_GUIDE["Drone"], "te"),
    ("Manchi drone suggest cheyyi",      "recommend",      {"need": "drone", "budget": 1500, "category": "Drone"}, CAT_GUIDE["Drone"], "te"),
    ("Amazon Astro details chupinchu",   "get_product",    {"product_id": 1}, None, "te"),
    ("Amazon Astro konu",                "add_to_cart",    {"product_id": 1}, None, "te"),
]

for (query, tool, args, guide, lang) in hard_negatives:
    ctx = None
    if tool == "add_to_cart":
        pid = args.get("product_id", 1)
        p = next((p for p in PRODUCTS if p["id"] == pid), PRODUCTS[0])
        ctx = {"currentPage": "product", "selectedCategory": p["category"], "product_id": pid}
    elif tool == "get_product":
        pid = args.get("product_id", 1)
        p = next((p for p in PRODUCTS if p["id"] == pid), PRODUCTS[0])
        ctx = {"currentPage": "catalog", "selectedCategory": p["category"], "product_id": pid}
    rows.append(make_row(lang, "advanced", query, tool, args, guide, ctx))


# ═══════════════════════════════════════════════════════════════════════════════
# WRITE OUTPUT
# ═══════════════════════════════════════════════════════════════════════════════

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_PATH, "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

# Print stats
from collections import Counter, defaultdict
tool_counts = Counter(r["function_call"]["name"] for r in rows)
lang_counts = Counter(r["language"] for r in rows)
tl = defaultdict(Counter)
for r in rows:
    tl[r["function_call"]["name"]][r["language"]] += 1

print(f"Generated {len(rows)} augmented examples → {OUT_PATH}")
print(f"\nBy tool:")
for t, n in sorted(tool_counts.items()):
    print(f"  {t:25s} {n:4d}")
print(f"\nBy language: {dict(lang_counts)}")
print(f"\nTool × Language:")
for tool in sorted(tl):
    print(f"  {tool:25s}", dict(tl[tool]))
