#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "tool_schemas.json"), "utf8"));
const inPath = path.join(root, "final", "function_calling_v1.jsonl");
const outPath = path.join(root, "processed", "validation_report_v1.json");

const toolMap = new Map(schema.tools.map((t) => [t.name, t]));

function loadJsonl(filePath) {
    const text = fs.readFileSync(filePath, "utf8").trim();
    if (!text) return [];
    return text.split("\n").map((line) => JSON.parse(line));
}

function typeOfVal(v) {
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
}

function validateSchemaValue(spec, value, rootSchema, keyPath, errors) {
    if (spec.oneOf) {
        const localErrors = [];
        let ok = false;
        for (const candidate of spec.oneOf) {
            const e = [];
            validateSchemaValue(candidate, value, rootSchema, keyPath, e);
            if (e.length === 0) {
                ok = true;
                break;
            }
            localErrors.push(e);
        }
        if (!ok) errors.push(`${keyPath}: value does not satisfy any oneOf rule`);
        return;
    }

    if (spec.type === "integer") {
        if (!Number.isInteger(value)) {
            errors.push(`${keyPath}: expected integer`);
            return;
        }
        if (spec.minimum !== undefined && value < spec.minimum) {
            errors.push(`${keyPath}: below minimum ${spec.minimum}`);
        }
        if (spec.maximum !== undefined && value > spec.maximum) {
            errors.push(`${keyPath}: above maximum ${spec.maximum}`);
        }
        return;
    }

    if (spec.type === "string") {
        if (typeof value !== "string") {
            errors.push(`${keyPath}: expected string`);
            return;
        }
        if (spec.minLength !== undefined && value.length < spec.minLength) {
            errors.push(`${keyPath}: below minLength ${spec.minLength}`);
        }
        if (spec.enum && !spec.enum.includes(value)) {
            errors.push(`${keyPath}: value not in enum`);
        }
        if (spec.enumRef) {
            const allowed = rootSchema[spec.enumRef] || [];
            if (!allowed.includes(value)) {
                errors.push(`${keyPath}: value not in enumRef ${spec.enumRef}`);
            }
        }
        return;
    }

    if (spec.type === "null") {
        if (value !== null) errors.push(`${keyPath}: expected null`);
        return;
    }

    if (spec.type === "object") {
        if (typeOfVal(value) !== "object") {
            errors.push(`${keyPath}: expected object`);
            return;
        }
        const required = spec.required || [];
        for (const req of required) {
            if (!(req in value)) {
                errors.push(`${keyPath}.${req}: missing required key`);
            }
        }
        const props = spec.properties || {};
        for (const [k, v] of Object.entries(value)) {
            if (props[k]) {
                validateSchemaValue(props[k], v, rootSchema, `${keyPath}.${k}`, errors);
            }
        }
        return;
    }

    errors.push(`${keyPath}: unsupported schema type ${spec.type}`);
}

function validateRow(row, index) {
    const errors = [];
    if (!row.messages || !Array.isArray(row.messages) || row.messages.length < 2) {
        errors.push("messages: invalid structure");
    }
    if (!row.tool_calls || !Array.isArray(row.tool_calls) || row.tool_calls.length !== 1) {
        errors.push("tool_calls: must contain exactly one tool call");
        return errors;
    }

    const tc = row.tool_calls[0];
    const fnName = tc.function && tc.function.name;
    if (!toolMap.has(fnName)) {
        errors.push(`tool_calls[0].function.name: unknown function ${fnName}`);
        return errors;
    }

    let args;
    try {
        args = JSON.parse(tc.function.arguments);
    } catch (err) {
        errors.push("tool_calls[0].function.arguments: not valid JSON string");
        return errors;
    }

    const fnSchema = toolMap.get(fnName).parameters;
    validateSchemaValue(fnSchema, args, schema, `row[${index}].arguments`, errors);

    if (!["en", "hi", "te"].includes(row.language)) {
        errors.push(`language: unsupported value ${row.language}`);
    }
    if (!["beginner", "expert"].includes(row.proficiency)) {
        errors.push(`proficiency: unsupported value ${row.proficiency}`);
    }

    return errors;
}

function buildCounts(rows) {
    const counts = {
        total: rows.length,
        byLanguage: {},
        byProficiency: {},
        byFunction: {},
        byLanguageProficiency: {}
    };

    for (const row of rows) {
        const fnName = row.tool_calls[0].function.name;
        counts.byLanguage[row.language] = (counts.byLanguage[row.language] || 0) + 1;
        counts.byProficiency[row.proficiency] = (counts.byProficiency[row.proficiency] || 0) + 1;
        counts.byFunction[fnName] = (counts.byFunction[fnName] || 0) + 1;
        const key = `${row.language}:${row.proficiency}`;
        counts.byLanguageProficiency[key] = (counts.byLanguageProficiency[key] || 0) + 1;
    }

    return counts;
}

function main() {
    const rows = loadJsonl(inPath);
    const invalidRows = [];

    rows.forEach((row, i) => {
        const errors = validateRow(row, i);
        if (errors.length > 0) {
            invalidRows.push({ id: row.id || `row_${i + 1}`, index: i + 1, errors });
        }
    });

    const counts = buildCounts(rows);
    const report = {
        file: inPath,
        generated_at: new Date().toISOString(),
        counts,
        targets: {
            total: 1000,
            byLanguage: { en: 500, hi: 250, te: 250 },
            byLanguageProficiency: {
                "en:beginner": 250,
                "en:expert": 250,
                "hi:beginner": 125,
                "hi:expert": 125,
                "te:beginner": 125,
                "te:expert": 125
            }
        },
        invalid_count: invalidRows.length,
        invalid_rows: invalidRows.slice(0, 200)
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

    console.log(
        JSON.stringify(
            {
                report: outPath,
                total: counts.total,
                invalid_count: invalidRows.length,
                byLanguage: counts.byLanguage,
                byLanguageProficiency: counts.byLanguageProficiency
            },
            null,
            2
        )
    );
}

main();