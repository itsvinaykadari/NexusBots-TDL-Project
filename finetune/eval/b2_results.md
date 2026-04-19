# B2 Base-Model Evaluation Report

Model: `Qwen/Qwen3-0.6B`  |  Prompts: 75

## Accuracy Summary

| Metric | Score |
|--------|-------|
| Tool accuracy   | 68.0% |
| Args accuracy   | 49.3% |
| Guide accuracy  | 30.7% |
| **Full match**  | **16.0%** |
| Parse rate      | 86.7% |

## By Language

| Lang | Total | Tool OK | Full Match |
|------|-------|---------|------------|
| en | 32 | 21 (66%) | 5 (16%) |
| hi | 24 | 17 (71%) | 5 (21%) |
| te | 19 | 13 (68%) | 2 (11%) |

## By Tool

| Tool | Total | Tool OK | Full Match |
|------|-------|---------|------------|
| add_to_cart | 8 | 6 (75%) | 0 (0%) |
| compare_products | 9 | 8 (89%) | 5 (56%) |
| get_product | 10 | 6 (60%) | 0 (0%) |
| navigate_to | 25 | 15 (60%) | 0 (0%) |
| recommend | 12 | 8 (67%) | 1 (8%) |
| search_products | 11 | 8 (73%) | 6 (55%) |

## All Failures (63 / 75)

