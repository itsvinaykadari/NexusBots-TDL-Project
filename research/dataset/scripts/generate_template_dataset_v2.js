#!/usr/bin/env node

/**
 * Nexus Bots — Semantically coherent dataset generator v2.
 *
 * Key fixes over v1:
 *  1. search_products query MATCHES user intent (not random "need" injection)
 *  2. compare_products only compares products in the SAME category
 *  3. recommend budget is realistic per category price range
 *  4. navigate_to params are logically coherent
 *  5. Full product catalog with prices/specs used for grounding
 *  6. Focus options are only used when relevant to the category
 *  7. Hindi/Telugu queries have semantically matching arguments
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schema = JSON.parse(
  fs.readFileSync(path.join(root, "tool_schemas.json"), "utf8")
);

// ── Rich product catalog (from actual database) ────────────────────────────
const PRODUCTS = [
  { id: 1, name: "Amazon Astro", category: "Kitchen", price: 1599.99, highlight: "Kitchen Voice Assistant", tags: ["kitchen", "assistant", "alexa"] },
  { id: 2, name: "Samsung Ballie", category: "Kitchen", price: 1299.99, highlight: "Kitchen Companion", tags: ["kitchen", "projector", "smart appliances"] },
  { id: 3, name: "Enabot EBO X", category: "Kitchen", price: 599.99, highlight: "Kitchen Monitoring", tags: ["kitchen", "camera", "monitoring"] },
  { id: 4, name: "iRobot Roomba j9+", category: "Home Cleaner", price: 799.99, highlight: "Smart Vacuum", tags: ["vacuum", "auto-empty", "mapping"] },
  { id: 5, name: "Roborock S8 MaxV Ultra", category: "Home Cleaner", price: 1799.99, highlight: "Vacuum + Mop Combo", tags: ["vacuum", "mop", "auto-dock"] },
  { id: 6, name: "Ecovacs WINBOT W2 Omni", category: "Home Cleaner", price: 499.99, highlight: "Window Cleaner", tags: ["window", "cleaning", "auto-spray"] },
  { id: 7, name: "Ring Always Home Cam", category: "Drone", price: 249.99, highlight: "Indoor Patrol Drone", tags: ["drone", "security", "indoor"] },
  { id: 8, name: "DJI Matrice 30T", category: "Drone", price: 13600.00, highlight: "Thermal Drone", tags: ["drone", "thermal", "enterprise"] },
  { id: 9, name: "Aiper Surfer S1", category: "Drone", price: 1399.99, highlight: "Pool Surface Drone", tags: ["drone", "pool", "autonomous"] },
  { id: 10, name: "Miko 3", category: "Humanoid", price: 249.99, highlight: "Kids Companion", tags: ["humanoid", "kids", "learning"] },
  { id: 11, name: "Wonder Workshop Dash", category: "Humanoid", price: 149.99, highlight: "Coding Robot", tags: ["humanoid", "coding", "education"] },
  { id: 12, name: "LEGO Education Spike Prime", category: "Humanoid", price: 395.95, highlight: "Classroom Robotics Kit", tags: ["humanoid", "LEGO", "python"] },
];

const categories = schema.categories;
const pages = schema.pages;

// Category-specific focus options (only meaningful ones)
const CATEGORY_FOCUS = {
  "Kitchen":      ["price", "battery", "camera", "safety", "specs", "warranty"],
  "Home Cleaner": ["price", "suction", "battery", "maintenance", "specs", "warranty"],
  "Drone":        ["price", "battery", "camera", "payload", "safety", "specs"],
  "Humanoid":     ["price", "battery", "safety", "specs", "warranty"],
};

// Category-specific needs (semantically relevant)
const CATEGORY_NEEDS = {
  "Kitchen":      ["cooking assistance", "kitchen monitoring", "recipe help", "hands-free control", "smart home management", "voice commands while cooking"],
  "Home Cleaner": ["daily floor cleaning", "pet hair removal", "deep mopping", "window cleaning", "hands-free vacuuming", "whole-home cleaning"],
  "Drone":        ["home security patrol", "aerial inspection", "pool cleaning", "thermal survey", "property monitoring", "indoor surveillance"],
  "Humanoid":     ["kids coding practice", "STEM education", "child entertainment", "classroom learning", "interactive play", "programming lessons"],
};

// Category-specific search intents (matches what user would actually search)
const CATEGORY_SEARCHES = {
  "Kitchen":      ["kitchen assistant robots", "smart kitchen robots", "cooking helper robot", "kitchen monitoring", "voice controlled kitchen robot", "kitchen companion"],
  "Home Cleaner": ["robot vacuum cleaner", "automatic floor cleaner", "mop robot", "window cleaning robot", "self-emptying vacuum", "pet hair vacuum"],
  "Drone":        ["indoor security drone", "home patrol drone", "pool cleaning drone", "enterprise inspection drone", "surveillance drone", "thermal camera drone"],
  "Humanoid":     ["kids coding robot", "STEM education robot", "interactive learning robot", "classroom robot kit", "programming robot for children", "educational companion robot"],
};

const byCategory = new Map();
for (const c of categories) byCategory.set(c, []);
for (const p of PRODUCTS) byCategory.get(p.category).push(p);

const functions = [
  "search_products",
  "get_product",
  "compare_products",
  "recommend",
  "add_to_cart",
  "navigate_to",
];

const cfg = {
  en: { beginner: 250, expert: 250 },
  hi: { beginner: 125, expert: 125 },
  te: { beginner: 125, expert: 125 },
};

// ── Seeded RNG ─────────────────────────────────────────────────────────────
function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = seeded(6420);
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function int(min, max) { return Math.floor(rnd() * (max - min + 1)) + min; }

function pickSameCategoryProduct(product) {
  const same = byCategory.get(product.category).filter((p) => p.id !== product.id);
  return pick(same);
}

function realisticBudget(category) {
  const prices = byCategory.get(category).map((p) => p.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  // Budget between min*0.8 and max*1.3, rounded to nice numbers
  const raw = int(Math.round(minPrice * 0.8), Math.round(maxPrice * 1.3));
  return Math.round(raw / 50) * 50; // round to nearest 50
}

function samplePageContext(cat, product1, product2) {
  const catProducts = byCategory.get(cat);
  return {
    current_page: pick(pages),
    active_category: cat,
    last_search: pick(CATEGORY_SEARCHES[cat]),
    viewed_products: [product1.id, product2 ? product2.id : pick(catProducts).id],
    cart_items: rnd() > 0.5 ? [pick(PRODUCTS).id] : [],
    visible_products: catProducts.map((p) => p.id),
  };
}

// ── Query generators (semantically coherent) ───────────────────────────────

function enQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page) {
  const t = {
    search_products: {
      beginner: [
        `Show me ${p1.category} robots`,
        `I want to see ${p1.category} robots`,
        `Can you list ${p1.category} options?`,
        `What ${p1.category} robots do you have?`,
        `Looking for ${searchQuery}`,
        `Find me ${searchQuery}`,
        `Search for ${searchQuery}`,
      ],
      expert: [
        `Search ${p1.category} category for available models`,
        `Query ${p1.category} inventory for high-rated units`,
        `Filter ${p1.category} robots by availability`,
        `List ${p1.category} products with specs`,
        `Show ${p1.category} segment with top-rated options`,
      ],
    },
    get_product: {
      beginner: [
        `Tell me about ${p1.name}`,
        `What is ${p1.name}?`,
        `Give me details of ${p1.name}`,
        `I want to know about ${p1.name}`,
        `Show me ${p1.name} info`,
      ],
      expert: [
        `Get complete specs for ${p1.name}`,
        `Retrieve technical profile of ${p1.name}`,
        `Show full product data for ${p1.name}`,
        `Pull up ${p1.name} specification sheet`,
        `Fetch ${p1.name} detailed metadata`,
      ],
    },
    compare_products: {
      beginner: [
        `Compare ${p1.name} and ${p2.name} on ${focus}`,
        `Which is better for ${focus}: ${p1.name} or ${p2.name}?`,
        `${p1.name} vs ${p2.name} on ${focus}`,
        `Help me choose between ${p1.name} and ${p2.name}`,
        `What's the difference between ${p1.name} and ${p2.name} in ${focus}?`,
      ],
      expert: [
        `Run side-by-side comparison: ${p1.name} vs ${p2.name} focusing on ${focus}`,
        `Contrast ${p1.name} and ${p2.name} on ${focus} trade-offs`,
        `Evaluate ${p1.name} against ${p2.name} on ${focus} metrics`,
        `${focus}-based comparison of ${p1.name} vs ${p2.name}`,
        `Compare ${focus} specs: ${p1.name} and ${p2.name}`,
      ],
    },
    recommend: {
      beginner: [
        `Recommend a ${p1.category} robot under $${budget} for ${need}`,
        `Best ${p1.category} option for ${need} within $${budget}?`,
        `Suggest a ${p1.category} robot for ${need}, budget $${budget}`,
        `What ${p1.category} robot should I get for ${need}? My budget is $${budget}`,
        `I need a ${p1.category} robot for ${need}, can spend up to $${budget}`,
      ],
      expert: [
        `Recommend ${p1.category} platform for ${need}, cap $${budget}`,
        `Best-fit ${p1.category} for ${need} under $${budget} ceiling`,
        `Suggest ${p1.category} units optimized for ${need}, max $${budget}`,
        `${p1.category} recommendation: ${need} use-case, $${budget} limit`,
        `Shortlist ${p1.category} options for ${need} within $${budget} range`,
      ],
    },
    add_to_cart: {
      beginner: [
        `Add ${p1.name} to my cart`,
        `Put ${p1.name} in cart`,
        `I want to buy ${p1.name}`,
        `Add ${p1.name} please`,
        `Cart ${p1.name}`,
      ],
      expert: [
        `Add ${p1.name} to checkout shortlist`,
        `Queue ${p1.name} in cart`,
        `Insert ${p1.name} into purchase cart`,
        `Stage ${p1.name} for purchase`,
      ],
    },
    navigate_to: {
      beginner: [
        `Take me to ${page}`,
        `Open ${page} page`,
        `Go to ${page}`,
        `Show me the ${page} section`,
        `I want to see ${page}`,
      ],
      expert: [
        `Navigate to ${page}`,
        `Route to ${page} page`,
        `Switch to ${page} view`,
        `Open ${page} with current context`,
      ],
    },
  };

  return pick(t[fn][prof]);
}

function hiQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page) {
  const t = {
    search_products: {
      beginner: [
        `Mujhe ${p1.category} robots dikhao`,
        `${p1.category} category ke robots list karo`,
        `${p1.category} mein kya options hain?`,
        `${p1.category} robots show karo`,
        `${searchQuery} dhundho`,
      ],
      expert: [
        `${p1.category} inventory filter karo, available models only`,
        `${p1.category} segment ka curated list do`,
        `${p1.category} category mein top-rated products search karo`,
        `${p1.category} products ka filtered list chahiye`,
      ],
    },
    get_product: {
      beginner: [
        `${p1.name} ke bare mein batao`,
        `${p1.name} ke details do`,
        `${p1.name} ka full info chahiye`,
        `${p1.name} kya hai?`,
        `${p1.name} dikhao`,
      ],
      expert: [
        `${p1.name} ka complete technical profile do`,
        `${p1.name} specification sheet fetch karo`,
        `${p1.name} ka detailed product data chahiye`,
        `${p1.name} ka full spec sheet nikaalo`,
      ],
    },
    compare_products: {
      beginner: [
        `${p1.name} aur ${p2.name} ko ${focus} pe compare karo`,
        `${focus} ke liye ${p1.name} ya ${p2.name} better hai?`,
        `${p1.name} vs ${p2.name} mein ${focus} kiska accha hai?`,
        `${p1.name} aur ${p2.name} mein kya fark hai ${focus} mein?`,
      ],
      expert: [
        `${p1.name} vs ${p2.name} ka ${focus} based comparison do`,
        `${focus} parameter pe ${p1.name} aur ${p2.name} contrast karo`,
        `${p1.name} aur ${p2.name} ka ${focus} evaluation chahiye`,
      ],
    },
    recommend: {
      beginner: [
        `${need} ke liye $${budget} mein ${p1.category} robot suggest karo`,
        `$${budget} budget mein ${p1.category} option chahiye for ${need}`,
        `${need} ke liye kaunsa ${p1.category} robot lun? Budget $${budget}`,
        `${p1.category} robot chahiye ${need} ke liye, budget $${budget}`,
      ],
      expert: [
        `${need} use-case ke liye ${p1.category} recommend karo, max $${budget}`,
        `$${budget} cap mein best-fit ${p1.category} suggest karo for ${need}`,
        `${need} requirement ke liye ${p1.category} shortlist do under $${budget}`,
      ],
    },
    add_to_cart: {
      beginner: [
        `${p1.name} cart mein add karo`,
        `Mere cart mein ${p1.name} daal do`,
        `${p1.name} kharidna hai, cart mein dalo`,
        `${p1.name} add karo cart mein`,
      ],
      expert: [
        `${p1.name} ko cart shortlist mein add karo`,
        `${p1.name} cart queue mein daalo`,
        `${p1.name} purchase cart mein insert karo`,
      ],
    },
    navigate_to: {
      beginner: [
        `Mujhe ${page} page pe le chalo`,
        `${page} open karo`,
        `${page} section pe jana hai`,
        `${page} dikhao`,
      ],
      expert: [
        `${page} route pe navigate karo`,
        `${page} page par switch karo`,
        `${page} view open karo`,
      ],
    },
  };

  return pick(t[fn][prof]);
}

function teQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page) {
  const t = {
    search_products: {
      beginner: [
        `${p1.category} robots chupinchandi`,
        `Naaku ${p1.category} robots kavali`,
        `${p1.category} options chupinchu`,
        `${p1.category} lo emunnayi?`,
        `${searchQuery} search cheyyi`,
      ],
      expert: [
        `${p1.category} lo available models search cheyyi`,
        `${p1.category} inventory ni filter cheyyi`,
        `${p1.category} category curated list ivvu`,
        `${p1.category} products filtered ga chupinchu`,
      ],
    },
    get_product: {
      beginner: [
        `${p1.name} gurinchi cheppu`,
        `${p1.name} details ivvu`,
        `${p1.name} full info kavali`,
        `${p1.name} enti?`,
        `${p1.name} chupinchu`,
      ],
      expert: [
        `${p1.name} complete technical profile fetch cheyyi`,
        `${p1.name} specification sheet ivvu`,
        `${p1.name} detailed product data kavali`,
        `${p1.name} full spec sheet ivvu`,
      ],
    },
    compare_products: {
      beginner: [
        `${p1.name} mariyu ${p2.name} ni ${focus} meeda compare cheyyi`,
        `${focus} lo ${p1.name} leda ${p2.name} manchidi?`,
        `${p1.name} vs ${p2.name} lo ${focus} yedi better?`,
        `${p1.name} mariyu ${p2.name} madya ${focus} lo teda enti?`,
      ],
      expert: [
        `${p1.name} vs ${p2.name} ni ${focus} meeda detailed compare cheyyi`,
        `${focus} parameter meeda ${p1.name} mariyu ${p2.name} evaluate cheyyi`,
        `${focus} basis lo ${p1.name} and ${p2.name} contrast cheyyi`,
      ],
    },
    recommend: {
      beginner: [
        `${need} kosam $${budget} lopu ${p1.category} recommend cheyyi`,
        `$${budget} budget lo ${p1.category} option suggest cheyyi for ${need}`,
        `${need} ki tagina ${p1.category} robot kavali, budget $${budget}`,
        `${p1.category} robot kavali ${need} kosam, $${budget} limit lo`,
      ],
      expert: [
        `${need} use-case kosam ${p1.category} recommend cheyyi, cap $${budget}`,
        `$${budget} limit lo best-fit ${p1.category} suggest cheyyi for ${need}`,
        `${need} requirement ki ${p1.category} shortlist ivvu under $${budget}`,
      ],
    },
    add_to_cart: {
      beginner: [
        `${p1.name} cart lo add cheyyi`,
        `${p1.name} na cart lo pettu`,
        `${p1.name} konali, cart lo add cheyyi`,
        `${p1.name} add cheyyi cart lo`,
      ],
      expert: [
        `${p1.name} ni cart shortlist lo add cheyyi`,
        `${p1.name} ni purchase cart lo insert cheyyi`,
        `${p1.name} cart queue lo pettu`,
      ],
    },
    navigate_to: {
      beginner: [
        `${page} page ki teesukellu`,
        `${page} open cheyyi`,
        `${page} section ki vellali`,
        `${page} chupinchu`,
      ],
      expert: [
        `${page} ki navigate cheyyi`,
        `${page} page ki switch cheyyi`,
        `${page} view open cheyyi`,
      ],
    },
  };

  return pick(t[fn][prof]);
}

function makeQuery(lang, fn, prof, p1, p2, focus, budget, need, searchQuery, page) {
  if (lang === "en") return enQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page);
  if (lang === "hi") return hiQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page);
  return teQuery(fn, prof, p1, p2, focus, budget, need, searchQuery, page);
}

// ── Argument builder (semantically coherent) ────────────────────────────────

function argsFor(fn, p1, p2, cat, focus, budget, need, searchQuery, page) {
  switch (fn) {
    case "search_products":
      // Query MATCHES what user is looking for (category-relevant search)
      return { query: searchQuery, category: cat };

    case "get_product":
      return { product_id: p1.id };

    case "compare_products":
      // p2 is ALWAYS same category as p1
      return { product_id_1: p1.id, product_id_2: p2.id, focus };

    case "recommend":
      return { need, budget, category: cat };

    case "add_to_cart":
      return { product_id: p1.id };

    case "navigate_to": {
      const params = {};
      // Only add relevant params
      if (page === "catalog" && rnd() > 0.3) params.category = cat;
      if (page === "product") params.product_id = p1.id;
      return { page, params };
    }

    default:
      throw new Error(`Unsupported function: ${fn}`);
  }
}

// ── Main build ──────────────────────────────────────────────────────────────

function buildExamples() {
  const rows = [];
  let idNum = 1;

  for (const [lang, split] of Object.entries(cfg)) {
    for (const [proficiency, target] of Object.entries(split)) {
      for (let i = 0; i < target; i++) {
        const fn = functions[i % functions.length];
        const cat = pick(categories);
        const catProducts = byCategory.get(cat);
        const p1 = pick(catProducts);

        // compare_products: ALWAYS same category
        const p2 = fn === "compare_products"
          ? pickSameCategoryProduct(p1)
          : pick(catProducts.filter((p) => p.id !== p1.id));

        // Category-relevant focus
        const focus = pick(CATEGORY_FOCUS[cat]);
        // Realistic budget for the category
        const budget = realisticBudget(cat);
        // Category-relevant need
        const need = pick(CATEGORY_NEEDS[cat]);
        // Category-relevant search query
        const searchQuery = pick(CATEGORY_SEARCHES[cat]);
        const page = pick(pages);

        const userQuery = makeQuery(lang, fn, proficiency, p1, p2, focus, budget, need, searchQuery, page);
        const fcArgs = argsFor(fn, p1, p2, cat, focus, budget, need, searchQuery, page);
        const context = samplePageContext(cat, p1, p2);

        rows.push({
          id: `fc_${String(idNum).padStart(4, "0")}`,
          language: lang,
          proficiency,
          user_query: userQuery,
          page_context: context,
          function_call: { name: fn, arguments: fcArgs },
          metadata: { source: "template_generator_v2", split: "train" },
        });

        idNum += 1;
      }
    }
  }

  return rows;
}

function main() {
  const rows = buildExamples();

  // Write raw v2
  const outPath = path.join(root, "raw", "function_calls_raw_v2.jsonl");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8"
  );

  // Validate: check semantic coherence
  let issues = 0;
  for (const r of rows) {
    const fn = r.function_call.name;
    const args = r.function_call.arguments;

    // compare_products: both IDs must be same category
    if (fn === "compare_products") {
      const p1 = PRODUCTS.find((p) => p.id === args.product_id_1);
      const p2 = PRODUCTS.find((p) => p.id === args.product_id_2);
      if (p1.category !== p2.category) {
        console.error(`ISSUE ${r.id}: cross-category compare ${p1.name}(${p1.category}) vs ${p2.name}(${p2.category})`);
        issues++;
      }
    }

    // search_products: query should be category-relevant
    if (fn === "search_products") {
      const catSearches = CATEGORY_SEARCHES[args.category] || [];
      if (!catSearches.includes(args.query)) {
        // Check if at least category name is in query
        if (!args.query.toLowerCase().includes(args.category.toLowerCase())) {
          console.error(`ISSUE ${r.id}: search query "${args.query}" not relevant to ${args.category}`);
          issues++;
        }
      }
    }

    // recommend: budget should be within realistic range for category
    if (fn === "recommend") {
      const prices = byCategory.get(args.category).map((p) => p.price);
      const minPrice = Math.min(...prices);
      if (args.budget < minPrice * 0.3) {
        console.error(`ISSUE ${r.id}: budget ${args.budget} too low for ${args.category} (min price ${minPrice})`);
        issues++;
      }
    }
  }

  const stats = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      acc.language[r.language] = (acc.language[r.language] || 0) + 1;
      acc.proficiency[r.proficiency] = (acc.proficiency[r.proficiency] || 0) + 1;
      acc.functions[r.function_call.name] = (acc.functions[r.function_call.name] || 0) + 1;
      return acc;
    },
    { total: 0, language: {}, proficiency: {}, functions: {} }
  );

  console.log(JSON.stringify({ outPath, stats, issues }, null, 2));
}

main();
