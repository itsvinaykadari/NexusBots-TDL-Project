"""
Nexus Bots — B2 Evaluation Prompt Suite (75 prompts)

Covers all 6 tools × 3 languages (EN / HI romanized / TE romanized)
at varying complexity levels (simple, multi-cue, ambiguous, edge-case).

Each entry:
  id          : unique prompt ID
  lang        : en | hi | te
  level       : simple | medium | complex | edge
  user_query  : the raw message
  context     : page_context dict
  expected    : ground-truth {tool, arguments, ui_guide}
  intent      : human-readable intent label
"""

PROMPTS = [

    # ══════════════════════════════════════════════════════════════════
    # SECTION 1 — search_products  (browse / keyword search)
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_001", "lang": "en", "level": "simple", "intent": "browse_category",
        "user_query": "show me all kitchen robots",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "kitchen robots", "category": "Kitchen"}, "ui_guide": "find_kitchen"},
    },
    {
        "id": "B2_002", "lang": "en", "level": "simple", "intent": "browse_category",
        "user_query": "list all drone robots",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "drone robots", "category": "Drone"}, "ui_guide": "find_drone"},
    },
    {
        "id": "B2_003", "lang": "en", "level": "medium", "intent": "search_by_name",
        "user_query": "show me robots that can clean windows",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "window cleaning robot", "category": "Home Cleaner"}, "ui_guide": "find_home_cleaner"},
    },
    {
        "id": "B2_004", "lang": "en", "level": "medium", "intent": "browse_category",
        "user_query": "I want a robot for kids, what do you have?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "kids robot", "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_005", "lang": "en", "level": "complex", "intent": "browse_category",
        "user_query": "what home cleaning robots do you sell that auto-empty?",
        "context": {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [4], "currentProduct": 4},
        "expected": {"tool": "search_products", "arguments": {"query": "self-emptying vacuum robot", "category": "Home Cleaner"}, "ui_guide": "find_home_cleaner"},
    },
    {
        "id": "B2_006", "lang": "hi", "level": "simple", "intent": "browse_category",
        "user_query": "kitchen robots dikhao",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "kitchen robots", "category": "Kitchen"}, "ui_guide": "find_kitchen"},
    },
    {
        "id": "B2_007", "lang": "hi", "level": "simple", "intent": "browse_category",
        "user_query": "humanoid robots list karo",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "humanoid robots", "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_008", "lang": "hi", "level": "medium", "intent": "browse_category",
        "user_query": "window cleaning robot chahiye",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "window cleaning robot", "category": "Home Cleaner"}, "ui_guide": "find_home_cleaner"},
    },
    {
        "id": "B2_009", "lang": "te", "level": "simple", "intent": "browse_category",
        "user_query": "drone robots chupinchandi",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "drone robots", "category": "Drone"}, "ui_guide": "find_drone"},
    },
    {
        "id": "B2_010", "lang": "te", "level": "medium", "intent": "browse_category",
        "user_query": "kitchen robots list cheyyi",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "kitchen robots", "category": "Kitchen"}, "ui_guide": "find_kitchen"},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 2 — get_product
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_011", "lang": "en", "level": "simple", "intent": "get_product",
        "user_query": "tell me about DJI Matrice 30T",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "get_product", "arguments": {"product_id": 8}, "ui_guide": None},
    },
    {
        "id": "B2_012", "lang": "en", "level": "simple", "intent": "get_product",
        "user_query": "what is Miko 3?",
        "context": {"currentPage": "catalog", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [10], "currentProduct": 10},
        "expected": {"tool": "get_product", "arguments": {"product_id": 10}, "ui_guide": None},
    },
    {
        "id": "B2_013", "lang": "en", "level": "medium", "intent": "get_product",
        "user_query": "give me the full specs of Roborock S8 MaxV Ultra",
        "context": {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [5], "currentProduct": 5},
        "expected": {"tool": "get_product", "arguments": {"product_id": 5}, "ui_guide": None},
    },
    {
        "id": "B2_014", "lang": "en", "level": "complex", "intent": "get_product",
        "user_query": "what is the specification of this robot",
        "context": {"currentPage": "product", "selectedCategory": "Drone", "cart": [], "viewedProducts": [8], "currentProduct": 8},
        "expected": {"tool": "get_product", "arguments": {"product_id": 8}, "ui_guide": None},
    },
    {
        "id": "B2_015", "lang": "hi", "level": "simple", "intent": "get_product",
        "user_query": "DJI Matrice 30T ke baare mein batao",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "get_product", "arguments": {"product_id": 8}, "ui_guide": None},
    },
    {
        "id": "B2_016", "lang": "hi", "level": "simple", "intent": "get_product",
        "user_query": "Samsung Ballie ke details do",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "get_product", "arguments": {"product_id": 2}, "ui_guide": None},
    },
    {
        "id": "B2_017", "lang": "hi", "level": "medium", "intent": "get_product",
        "user_query": "Wonder Workshop Dash ke baare mein batao",
        "context": {"currentPage": "catalog", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [11], "currentProduct": 11},
        "expected": {"tool": "get_product", "arguments": {"product_id": 11}, "ui_guide": None},
    },
    {
        "id": "B2_018", "lang": "te", "level": "simple", "intent": "get_product",
        "user_query": "Miko 3 gurinchi cheppu",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "get_product", "arguments": {"product_id": 10}, "ui_guide": None},
    },
    {
        "id": "B2_019", "lang": "te", "level": "simple", "intent": "get_product",
        "user_query": "Amazon Astro details ivvu",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "get_product", "arguments": {"product_id": 1}, "ui_guide": None},
    },
    {
        "id": "B2_020", "lang": "te", "level": "medium", "intent": "get_product",
        "user_query": "DJI Matrice 30T gurinchi cheppu",
        "context": {"currentPage": "catalog", "selectedCategory": "Drone", "cart": [], "viewedProducts": [8], "currentProduct": 8},
        "expected": {"tool": "get_product", "arguments": {"product_id": 8}, "ui_guide": None},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 3 — compare_products
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_021", "lang": "en", "level": "simple", "intent": "compare",
        "user_query": "compare Roomba and Roborock on suction",
        "context": {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [4, 5], "currentProduct": 4},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 4, "product_id_2": 5, "focus": "suction"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_022", "lang": "en", "level": "simple", "intent": "compare",
        "user_query": "DJI Matrice vs Ring Always Home Cam on camera quality",
        "context": {"currentPage": "catalog", "selectedCategory": "Drone", "cart": [], "viewedProducts": [7, 8], "currentProduct": 7},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 8, "product_id_2": 7, "focus": "camera"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_023", "lang": "en", "level": "medium", "intent": "compare",
        "user_query": "what is the difference between Amazon Astro and Samsung Ballie in terms of price?",
        "context": {"currentPage": "catalog", "selectedCategory": "Kitchen", "cart": [], "viewedProducts": [1, 2], "currentProduct": 1},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 1, "product_id_2": 2, "focus": "price"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_024", "lang": "en", "level": "complex", "intent": "compare",
        "user_query": "help me choose between Miko 3 and Wonder Workshop Dash for my 8-year-old",
        "context": {"currentPage": "catalog", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [10, 11], "currentProduct": 10},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 10, "product_id_2": 11, "focus": "specs"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_025", "lang": "hi", "level": "simple", "intent": "compare",
        "user_query": "Roomba aur Roborock compare karo suction mein",
        "context": {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [4, 5], "currentProduct": 4},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 4, "product_id_2": 5, "focus": "suction"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_026", "lang": "hi", "level": "medium", "intent": "compare",
        "user_query": "Amazon Astro aur Samsung Ballie mein kya fark hai price mein",
        "context": {"currentPage": "catalog", "selectedCategory": "Kitchen", "cart": [], "viewedProducts": [1, 2], "currentProduct": 1},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 1, "product_id_2": 2, "focus": "price"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_027", "lang": "hi", "level": "medium", "intent": "compare",
        "user_query": "DJI Matrice aur Ring Cam camera pe compare karo",
        "context": {"currentPage": "catalog", "selectedCategory": "Drone", "cart": [], "viewedProducts": [7, 8], "currentProduct": 7},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 8, "product_id_2": 7, "focus": "camera"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_028", "lang": "te", "level": "simple", "intent": "compare",
        "user_query": "Roomba mariyu Roborock ni suction meeda compare cheyyi",
        "context": {"currentPage": "catalog", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [4, 5], "currentProduct": 4},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 4, "product_id_2": 5, "focus": "suction"}, "ui_guide": "compare_products"},
    },
    {
        "id": "B2_029", "lang": "te", "level": "medium", "intent": "compare",
        "user_query": "Miko 3 mariyu Wonder Workshop Dash ni safety meeda compare cheyyi",
        "context": {"currentPage": "catalog", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [10, 11], "currentProduct": 10},
        "expected": {"tool": "compare_products", "arguments": {"product_id_1": 10, "product_id_2": 11, "focus": "safety"}, "ui_guide": "compare_products"},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 4 — recommend
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_030", "lang": "en", "level": "simple", "intent": "recommend",
        "user_query": "what is the cheapest robot you have?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "most affordable robot", "budget": 200}, "ui_guide": None},
    },
    {
        "id": "B2_031", "lang": "en", "level": "simple", "intent": "recommend",
        "user_query": "recommend me a security drone under $500",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "home security patrol", "budget": 500, "category": "Drone"}, "ui_guide": "find_drone"},
    },
    {
        "id": "B2_032", "lang": "en", "level": "medium", "intent": "recommend",
        "user_query": "I want a kitchen robot under $1000",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "cooking assistance", "budget": 1000, "category": "Kitchen"}, "ui_guide": "find_kitchen"},
    },
    {
        "id": "B2_033", "lang": "en", "level": "medium", "intent": "recommend",
        "user_query": "best humanoid robot for classroom use",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "classroom learning", "budget": 1000, "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_034", "lang": "en", "level": "complex", "intent": "recommend",
        "user_query": "which robot should I buy for my 7 year old son who loves coding?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "kids coding practice", "budget": 500, "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_035", "lang": "hi", "level": "simple", "intent": "recommend",
        "user_query": "sasta drone dikhao",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "affordable drone", "budget": 500, "category": "Drone"}, "ui_guide": "find_drone"},
    },
    {
        "id": "B2_036", "lang": "hi", "level": "medium", "intent": "recommend",
        "user_query": "$500 ke andar vacuum robot suggest karo",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "daily floor cleaning", "budget": 500, "category": "Home Cleaner"}, "ui_guide": "find_home_cleaner"},
    },
    {
        "id": "B2_037", "lang": "hi", "level": "medium", "intent": "recommend",
        "user_query": "bacchon ke liye robot suggest karo",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "kids companion", "budget": 500, "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_038", "lang": "hi", "level": "complex", "intent": "recommend",
        "user_query": "best kitchen robot $1500 mein kaunsa le sakte hain?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "cooking assistance", "budget": 1500, "category": "Kitchen"}, "ui_guide": "find_kitchen"},
    },
    {
        "id": "B2_039", "lang": "te", "level": "simple", "intent": "recommend",
        "user_query": "pillalaki robot suggest cheyyi",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "kids companion", "budget": 500, "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },
    {
        "id": "B2_040", "lang": "te", "level": "medium", "intent": "recommend",
        "user_query": "$500 lopu vacuum robot kavali",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "daily floor cleaning", "budget": 500, "category": "Home Cleaner"}, "ui_guide": "find_home_cleaner"},
    },
    {
        "id": "B2_041", "lang": "te", "level": "medium", "intent": "recommend",
        "user_query": "cheapest humanoid robot cheppu",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "recommend", "arguments": {"need": "most affordable humanoid", "budget": 200, "category": "Humanoid"}, "ui_guide": "find_humanoid"},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 5 — add_to_cart
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_042", "lang": "en", "level": "simple", "intent": "add_to_cart",
        "user_query": "add Miko 3 to my cart",
        "context": {"currentPage": "product", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [10], "currentProduct": 10},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 10}, "ui_guide": None},
    },
    {
        "id": "B2_043", "lang": "en", "level": "simple", "intent": "add_to_cart",
        "user_query": "add LEGO Spike Prime to cart",
        "context": {"currentPage": "product", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [12], "currentProduct": 12},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 12}, "ui_guide": None},
    },
    {
        "id": "B2_044", "lang": "en", "level": "medium", "intent": "add_to_cart",
        "user_query": "I want to buy iRobot Roomba j9+",
        "context": {"currentPage": "product", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [4], "currentProduct": 4},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 4}, "ui_guide": None},
    },
    {
        "id": "B2_045", "lang": "en", "level": "complex", "intent": "add_to_cart",
        "user_query": "add the DJI drone to my cart",
        "context": {"currentPage": "product", "selectedCategory": "Drone", "cart": [], "viewedProducts": [8], "currentProduct": 8},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 8}, "ui_guide": None},
    },
    {
        "id": "B2_046", "lang": "hi", "level": "simple", "intent": "add_to_cart",
        "user_query": "Miko 3 cart mein add karo",
        "context": {"currentPage": "product", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [10], "currentProduct": 10},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 10}, "ui_guide": None},
    },
    {
        "id": "B2_047", "lang": "hi", "level": "simple", "intent": "add_to_cart",
        "user_query": "Enabot EBO X ko cart mein daal do",
        "context": {"currentPage": "product", "selectedCategory": "Kitchen", "cart": [], "viewedProducts": [3], "currentProduct": 3},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 3}, "ui_guide": None},
    },
    {
        "id": "B2_048", "lang": "te", "level": "simple", "intent": "add_to_cart",
        "user_query": "Roborock cart lo add cheyyi",
        "context": {"currentPage": "product", "selectedCategory": "Home Cleaner", "cart": [], "viewedProducts": [5], "currentProduct": 5},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 5}, "ui_guide": None},
    },
    {
        "id": "B2_049", "lang": "te", "level": "simple", "intent": "add_to_cart",
        "user_query": "LEGO Spike Prime cart lo pettu",
        "context": {"currentPage": "product", "selectedCategory": "Humanoid", "cart": [], "viewedProducts": [12], "currentProduct": 12},
        "expected": {"tool": "add_to_cart", "arguments": {"product_id": 12}, "ui_guide": None},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 6 — navigate_to (orders / support)
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_050", "lang": "en", "level": "simple", "intent": "nav_orders",
        "user_query": "where are my orders?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [4], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "check_orders"},
    },
    {
        "id": "B2_051", "lang": "en", "level": "simple", "intent": "nav_support",
        "user_query": "I need help with my robot, open support",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "open_support"},
    },
    {
        "id": "B2_052", "lang": "en", "level": "simple", "intent": "nav_new_ticket",
        "user_query": "I want to raise a ticket, my robot is broken",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "new_ticket"},
    },
    {
        "id": "B2_053", "lang": "en", "level": "simple", "intent": "nav_view_tickets",
        "user_query": "show me my previous tickets",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "view_tickets"},
    },
    {
        "id": "B2_054", "lang": "en", "level": "medium", "intent": "nav_new_ticket",
        "user_query": "file a complaint about my order",
        "context": {"currentPage": "orders", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "new_ticket"},
    },
    {
        "id": "B2_055", "lang": "hi", "level": "simple", "intent": "nav_orders",
        "user_query": "mera order kahan hai",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [5], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "check_orders"},
    },
    {
        "id": "B2_056", "lang": "hi", "level": "simple", "intent": "nav_support",
        "user_query": "mujhe support chahiye",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "open_support"},
    },
    {
        "id": "B2_057", "lang": "hi", "level": "simple", "intent": "nav_new_ticket",
        "user_query": "complaint file karni hai",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "new_ticket"},
    },
    {
        "id": "B2_058", "lang": "hi", "level": "simple", "intent": "nav_view_tickets",
        "user_query": "mere purane tickets dikhao",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "view_tickets"},
    },
    {
        "id": "B2_059", "lang": "hi", "level": "medium", "intent": "nav_new_ticket",
        "user_query": "robot kharaab hai, ticket banao",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "new_ticket"},
    },
    {
        "id": "B2_060", "lang": "te", "level": "simple", "intent": "nav_orders",
        "user_query": "naa order ekkada undi?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [3], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "check_orders"},
    },
    {
        "id": "B2_061", "lang": "te", "level": "simple", "intent": "nav_support",
        "user_query": "support kavali",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "open_support"},
    },
    {
        "id": "B2_062", "lang": "te", "level": "simple", "intent": "nav_new_ticket",
        "user_query": "robot pani cheyyatledu, ticket create cheyyi",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "new_ticket"},
    },
    {
        "id": "B2_063", "lang": "te", "level": "simple", "intent": "nav_view_tickets",
        "user_query": "naa tickets chupinchu",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "orders", "params": {}}, "ui_guide": "view_tickets"},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 7 — navigate_to (location / cart / home)
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_064", "lang": "en", "level": "simple", "intent": "nav_location",
        "user_query": "where is Aiper Surfer S1?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "drone", "product_id": 9}}, "ui_guide": "locate_path:drone:9"},
    },
    {
        "id": "B2_065", "lang": "en", "level": "medium", "intent": "nav_location",
        "user_query": "where can I find pool cleaning drones?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "drone", "product_id": 9}}, "ui_guide": "locate_path:drone:9"},
    },
    {
        "id": "B2_066", "lang": "en", "level": "simple", "intent": "nav_cart",
        "user_query": "go to cart",
        "context": {"currentPage": "product", "selectedCategory": "Drone", "cart": [7], "viewedProducts": [7], "currentProduct": 7},
        "expected": {"tool": "navigate_to", "arguments": {"page": "cart", "params": {}}, "ui_guide": "update_cart"},
    },
    {
        "id": "B2_067", "lang": "en", "level": "simple", "intent": "nav_home",
        "user_query": "take me home",
        "context": {"currentPage": "catalog", "selectedCategory": "Kitchen", "cart": [], "viewedProducts": [1], "currentProduct": 1},
        "expected": {"tool": "navigate_to", "arguments": {"page": "home", "params": {}}, "ui_guide": None},
    },
    {
        "id": "B2_068", "lang": "hi", "level": "simple", "intent": "nav_location",
        "user_query": "drone kahan milega?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "drone", "product_id": 7}}, "ui_guide": "locate_path:drone:7"},
    },
    {
        "id": "B2_069", "lang": "hi", "level": "medium", "intent": "nav_location",
        "user_query": "LEGO Spike Prime kahan milega?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "humanoid", "product_id": 12}}, "ui_guide": "locate_path:humanoid:12"},
    },
    {
        "id": "B2_070", "lang": "hi", "level": "simple", "intent": "nav_cart",
        "user_query": "mera cart dikhao",
        "context": {"currentPage": "product", "selectedCategory": "Kitchen", "cart": [2], "viewedProducts": [2], "currentProduct": 2},
        "expected": {"tool": "navigate_to", "arguments": {"page": "cart", "params": {}}, "ui_guide": "update_cart"},
    },
    {
        "id": "B2_071", "lang": "hi", "level": "simple", "intent": "nav_home",
        "user_query": "home page pe le chalo",
        "context": {"currentPage": "catalog", "selectedCategory": "Drone", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "home", "params": {}}, "ui_guide": None},
    },
    {
        "id": "B2_072", "lang": "te", "level": "simple", "intent": "nav_location",
        "user_query": "drone ekkada dorikutundi",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "drone", "product_id": 7}}, "ui_guide": "locate_path:drone:7"},
    },
    {
        "id": "B2_073", "lang": "te", "level": "medium", "intent": "nav_location",
        "user_query": "Wonder Workshop Dash ekkada undi?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "navigate_to", "arguments": {"page": "catalog", "params": {"category": "humanoid", "product_id": 11}}, "ui_guide": "locate_path:humanoid:11"},
    },
    {
        "id": "B2_074", "lang": "te", "level": "simple", "intent": "nav_cart",
        "user_query": "naa cart chupinchu",
        "context": {"currentPage": "product", "selectedCategory": "Humanoid", "cart": [10], "viewedProducts": [10], "currentProduct": 10},
        "expected": {"tool": "navigate_to", "arguments": {"page": "cart", "params": {}}, "ui_guide": "update_cart"},
    },

    # ══════════════════════════════════════════════════════════════════
    # SECTION 8 — Edge cases
    # ══════════════════════════════════════════════════════════════════

    {
        "id": "B2_075", "lang": "en", "level": "edge", "intent": "out_of_scope",
        "user_query": "what is the weather today?",
        "context": {"currentPage": "home", "selectedCategory": "", "cart": [], "viewedProducts": [], "currentProduct": None},
        "expected": {"tool": "search_products", "arguments": {"query": "robot", "category": None}, "ui_guide": None},
    },
]
