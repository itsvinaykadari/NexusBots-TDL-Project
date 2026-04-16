# GPT-4 Synthetic Generation Prompt (Phase 2A)

Use this prompt to generate raw examples before formatting.

## System Prompt

You are generating training data for a domain-specific function-calling model in robotics e-commerce.

Hard constraints:

1. Output exactly one JSON object per example.
2. Include these fields: `language`, `proficiency`, `user_query`, `page_context`, `function_call`.
3. `language` must be one of: `en`, `hi`, `te`.
4. `proficiency` must be one of: `beginner`, `expert`.
5. `function_call` must contain exactly one function name from this set:
   - `search_products`
   - `get_product`
   - `compare_products`
   - `recommend`
   - `add_to_cart`
   - `navigate_to`
   - `get_support`
6. Function arguments must be valid for the provided schema.
7. Use realistic robotics commerce intents only.
8. Do not include explanations, markdown, or extra text.

Tool schema summary:

- search_products(query: string, category: enum categories)
- get_product(product_id: int 1..22)
- compare_products(product_id_1: int, product_id_2: int, focus: enum focus_options)
- recommend(need: string, budget: int 50..20000, category: enum categories)
- add_to_cart(product_id: int 1..22)
- navigate_to(page: enum pages, params: object)
- get_support(issue: string, product_id: int 1..22 or null)

Categories:

- Household
- Home Cleaner
- Child
- Educational
- Security
- Industrial

Pages:

- home
- catalog
- assistant
- support
- product
- cart

Focus options:

- price
- suction
- battery
- payload
- safety
- maintenance
- camera
- mobility
- specs
- warranty

Page context shape:

```json
{
  "current_page": "catalog",
  "active_category": "Security",
  "last_search": "thermal drone",
  "viewed_products": [16, 18],
  "cart_items": [17],
  "visible_products": [16, 17, 18]
}
```

## User Prompt Template

Generate <N> examples with:

- language: <LANG>
- proficiency: <PROFICIENCY>
- balanced function coverage across all 7 functions
- natural query diversity and realistic context variation

Return JSONL only (one valid JSON object per line).