#!/usr/bin/env node
/**
 * Nexus Bots — B2 real-prompt baseline tester + dataset builder.
 *
 * Flow:
 *   1. Spawns server/ai/pipeline.py --worker (same as the server does)
 *   2. Sends each of the 70 B2 prompts to pipeline.py via JSON-line IPC
 *   3. pipeline.py routes using Qwen3-0.6B (if GPU + ENABLE_FC_MODEL=1)
 *      or heuristic fallback (CPU-only, no GPU needed)
 *   4. Compares pipeline prediction vs our ground-truth label → logs ✓/✗
 *   5. Writes JSONL rows with GROUND-TRUTH labels (not pipeline prediction)
 *      to research/dataset/raw/function_calls_raw_v2.jsonl
 *
 * NO Sarvam. NO server HTTP endpoint. Only pipeline.py is called.
 *
 * Usage:
 *   node research/dataset/scripts/inject_b2_prompts.js
 *
 * Env vars:
 *   PYTHON_BIN=python3   Python binary (default: python3)
 *   FORCE=1              Re-run even if B2 rows already exist (strips old ones first)
 */

const fs   = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

const ROOT        = path.resolve(__dirname, "../../..");           // project root
const SERVER_ROOT = path.join(ROOT, "server");
const PIPELINE    = path.join(SERVER_ROOT, "ai", "pipeline.py");
const RAW_PATH    = path.join(ROOT, "research", "dataset", "raw", "function_calls_raw_v2.jsonl");
const PYTHON      = process.env.PYTHON_BIN || "python3";

// ── Page contexts (realistic, matches what the UI sends) ─────────────────────
const CTX = {
  home:             { currentPage:"home",    viewedProducts:[], cart:[], currentProduct:null, searchQuery:"", selectedCategory:"" },
  catalog_drone:    { currentPage:"catalog", viewedProducts:[{id:8,name:"DJI Matrice 30T",category:"Drone",timestamp:1700000000},{id:7,name:"Ring Always Home Cam",category:"Drone",timestamp:1700000060}], cart:[], currentProduct:null, searchQuery:"drone", selectedCategory:"Drone" },
  catalog_kitchen:  { currentPage:"catalog", viewedProducts:[{id:1,name:"Amazon Astro",category:"Kitchen",timestamp:1700000000},{id:2,name:"Samsung Ballie",category:"Kitchen",timestamp:1700000060}], cart:[], currentProduct:null, searchQuery:"kitchen robots", selectedCategory:"Kitchen" },
  catalog_cleaner:  { currentPage:"catalog", viewedProducts:[{id:4,name:"iRobot Roomba j9+",category:"Home Cleaner",timestamp:1700000000},{id:5,name:"Roborock S8 MaxV Ultra",category:"Home Cleaner",timestamp:1700000060}], cart:[], currentProduct:null, searchQuery:"vacuum robot", selectedCategory:"Home Cleaner" },
  catalog_humanoid: { currentPage:"catalog", viewedProducts:[{id:10,name:"Miko 3",category:"Humanoid",timestamp:1700000000},{id:11,name:"Wonder Workshop Dash",category:"Humanoid",timestamp:1700000060}], cart:[], currentProduct:null, searchQuery:"kids robot", selectedCategory:"Humanoid" },
  with_cart:        { currentPage:"home",    viewedProducts:[{id:10,name:"Miko 3",category:"Humanoid",timestamp:1700000000}], cart:[{id:10,name:"Miko 3",category:"Humanoid",price:249.99,quantity:1}], currentProduct:null, searchQuery:"", selectedCategory:"" },
  orders:           { currentPage:"orders",  viewedProducts:[], cart:[], currentProduct:null, searchQuery:"", selectedCategory:"" },
};