| ID | Lang | Level | Query | Expected Tool | Got Tool | Expected Guide | Got Guide | Issues |
|----|------|-------|-------|---------------|----------|----------------|-----------|--------|
| B2_001 | en | simple | show me all kitchen robots | search_products | search_products | find_kitchen | find_kitchen | args |
| B2_004 | en | medium | I want a robot for kids, what do you have? | search_products | recommend | find_humanoid | find_humanoid | tool |
| B2_007 | hi | simple | humanoid robots list karo | search_products | navigate_to | find_humanoid | None | tool, args, guide |
| B2_009 | te | simple | drone robots chupinchandi | search_products | navigate_to | find_drone | None | tool, args, guide |
| B2_011 | en | simple | tell me about DJI Matrice 30T | get_product | search_products | None | find_drone | tool, args, guide |
| B2_012 | en | simple | what is Miko 3? | get_product | get_product | None | find_humanoid | guide |
| B2_013 | en | medium | give me the full specs of Roborock S8 MaxV Ul | get_product | get_product | None | compare_products | guide |
| B2_014 | en | complex | what is the specification of this robot | get_product | get_product | None | find_drone | args, guide |
| B2_015 | hi | simple | DJI Matrice 30T ke baare mein batao | get_product | search_products | None | find_drone | tool, args, guide |
| B2_016 | hi | simple | Samsung Ballie ke details do | get_product | get_product | None | find_drone | guide |
| B2_017 | hi | medium | Wonder Workshop Dash ke baare mein batao | get_product | navigate_to | None | None | tool, args |
| B2_018 | te | simple | Miko 3 gurinchi cheppu | get_product | get_product | None | find_humanoid | guide |
| B2_019 | te | simple | Amazon Astro details ivvu | get_product | get_product | None | find_kitchen | guide |
| B2_020 | te | medium | DJI Matrice 30T gurinchi cheppu | get_product | search_products | None | find_drone | tool, args, guide |
| B2_022 | en | simple | DJI Matrice vs Ring Always Home Cam on camera | compare_products | compare_products | compare_products | compare_products | args |
| B2_024 | en | complex | help me choose between Miko 3 and Wonder Work | compare_products | recommend | compare_products | compare_products | tool, args |
| B2_027 | hi | medium | DJI Matrice aur Ring Cam camera pe compare ka | compare_products | compare_products | compare_products | compare_products | args |
| B2_029 | te | medium | Miko 3 mariyu Wonder Workshop Dash ni safety  | compare_products | compare_products | compare_products | compare_products | args |
| B2_030 | en | simple | what is the cheapest robot you have? | recommend | search_products | None | find_drone | tool, args, guide |
| B2_031 | en | simple | recommend me a security drone under $500 | recommend | recommend | find_drone | None | guide |
| B2_032 | en | medium | I want a kitchen robot under $1000 | recommend | search_products | find_kitchen | find_kitchen | tool, args |
| B2_033 | en | medium | best humanoid robot for classroom use | recommend | recommend | find_humanoid | compare_products | args, guide |
| B2_034 | en | complex | which robot should I buy for my 7 year old so | recommend | recommend | find_humanoid | None | args, guide |
| B2_035 | hi | simple | sasta drone dikhao | recommend | navigate_to | find_drone | None | tool, args, guide |
| B2_036 | hi | medium | $500 ke andar vacuum robot suggest karo | recommend | recommend | find_home_cleaner | compare_products | args, guide |
| B2_037 | hi | medium | bacchon ke liye robot suggest karo | recommend | recommend | find_humanoid | compare_products | args, guide |
| B2_039 | te | simple | pillalaki robot suggest cheyyi | recommend | recommend | find_humanoid | compare_products | args, guide |
| B2_040 | te | medium | $500 lopu vacuum robot kavali | recommend | search_products | find_home_cleaner | find_humanoid | tool, args, guide |
| B2_041 | te | medium | cheapest humanoid robot cheppu | recommend | recommend | find_humanoid | None | args, guide |
| B2_042 | en | simple | add Miko 3 to my cart | add_to_cart | add_to_cart | None | update_cart | guide |
| B2_043 | en | simple | add LEGO Spike Prime to cart | add_to_cart | add_to_cart | None | update_cart | guide |
| B2_044 | en | medium | I want to buy iRobot Roomba j9+ | add_to_cart | get_product | None | find_home_cleaner | tool, guide |
| B2_045 | en | complex | add the DJI drone to my cart | add_to_cart | add_to_cart | None | update_cart | args, guide |
| B2_046 | hi | simple | Miko 3 cart mein add karo | add_to_cart | add_to_cart | None | update_cart | guide |
| B2_047 | hi | simple | Enabot EBO X ko cart mein daal do | add_to_cart | add_to_cart | None | update_cart | guide |
| B2_048 | te | simple | Roborock cart lo add cheyyi | add_to_cart | add_to_cart | None | update_cart | guide |
| B2_049 | te | simple | LEGO Spike Prime cart lo pettu | add_to_cart | navigate_to | None | None | tool, args |
| B2_050 | en | simple | where are my orders? | navigate_to | NONE | check_orders | None | tool, args, guide, parse |
| B2_051 | en | simple | I need help with my robot, open support | navigate_to | NONE | open_support | None | tool, args, guide, parse |
| B2_052 | en | simple | I want to raise a ticket, my robot is broken | navigate_to | NONE | new_ticket | None | tool, args, guide, parse |
| B2_053 | en | simple | show me my previous tickets | navigate_to | NONE | view_tickets | None | tool, args, guide, parse |
| B2_054 | en | medium | file a complaint about my order | navigate_to | NONE | new_ticket | None | tool, args, guide, parse |
| B2_055 | hi | simple | mera order kahan hai | navigate_to | navigate_to | check_orders | None | args, guide |
| B2_056 | hi | simple | mujhe support chahiye | navigate_to | NONE | open_support | None | tool, args, guide, parse |
| B2_057 | hi | simple | complaint file karni hai | navigate_to | NONE | new_ticket | None | tool, args, guide, parse |
| B2_058 | hi | simple | mere purane tickets dikhao | navigate_to | NONE | view_tickets | None | tool, args, guide, parse |
| B2_059 | hi | medium | robot kharaab hai, ticket banao | navigate_to | navigate_to | new_ticket | None | guide |
| B2_060 | te | simple | naa order ekkada undi? | navigate_to | navigate_to | check_orders | None | guide |
| B2_061 | te | simple | support kavali | navigate_to | NONE | open_support | None | tool, args, guide, parse |
| B2_062 | te | simple | robot pani cheyyatledu, ticket create cheyyi | navigate_to | navigate_to | new_ticket | None | guide |
| B2_063 | te | simple | naa tickets chupinchu | navigate_to | NONE | view_tickets | None | tool, args, guide, parse |
| B2_064 | en | simple | where is Aiper Surfer S1? | navigate_to | navigate_to | locate_path:drone:9 | None | guide |
| B2_065 | en | medium | where can I find pool cleaning drones? | navigate_to | navigate_to | locate_path:drone:9 | None | guide |
| B2_066 | en | simple | go to cart | navigate_to | navigate_to | update_cart | None | guide |
| B2_067 | en | simple | take me home | navigate_to | navigate_to | None | None | args |
| B2_068 | hi | simple | drone kahan milega? | navigate_to | navigate_to | locate_path:drone:7 | None | guide |
| B2_069 | hi | medium | LEGO Spike Prime kahan milega? | navigate_to | navigate_to | locate_path:humanoid:12 | None | args, guide |
| B2_070 | hi | simple | mera cart dikhao | navigate_to | navigate_to | update_cart | None | guide |
| B2_071 | hi | simple | home page pe le chalo | navigate_to | navigate_to | None | None | args |
| B2_072 | te | simple | drone ekkada dorikutundi | navigate_to | navigate_to | locate_path:drone:7 | None | guide |
| B2_073 | te | medium | Wonder Workshop Dash ekkada undi? | navigate_to | navigate_to | locate_path:humanoid:11 | None | guide |
| B2_074 | te | simple | naa cart chupinchu | navigate_to | navigate_to | update_cart | None | guide |
| B2_075 | en | edge | what is the weather today? | search_products | search_products | None | find_drone | guide |

