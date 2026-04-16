#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "tool_schemas.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "product_catalog.json"), "utf8"));

const outPath = path.join(root, "raw", "function_calls_raw_v1.jsonl");

const cfg = {
    en: { beginner: 250, expert: 250 },
    hi: { beginner: 125, expert: 125 },
    te: { beginner: 125, expert: 125 }
};

const categories = schema.categories;
const pages = schema.pages;
const focuses = schema.focus_options;
const functions = [
    "search_products",
    "get_product",
    "compare_products",
    "recommend",
    "add_to_cart",
    "navigate_to",
    "get_support"
];

const byCategory = new Map();
for (const c of categories) byCategory.set(c, []);
for (const p of catalog) byCategory.get(p.category).push(p);

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

function pick(arr) {
    return arr[Math.floor(rnd() * arr.length)];
}

function pickDifferentProduct(id) {
    let candidate = pick(catalog);
    while (candidate.id === id) {
        candidate = pick(catalog);
    }
    return candidate;
}

function int(min, max) {
    return Math.floor(rnd() * (max - min + 1)) + min;
}

function samplePageContext(cat, viewedA, viewedB) {
    const currentPage = pick(pages);
    return {
        current_page: currentPage,
        active_category: cat,
        last_search: pick([
            "best value robot",
            "battery backup",
            "safety features",
            "industrial payload",
            "home cleaning robot",
            "kids coding robot"
        ]),
        viewed_products: [viewedA.id, viewedB.id],
        cart_items: [pick(catalog).id],
        visible_products: byCategory.get(cat).slice(0, 3).map((p) => p.id)
    };
}

function enQuery(fn, prof, c1, c2, focus, budget, need, page) {
    const beginner = {
        search_products: [
            `Show me ${c1} robots`,
            `I want to see robots in ${c1}`,
            `Can you list ${c1} options?`
        ],
        get_product: [
            `Tell me about ${c1.name}`,
            `What is ${c1.name} like?`,
            `Give details of ${c1.name}`
        ],
        compare_products: [
            `Compare ${c1.name} and ${c2.name} for ${focus}`,
            `Which is better in ${focus}: ${c1.name} or ${c2.name}?`,
            `${c1.name} vs ${c2.name} on ${focus}`
        ],
        recommend: [
            `Recommend a ${c1.category} robot under ${budget} dollars for ${need}`,
            `Best ${c1.category} option for ${need} within ${budget}?`,
            `Suggest ${c1.category} robots under ${budget} for ${need}`
        ],
        add_to_cart: [
            `Add ${c1.name} to my cart`,
            `Put ${c1.name} in cart`,
            `I want to buy ${c1.name}, add it`
        ],
        navigate_to: [
            `Take me to ${page} page`,
            `Open ${page} section`,
            `Go to ${page}`
        ],
        get_support: [
            `I need support for ${c1.name}, issue is ${need}`,
            `${c1.name} has problem: ${need}. Help`,
            `Please assist, ${c1.name} has ${need}`
        ]
    };

    const expert = {
        search_products: [
            `Fetch ${c1} robots with strong specs and practical deployments`,
            `Search ${c1} inventory emphasizing reliability and maintenance profile`,
            `Query ${c1} category for currently available models`
        ],
        get_product: [
            `Retrieve complete specification sheet for ${c1.name}`,
            `Get technical details and operating profile for ${c1.name}`,
            `Open full product metadata for ${c1.name}`
        ],
        compare_products: [
            `Run side-by-side comparison: ${c1.name} vs ${c2.name}, focus ${focus}`,
            `Contrast ${c1.name} and ${c2.name} on ${focus} and trade-offs`,
            `Compare ${c1.name} with ${c2.name} by ${focus}`
        ],
        recommend: [
            `Recommend a ${c1.category} platform for ${need} with cap ${budget} USD`,
            `Need ${c1.category} recommendation for ${need}; budget ceiling ${budget}`,
            `Suggest best-fit ${c1.category} units for ${need} under ${budget}`
        ],
        add_to_cart: [
            `Add ${c1.name} to cart for checkout shortlist`,
            `Queue ${c1.name} in cart now`,
            `Insert ${c1.name} into cart`
        ],
        navigate_to: [
            `Navigate to ${page} with relevant filters`,
            `Route me to ${page} page`,
            `Switch context to ${page}`
        ],
        get_support: [
            `Open support ticket for ${c1.name}, issue: ${need}`,
            `Create support flow for ${c1.name} due to ${need}`,
            `Need troubleshooting for ${c1.name}; symptom is ${need}`
        ]
    };

    return pick((prof === "beginner" ? beginner : expert)[fn]);
}