// ── 70 B2 prompts with ground-truth labels ───────────────────────────────────
// gt_tool = correct tool name
// gt_args = correct arguments
// gt_ui   = correct ui_guide (null means none)
const PROMPTS = [
  // ── English (25) ─────────────────────────────────────────────────────────
  { message:"show me all drone robots",                                lang:"en", prof:"beginner", ctx:"catalog_drone",    gt_tool:"search_products",  gt_args:{query:"drone robots",         category:"Drone"},                                  gt_ui:"find_drone" },
  { message:"what's the cheapest robot you have?",                    lang:"en", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"cheapest robot",         budget:200,  category:null},                         gt_ui:null },
  { message:"tell me about DJI Matrice 30T",                         lang:"en", prof:"beginner", ctx:"catalog_drone",    gt_tool:"get_product",       gt_args:{product_id:8},                                                                     gt_ui:null },
  { message:"compare Roomba and Roborock on suction",                 lang:"en", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"compare_products",  gt_args:{product_id_1:4,product_id_2:5,focus:"suction"},                                    gt_ui:"compare_products" },
  { message:"I want a kitchen robot under $1000",                     lang:"en", prof:"beginner", ctx:"catalog_kitchen",  gt_tool:"recommend",         gt_args:{need:"kitchen robot",          budget:1000, category:"Kitchen"},                    gt_ui:"find_kitchen" },
  { message:"add Miko 3 to my cart",                                  lang:"en", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"add_to_cart",       gt_args:{product_id:10},                                                                    gt_ui:null },
  { message:"where are my orders?",                                   lang:"en", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"check_orders" },
  { message:"I need help with my robot, open support",                lang:"en", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"open_support" },
  { message:"file a complaint about my order",                        lang:"en", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"show me my previous tickets",                            lang:"en", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"view_tickets" },
  { message:"where can I find pool cleaning drones?",                 lang:"en", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"drone",    product_id:9}},                        gt_ui:"locate_path:drone:9" },
  { message:"what is the best robot for kids?",                       lang:"en", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"kids companion",         budget:500,  category:"Humanoid"},                   gt_ui:"find_humanoid" },
  { message:"show me window cleaning robots",                         lang:"en", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"search_products",   gt_args:{query:"window cleaning robot", category:"Home Cleaner"},                           gt_ui:"find_home_cleaner" },
  { message:"compare DJI Matrice and Ring Always Home Cam on camera", lang:"en", prof:"expert",   ctx:"catalog_drone",    gt_tool:"compare_products",  gt_args:{product_id_1:8,product_id_2:7,focus:"camera"},                                     gt_ui:"compare_products" },
  { message:"go to cart",                                             lang:"en", prof:"beginner", ctx:"with_cart",        gt_tool:"navigate_to",       gt_args:{page:"cart",    params:{}},                                                        gt_ui:"update_cart" },
  { message:"what can you tell me about Wonder Workshop Dash?",       lang:"en", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"get_product",       gt_args:{product_id:11},                                                                    gt_ui:null },
  { message:"I want a vacuum robot that empties itself",              lang:"en", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"self-emptying vacuum",  category:"Home Cleaner"},                           gt_ui:"find_home_cleaner" },
  { message:"add LEGO Spike Prime to cart",                           lang:"en", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"add_to_cart",       gt_args:{product_id:12},                                                                    gt_ui:null },
  { message:"recommend me a security drone under $500",               lang:"en", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"security drone",         budget:500,  category:"Drone"},                      gt_ui:"find_drone" },
  { message:"what is the most expensive robot here?",                 lang:"en", prof:"expert",   ctx:"home",             gt_tool:"search_products",   gt_args:{query:"robot",                 category:null},                                     gt_ui:null },
  { message:"take me home",                                           lang:"en", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"home",    params:{}},                                                        gt_ui:null },
  { message:"compare Samsung Ballie and Amazon Astro on price",       lang:"en", prof:"expert",   ctx:"catalog_kitchen",  gt_tool:"compare_products",  gt_args:{product_id_1:2,product_id_2:1,focus:"price"},                                      gt_ui:"compare_products" },
  { message:"where is Aiper Surfer S1?",                             lang:"en", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"drone",    product_id:9}},                        gt_ui:"locate_path:drone:9" },
  { message:"I want to raise a ticket, my robot is broken",          lang:"en", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"best humanoid robot for classroom use",                  lang:"en", prof:"expert",   ctx:"catalog_humanoid", gt_tool:"recommend",         gt_args:{need:"classroom robot",        budget:500,  category:"Humanoid"},                   gt_ui:"find_humanoid" },

  // ── Hindi Romanized (25) ─────────────────────────────────────────────────
  { message:"drone robots dikhao",                                    lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"drone robots",         category:"Drone"},                                  gt_ui:"find_drone" },
  { message:"DJI Matrice 30T ke baare mein batao",                   lang:"hi", prof:"beginner", ctx:"catalog_drone",    gt_tool:"get_product",       gt_args:{product_id:8},                                                                     gt_ui:null },
  { message:"mera order kahan hai",                                   lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"check_orders" },
  { message:"Miko 3 cart mein add karo",                             lang:"hi", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"add_to_cart",       gt_args:{product_id:10},                                                                    gt_ui:null },
  { message:"sasta drone dikhao",                                    lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"cheapest drone",        budget:300,  category:"Drone"},                      gt_ui:"find_drone" },
  { message:"Roomba aur Roborock compare karo suction mein",         lang:"hi", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"compare_products",  gt_args:{product_id_1:4,product_id_2:5,focus:"suction"},                                    gt_ui:"compare_products" },
  { message:"kitchen robots dikhao",                                 lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"kitchen robots",       category:"Kitchen"},                                gt_ui:"find_kitchen" },
  { message:"mujhe support chahiye",                                 lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"open_support" },
  { message:"complaint file karni hai",                              lang:"hi", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"mere purane tickets dikhao",                            lang:"hi", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"view_tickets" },
  { message:"drone kahan milega?",                                   lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"drone"}},                                        gt_ui:"find_drone" },
  { message:"bacchon ke liye robot suggest karo",                    lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"kids companion",        budget:500,  category:"Humanoid"},                   gt_ui:"find_humanoid" },
  { message:"window cleaning robot chahiye",                         lang:"hi", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"search_products",   gt_args:{query:"window cleaning robot",category:"Home Cleaner"},                           gt_ui:"find_home_cleaner" },
  { message:"$500 ke andar vacuum robot suggest karo",               lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"vacuum robot",          budget:500,  category:"Home Cleaner"},               gt_ui:"find_home_cleaner" },
  { message:"Samsung Ballie ke details do",                          lang:"hi", prof:"beginner", ctx:"catalog_kitchen",  gt_tool:"get_product",       gt_args:{product_id:2},                                                                     gt_ui:null },
  { message:"Enabot EBO X ko cart mein daal do",                    lang:"hi", prof:"beginner", ctx:"catalog_kitchen",  gt_tool:"add_to_cart",       gt_args:{product_id:3},                                                                     gt_ui:null },
  { message:"humanoid robots list karo",                             lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"humanoid robots",      category:"Humanoid"},                               gt_ui:"find_humanoid" },
  { message:"Amazon Astro aur Samsung Ballie mein kya fark hai",     lang:"hi", prof:"beginner", ctx:"catalog_kitchen",  gt_tool:"compare_products",  gt_args:{product_id_1:1,product_id_2:2,focus:"price"},                                      gt_ui:"compare_products" },
  { message:"mera cart dikhao",                                      lang:"hi", prof:"beginner", ctx:"with_cart",        gt_tool:"navigate_to",       gt_args:{page:"cart",    params:{}},                                                        gt_ui:"update_cart" },
  { message:"robot kharaab hai, ticket banao",                       lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"LEGO Spike Prime kahan milega?",                        lang:"hi", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"humanoid",product_id:12}},                       gt_ui:"locate_path:humanoid:12" },
  { message:"best kitchen robot $1500 mein",                         lang:"hi", prof:"expert",   ctx:"catalog_kitchen",  gt_tool:"recommend",         gt_args:{need:"kitchen robot",         budget:1500, category:"Kitchen"},                    gt_ui:"find_kitchen" },
  { message:"Wonder Workshop Dash ke baare mein batao",              lang:"hi", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"get_product",       gt_args:{product_id:11},                                                                    gt_ui:null },
  { message:"DJI Matrice aur Ring Cam camera pe compare karo",       lang:"hi", prof:"expert",   ctx:"catalog_drone",    gt_tool:"compare_products",  gt_args:{product_id_1:8,product_id_2:7,focus:"camera"},                                     gt_ui:"compare_products" },
  { message:"home page pe le chalo",                                 lang:"hi", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"home",    params:{}},                                                        gt_ui:null },

  // ── Telugu Romanized (20) ─────────────────────────────────────────────────
  { message:"drone robots chupinchandi",                             lang:"te", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"drone robots",         category:"Drone"},                                  gt_ui:"find_drone" },
  { message:"Miko 3 gurinchi cheppu",                                lang:"te", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"get_product",       gt_args:{product_id:10},                                                                    gt_ui:null },
  { message:"naa order ekkada undi?",                                lang:"te", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"check_orders" },
  { message:"Roborock cart lo add cheyyi",                           lang:"te", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"add_to_cart",       gt_args:{product_id:5},                                                                     gt_ui:null },
  { message:"kitchen robots chupinchu",                              lang:"te", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"kitchen robots",       category:"Kitchen"},                                gt_ui:"find_kitchen" },
  { message:"support kavali",                                        lang:"te", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"open_support" },
  { message:"complaint file cheyali",                                lang:"te", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"naa tickets chupinchu",                                 lang:"te", prof:"beginner", ctx:"orders",           gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"view_tickets" },
  { message:"drone ekkada dorikutundi",                              lang:"te", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"drone"}},                                        gt_ui:"find_drone" },
  { message:"pillalaki robot suggest cheyyi",                        lang:"te", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"kids robot",            budget:300,  category:"Humanoid"},                   gt_ui:"find_humanoid" },
  { message:"$500 lopu vacuum robot kavali",                         lang:"te", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"vacuum robot",          budget:500,  category:"Home Cleaner"},               gt_ui:"find_home_cleaner" },
  { message:"DJI Matrice 30T gurinchi cheppu",                      lang:"te", prof:"expert",   ctx:"catalog_drone",    gt_tool:"get_product",       gt_args:{product_id:8},                                                                     gt_ui:null },
  { message:"LEGO Spike Prime cart lo pettu",                        lang:"te", prof:"beginner", ctx:"catalog_humanoid", gt_tool:"add_to_cart",       gt_args:{product_id:12},                                                                    gt_ui:null },
  { message:"humanoid robots list cheyyi",                           lang:"te", prof:"beginner", ctx:"home",             gt_tool:"search_products",   gt_args:{query:"humanoid robots",      category:"Humanoid"},                               gt_ui:"find_humanoid" },
  { message:"Roomba mariyu Roborock ni suction meeda compare cheyyi",lang:"te", prof:"beginner", ctx:"catalog_cleaner",  gt_tool:"compare_products",  gt_args:{product_id_1:4,product_id_2:5,focus:"suction"},                                    gt_ui:"compare_products" },
  { message:"naa cart chupinchu",                                    lang:"te", prof:"beginner", ctx:"with_cart",        gt_tool:"navigate_to",       gt_args:{page:"cart",    params:{}},                                                        gt_ui:"update_cart" },
  { message:"Wonder Workshop Dash ekkada undi?",                     lang:"te", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"catalog", params:{category:"humanoid",product_id:11}},                       gt_ui:"locate_path:humanoid:11" },
  { message:"robot pani cheyyatledu, ticket create cheyyi",         lang:"te", prof:"beginner", ctx:"home",             gt_tool:"navigate_to",       gt_args:{page:"orders",  params:{}},                                                        gt_ui:"new_ticket" },
  { message:"cheapest humanoid robot cheppu",                        lang:"te", prof:"beginner", ctx:"home",             gt_tool:"recommend",         gt_args:{need:"cheapest humanoid",     budget:200,  category:"Humanoid"},                   gt_ui:"find_humanoid" },
  { message:"Amazon Astro details ivvu",                             lang:"te", prof:"beginner", ctx:"catalog_kitchen",  gt_tool:"get_product",       gt_args:{product_id:1},                                                                     gt_ui:null },
];