## Shortcomings Analysis

**Total failures: 63 / 75 (84%)**

- Wrong tool: 24 (32%)
- Correct tool, wrong args: 16 (21%)
- Correct tool+args, wrong guide: 23 (31%)
- Parse failures: 10 (13%)

**Failures by language:** {'en': 27, 'hi': 19, 'te': 17}

**Failures by intent:** {'browse_category': 4, 'get_product': 10, 'compare': 4, 'recommend': 11, 'add_to_cart': 8, 'nav_orders': 3, 'nav_support': 3, 'nav_new_ticket': 5, 'nav_view_tickets': 3, 'nav_location': 6, 'nav_cart': 3, 'nav_home': 2, 'out_of_scope': 1}

**Most common wrong-tool mappings:**
- `navigate_to → NONE` × 10
- `get_product → search_products` × 3
- `recommend → search_products` × 3
- `search_products → navigate_to` × 2
- `search_products → recommend` × 1
- `get_product → navigate_to` × 1
- `compare_products → recommend` × 1
- `recommend → navigate_to` × 1
- `add_to_cart → get_product` × 1
- `add_to_cart → navigate_to` × 1

**Dataset recommendations:**
- HIGH PRIORITY: Model confuses tools frequently. Add more contrastive examples — same intent, different tools (e.g., 'add X to cart' vs 'show me cart').
- add_to_cart: Model confuses with navigate_to or search_products. Add 20+ explicit add_to_cart examples per language.
- recommend: Model routes cheapest/budget queries to search_products. Add budget-keyword → recommend examples.
- Multilingual: HI/TE romanized routing errors detected. Increase HI/TE share to 35%+ in training data.
- Support navigation: Model routes support/ticket queries to search_products. Add dedicated navigate_to(orders)+ui_guide examples for all 4 sub-intents.
- Order tracking: 'mera order / naa order / where are my orders' should all → navigate_to(orders)+check_orders. Ensure romanized patterns in training data.
- ui_guide accuracy is low. Add explicit guide-label examples in system prompt training and increase variety of guide-mapped queries.
- CRITICAL: Model produces non-JSON output. Ensure training data uses exact JSON assistant messages with no <think> preamble.