#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inPath = path.join(root, "raw", "function_calls_raw_v1.jsonl");
const outProcessed = path.join(root, "processed", "function_calling_train_v1.jsonl");
const outFinal = path.join(root, "final", "function_calling_v1.jsonl");

function loadJsonl(filePath) {
    const text = fs.readFileSync(filePath, "utf8").trim();
    if (!text) return [];
    return text.split("\n").map((line) => JSON.parse(line));
}

function toTrainingRecord(row) {
    const context = JSON.stringify(row.page_context);
    return {
        id: row.id,
        language: row.language,
        proficiency: row.proficiency,
        messages: [
            {
                role: "system",
                content:
                    "You are a robotics commerce function-calling model. Use exactly one tool call with valid arguments based on user query and context."
            },
            {
                role: "user",
                content: `Query: ${row.user_query}\nContext: ${context}`
            }
        ],
        tool_calls: [
            {
                id: `call_${row.id}`,
                type: "function",
                function: {
                    name: row.function_call.name,
                    arguments: JSON.stringify(row.function_call.arguments)
                }
            }
        ],
        metadata: {
            source: row.metadata && row.metadata.source ? row.metadata.source : "unknown",
            split: row.metadata && row.metadata.split ? row.metadata.split : "train"
        }
    };
}

function writeJsonl(filePath, rows) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}

function main() {
    const rawRows = loadJsonl(inPath);
    const outRows = rawRows.map(toTrainingRecord);
    writeJsonl(outProcessed, outRows);
    writeJsonl(outFinal, outRows);
    console.log(
        JSON.stringify(
            {
                inPath,
                outProcessed,
                outFinal,
                records: outRows.length
            },
            null,
            2
        )
    );
}

main();