#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const datasetPath = path.join(root, "final", "function_calling_v1.jsonl");
const reportPath = path.join(root, "processed", "validation_report_v1.json");
const outPath = path.join(root, "review", "manual_review_sample_v1.jsonl");

function loadJsonl(filePath) {
    const text = fs.readFileSync(filePath, "utf8").trim();
    if (!text) return [];
    return text.split("\n").map((line) => JSON.parse(line));
}

function pickStride(rows, targetCount) {
    if (rows.length <= targetCount) return [...rows];
    const stride = rows.length / targetCount;
    const picked = [];
    for (let i = 0; i < targetCount; i++) {
        picked.push(rows[Math.floor(i * stride)]);
    }
    return picked;
}

function main() {
    const rows = loadJsonl(datasetPath);
    const report = fs.existsSync(reportPath)
        ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
        : { invalid_rows: [] };

    const byLang = { en: [], hi: [], te: [] };
    for (const row of rows) {
        if (byLang[row.language]) byLang[row.language].push(row);
    }

    const sampled = [];
    sampled.push(...pickStride(byLang.en, Math.max(1, Math.ceil(byLang.en.length * 0.12))));
    sampled.push(...pickStride(byLang.hi, Math.max(1, Math.ceil(byLang.hi.length * 0.12))));
    sampled.push(...pickStride(byLang.te, Math.max(1, Math.ceil(byLang.te.length * 0.12))));

    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const invalid of report.invalid_rows || []) {
        const hit = byId.get(invalid.id);
        if (hit) sampled.push(hit);
    }

    const dedup = [];
    const seen = new Set();
    for (const row of sampled) {
        if (!seen.has(row.id)) {
            seen.add(row.id);
            dedup.push(row);
        }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, dedup.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

    console.log(
        JSON.stringify(
            {
                outPath,
                sampled: dedup.length,
                coverage: {
                    en: dedup.filter((r) => r.language === "en").length,
                    hi: dedup.filter((r) => r.language === "hi").length,
                    te: dedup.filter((r) => r.language === "te").length
                }
            },
            null,
            2
        )
    );
}

main();