// ── Pipeline worker (same IPC as server/routes/ai.js) ────────────────────────
function startPipelineWorker() {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [PIPELINE, "--worker"], {
      cwd: SERVER_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: proc.stdout });
    const queue = [];
    let ready = false;

    rl.on("line", (line) => {
      if (!ready) {
        try {
          const msg = JSON.parse(line);
          if (msg.ready) { ready = true; resolve({ proc, rl, queue }); }
        } catch (_) {}
        return;
      }
      const cb = queue.shift();
      if (cb) {
        try { cb.resolve(JSON.parse(line)); }
        catch (_) { cb.reject(new Error("Bad JSON from pipeline")); }
      }
    });

    proc.stderr.on("data", () => {}); // silence
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (!ready) reject(new Error(`pipeline.py exited with code ${code}`));
    });
  });
}

function pipelineSend(worker, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("pipeline timeout (30s)")), 30000);
    worker.queue.push({
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject:  (e) => { clearTimeout(timer); reject(e); },
    });
    worker.proc.stdin.write(JSON.stringify(payload) + "\n");
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n, w) { return String(n).padStart(w, " "); }

function idempotencyCheck(force) {
  if (!fs.existsSync(RAW_PATH)) return { lines: [], hasB2: false };
  const lines = fs.readFileSync(RAW_PATH, "utf8").split("\n").filter(Boolean);
  const hasB2 = lines.some((l) => { try { return JSON.parse(l).id.startsWith("b2_"); } catch { return false; } });
  if (hasB2 && !force) {
    const cnt = lines.filter((l) => { try { return JSON.parse(l).id.startsWith("b2_"); } catch { return false; } }).length;
    console.log(`\nB2 rows already exist (${cnt} rows). Skipping.`);
    console.log(`Re-run with FORCE=1 to rebuild them.`);
    process.exit(0);
  }
  if (hasB2 && force) {
    const clean = lines.filter((l) => { try { return !JSON.parse(l).id.startsWith("b2_"); } catch { return true; } });
    fs.writeFileSync(RAW_PATH, clean.join("\n") + "\n", "utf8");
    console.log(`FORCE: stripped ${lines.length - clean.length} old B2 rows. Base: ${clean.length} rows.\n`);
    return { lines: clean, hasB2: false };
  }
  return { lines, hasB2 };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const force = process.env.FORCE === "1";
  const { lines: baseLines } = idempotencyCheck(force);

  console.log(`\nNexus Bots — B2 Pipeline Baseline Tester`);
  console.log(`Pipeline : ${PIPELINE}`);
  console.log(`Python   : ${PYTHON}`);
  console.log(`Prompts  : ${PROMPTS.length}  (EN:25 HI:25 TE:20)`);
  console.log(`GPU mode : ${process.env.ENABLE_FC_MODEL === "1" ? "Qwen3-0.6B (ENABLE_FC_MODEL=1)" : "heuristic (no GPU — set ENABLE_FC_MODEL=1 for Qwen)"}`)
  console.log(`─────────────────────────────────────────────`);

  // Start pipeline worker
  let worker;
  try {
    worker = await startPipelineWorker();
    console.log(`Pipeline worker ready.\n`);
  } catch (err) {
    console.error(`Failed to start pipeline.py: ${err.message}`);
    process.exit(1);
  }

  const newRows = [];
  const mismatches = [];
  let correct = 0;

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];

    process.stdout.write(`[${pad(i + 1, 2)}/${PROMPTS.length}] [${p.lang.toUpperCase()}] ${p.message.substring(0, 55).padEnd(55)} `);

    let pred = null;
    try {
      pred = await pipelineSend(worker, {
        message: p.message,
        language: p.lang,
        context: CTX[p.ctx],
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      pred = null;
    }

    // Compare pipeline prediction vs ground truth (tool name only — args vary)
    const predTool = pred?.toolCalled || "?";
    const toolSrc  = pred?.toolSource || "?";
    const match    = predTool === p.gt_tool;
    if (match) correct++;
    else mismatches.push({ i: i + 1, lang: p.lang, message: p.message, expected: p.gt_tool, got: predTool, src: toolSrc });

    console.log(`${match ? "✓" : "✗"}  pred=${predTool.padEnd(18)} gt=${p.gt_tool.padEnd(18)} src=${toolSrc}`);

    // Build training row with GROUND-TRUTH label (not pipeline prediction)
    newRows.push({
      id: `b2_${p.lang}_${String(baseLines.length + newRows.length + 1).padStart(4, "0")}`,
      language: p.lang,
      proficiency: p.prof,
      user_query: p.message,
      page_context: CTX[p.ctx],
      function_call: { name: p.gt_tool, arguments: p.gt_args },
      ui_guide: p.gt_ui,
      metadata: {
        intent: "b2_real_prompt",
        source: "b2_human_labeled",
        pipeline_pred: predTool,   // log what the pipeline predicted (for analysis)
        pipeline_src: toolSrc,     // heuristic or model
        tool_correct: match,       // did pipeline get the tool right?
        split: "train",
      },
    });
  }

  // Shut down worker
  worker.proc.stdin.end();
  worker.proc.kill("SIGTERM");

  // Append to raw file
  const appendStr = newRows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.appendFileSync(RAW_PATH, appendStr, "utf8");

  // ── Summary ───────────────────────────────────────────────────────────────
  const acc = ((correct / PROMPTS.length) * 100).toFixed(1);
  const byLang = PROMPTS.reduce((a, p, i) => {
    const k = p.lang;
    if (!a[k]) a[k] = { total: 0, correct: 0 };
    a[k].total++;
    if (newRows[i].metadata.tool_correct) a[k].correct++;
    return a;
  }, {});

  console.log(`\n══════════════════════════════════════`);
  console.log(`Pipeline baseline accuracy: ${correct}/${PROMPTS.length} = ${acc}%`);
  for (const [l, s] of Object.entries(byLang)) {
    console.log(`  ${l.toUpperCase()}: ${s.correct}/${s.total} = ${((s.correct/s.total)*100).toFixed(1)}%`);
  }

  if (mismatches.length) {
    console.log(`\nMismatches (${mismatches.length}) — highest-value training examples:`);
    for (const m of mismatches) {
      console.log(`  [${m.i}][${m.lang}] "${m.message}"`);
      console.log(`        expected=${m.expected}  got=${m.got}  src=${m.src}`);
    }
  }

  const total = baseLines.length + newRows.length;
  console.log(`\nDataset: ${newRows.length} B2 rows appended → total ${total} rows`);
  console.log(`Output : ${RAW_PATH}`);
  console.log(`\nNext   : cd finetune && python3 prepare_dataset.py`);
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