function hiQuery(fn, prof, c1, c2, focus, budget, need, page) {
    const beginner = {
        search_products: [
            `Mujhe ${c1} category ke robots dikhao`,
            `${c1} robots show karo`,
            `${c1} mein options batao`
        ],
        get_product: [
            `${c1.name} ke details do`,
            `${c1.name} ke bare mein batao`,
            `${c1.name} ka full info chahiye`
        ],
        compare_products: [
            `${c1.name} aur ${c2.name} ko ${focus} pe compare karo`,
            `${focus} ke liye ${c1.name} vs ${c2.name}`,
            `Kaunsa better hai ${focus} mein: ${c1.name} ya ${c2.name}`
        ],
        recommend: [
            `${need} ke liye ${budget} ke andar ${c1.category} recommend karo`,
            `${budget} budget mein ${c1.category} option suggest karo`,
            `${need} use-case ke liye ${c1.category} robot chahiye under ${budget}`
        ],
        add_to_cart: [
            `${c1.name} cart mein add karo`,
            `Mere cart mein ${c1.name} daal do`,
            `${c1.name} buy karna hai, cart mein dalo`
        ],
        navigate_to: [
            `Mujhe ${page} page pe le chalo`,
            `${page} open karo`,
            `${page} section pe jana hai`
        ],
        get_support: [
            `${c1.name} mein ${need} issue hai, support chahiye`,
            `${c1.name} problem ${need}, help karo`,
            `Support do, ${c1.name} mein ${need}`
        ]
    };

    const expert = {
        search_products: [
            `${c1} inventory filter karo with reliable models`,
            `${c1} segment ka focused search run karo`,
            `${c1} products ka curated list do`
        ],
        get_product: [
            `${c1.name} ka complete technical profile nikaalo`,
            `${c1.name} specification sheet fetch karo`,
            `${c1.name} ka detailed product data do`
        ],
        compare_products: [
            `${c1.name} vs ${c2.name} detailed compare on ${focus}`,
            `${focus} parameter pe ${c1.name} aur ${c2.name} contrast karo`,
            `${c1.name} aur ${c2.name} ka ${focus} based evaluation chahiye`
        ],
        recommend: [
            `${need} use-case ke liye ${c1.category} recommend karo, max ${budget}`,
            `${budget} cap mein best-fit ${c1.category} suggest karo for ${need}`,
            `${need} requirement ke liye ${c1.category} shortlist do under ${budget}`
        ],
        add_to_cart: [
            `${c1.name} ko cart shortlist mein add karo`,
            `${c1.name} cart queue mein daalo`,
            `${c1.name} ko purchase cart mein insert karo`
        ],
        navigate_to: [
            `${page} route pe navigate karo`,
            `Context ${page} page par switch karo`,
            `${page} view par le jao`
        ],
        get_support: [
            `${c1.name} ke liye support ticket kholo, issue ${need}`,
            `${c1.name} troubleshooting chahiye for ${need}`,
            `${need} issue ke sath ${c1.name} support workflow start karo`
        ]
    };

    return pick((prof === "beginner" ? beginner : expert)[fn]);
}

function teQuery(fn, prof, c1, c2, focus, budget, need, page) {
    const beginner = {
        search_products: [
            `${c1} category lo robots chupinchu`,
            `Naaku ${c1} robots kavali, list ivvu`,
            `${c1} options show cheyyi`
        ],
        get_product: [
            `${c1.name} details cheppu`,
            `${c1.name} gurinchi information ivvu`,
            `${c1.name} full details kavali`
        ],
        compare_products: [
            `${c1.name} mariyu ${c2.name} ni ${focus} meeda compare cheyyi`,
            `${focus} kosam ${c1.name} vs ${c2.name}`,
            `${focus} lo yedi better: ${c1.name} leda ${c2.name}`
        ],
        recommend: [
            `${need} kosam ${budget} lopu ${c1.category} recommend cheyyi`,
            `${budget} budget lo ${c1.category} option suggest cheyyi`,
            `${need} ki tagina ${c1.category} robot under ${budget}`
        ],
        add_to_cart: [
            `${c1.name} cart lo add cheyyi`,
            `${c1.name} na cart lo pettu`,
            `${c1.name} konali, cart lo add cheyyi`
        ],
        navigate_to: [
            `${page} page ki teesukellu`,
            `${page} open cheyyi`,
            `${page} section ki vellali`
        ],
        get_support: [
            `${c1.name} lo ${need} issue undi, support kavali`,
            `${c1.name} problem ${need}, help ivvu`,
            `Support kavali, ${c1.name} ki ${need}`
        ]
    };

    const expert = {
        search_products: [
            `${c1} segment lo robust models search cheyyi`,
            `${c1} inventory ni focused ga filter cheyyi`,
            `${c1} category curated product list ivvu`
        ],
        get_product: [
            `${c1.name} complete technical profile fetch cheyyi`,
            `${c1.name} specification sheet ivvu`,
            `${c1.name} detailed product metadata kavali`
        ],
        compare_products: [
            `${c1.name} vs ${c2.name} ni ${focus} meeda detailed compare cheyyi`,
            `${focus} parameter meeda ${c1.name} mariyu ${c2.name} contrast cheyyi`,
            `${focus} basis lo ${c1.name} and ${c2.name} evaluate cheyyi`
        ],
        recommend: [
            `${need} use-case kosam ${c1.category} recommend cheyyi, cap ${budget}`,
            `${budget} limit lo best-fit ${c1.category} suggest cheyyi for ${need}`,
            `${need} requirement ki ${c1.category} shortlist ivvu under ${budget}`
        ],
        add_to_cart: [
            `${c1.name} ni cart shortlist lo add cheyyi`,
            `${c1.name} ni cart queue lo pettu`,
            `${c1.name} item ni cart lo insert cheyyi`
        ],
        navigate_to: [
            `${page} route ki navigate cheyyi`,
            `Context ni ${page} page ki switch cheyyi`,
            `${page} view open cheyyi`
        ],
        get_support: [
            `${c1.name} kosam support ticket start cheyyi, issue ${need}`,
            `${c1.name} troubleshooting kavali for ${need}`,
            `${need} issue tho ${c1.name} support workflow open cheyyi`
        ]
    };

    return pick((prof === "beginner" ? beginner : expert)[fn]);
}

function makeQuery(lang, fn, prof, c1, c2, focus, budget, need, page) {
    if (lang === "en") return enQuery(fn, prof, c1, c2, focus, budget, need, page);
    if (lang === "hi") return hiQuery(fn, prof, c1, c2, focus, budget, need, page);
    return teQuery(fn, prof, c1, c2, focus, budget, need, page);
}

function argsFor(fn, c1, c2, cat, focus, budget, need, page) {
    if (fn === "search_products") return { query: need, category: cat };
    if (fn === "get_product") return { product_id: c1.id };
    if (fn === "compare_products") return { product_id_1: c1.id, product_id_2: c2.id, focus };
    if (fn === "recommend") return { need, budget, category: cat };
    if (fn === "add_to_cart") return { product_id: c1.id };
    if (fn === "navigate_to") {
        const params = {};
        if (page === "catalog") params.category = cat;
        if (page === "product") params.product_id = c1.id;
        if (rnd() > 0.6) params.query = need;
        if (rnd() > 0.5) params.sort = pick(["price_asc", "price_desc", "rating_desc", "latest"]);
        return { page, params };
    }
    return { issue: need, product_id: rnd() > 0.2 ? c1.id : null };
}

function buildExamples() {
    const rows = [];
    let idNum = 1;

    for (const [lang, split] of Object.entries(cfg)) {
        for (const [proficiency, target] of Object.entries(split)) {
            for (let i = 0; i < target; i++) {
                const fn = functions[i % functions.length];
                const cat = pick(categories);
                const c1 = pick(byCategory.get(cat));
                const c2 = pickDifferentProduct(c1.id);
                const focus = pick(focuses);
                const budget = int(120, 15000);
                const need = pick([
                    "daily home cleaning",
                    "pet hair removal",
                    "kids coding practice",
                    "warehouse picking",
                    "factory inspection",
                    "senior assistance",
                    "home security patrol",
                    "STEM education"
                ]);
                const page = pick(pages);
                const userQuery = makeQuery(lang, fn, proficiency, c1, c2, focus, budget, need, page);
                const fcArgs = argsFor(fn, c1, c2, cat, focus, budget, need, page);
                const context = samplePageContext(cat, c1, c2);

                rows.push({
                    id: `fc_${String(idNum).padStart(4, "0")}`,
                    language: lang,
                    proficiency,
                    user_query: userQuery,
                    page_context: context,
                    function_call: {
                        name: fn,
                        arguments: fcArgs
                    },
                    metadata: {
                        source: "template_generator_v1",
                        split: "train"
                    }
                });

                idNum += 1;
            }
        }
    }

    return rows;
}

function main() {
    const rows = buildExamples();
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const payload = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    fs.writeFileSync(outPath, payload, "utf8");

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

    console.log(JSON.stringify({ outPath, stats }, null, 2));
}

main();