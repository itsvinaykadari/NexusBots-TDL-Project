#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "tool_schemas.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "product_catalog.json"), "utf8"));
const inPath = path.join(root, "final", "function_calling_v1.jsonl");
const outPath = path.join(root, "processed", "validation_report_v1.json");

const toolMap = new Map(schema.tools.map((t) => [t.name, t]));
const validProductIds = new Set(catalog.map((p) => p.id));
const categorySet = new Set(schema.categories || []);
const pageSet = new Set(schema.pages || []);

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

function parseContextFromRow(row) {
    if (!row.messages || !Array.isArray(row.messages) || row.messages.length < 2) return null;
    const userMessage = row.messages.find((m) => m && m.role === "user");
    if (!userMessage || typeof userMessage.content !== "string") return null;
    const marker = "\nContext: ";
    const idx = userMessage.content.indexOf(marker);
    if (idx === -1) return null;
    const contextText = userMessage.content.slice(idx + marker.length).trim();
    try {
        return JSON.parse(contextText);
    } catch (err) {
        return null;
    }
}

function validateProductIdValue(value, keyPath, errors) {
    if (!Number.isInteger(value)) {
        errors.push(`${keyPath}: expected integer product id`);
        return;
    }
    if (!validProductIds.has(value)) {
        errors.push(`${keyPath}: unknown product id ${value}`);
    }
}

function validateContext(context, index, errors) {
    if (!context || typeOfVal(context) !== "object") {
        errors.push(`row[${index}].context: missing or invalid context object`);
        return;
    }

    if (!pageSet.has(context.current_page)) {
        errors.push(`row[${index}].context.current_page: invalid page ${context.current_page}`);
    }
    if (!categorySet.has(context.active_category)) {
        errors.push(`row[${index}].context.active_category: invalid category ${context.active_category}`);
    }

    for (const key of ["viewed_products", "cart_items", "visible_products"]) {
        const value = context[key];
        if (!Array.isArray(value)) {
            errors.push(`row[${index}].context.${key}: expected array`);
            continue;
        }
        value.forEach((id, i) => validateProductIdValue(id, `row[${index}].context.${key}[${i}]`, errors));
    }
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

    ["product_id", "product_id_1", "product_id_2"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(args, key) && args[key] !== null) {
            validateProductIdValue(args[key], `row[${index}].arguments.${key}`, errors);
        }
    });

    if (!["en", "hi", "te"].includes(row.language)) {
        errors.push(`language: unsupported value ${row.language}`);
    }
    if (!["beginner", "expert"].includes(row.proficiency)) {
        errors.push(`proficiency: unsupported value ${row.proficiency}`);
    }

    const userMessage = row.messages.find((m) => m && m.role === "user");
    if (!userMessage || typeof userMessage.content !== "string") {
        errors.push(`row[${index}].messages.user: missing user content`);
    } else if (userMessage.content.includes("[object Object]")) {
        errors.push(`row[${index}].messages.user: contains malformed token [object Object]`);
    }

    const context = parseContextFromRow(row);
    validateContext(context, index, errors);

    return errors;
}

function buildCounts(rows) {
    const counts = {
        total: rows.length,
        byLanguage: {},
        byProficiency: {},
        byFunction: {},
        byLanguageProficiency: {},
        byContextPage: {},
        byContextCategory: {}
    };

    for (const row of rows) {
        const fnName = row.tool_calls[0].function.name;
        counts.byLanguage[row.language] = (counts.byLanguage[row.language] || 0) + 1;
        counts.byProficiency[row.proficiency] = (counts.byProficiency[row.proficiency] || 0) + 1;
        counts.byFunction[fnName] = (counts.byFunction[fnName] || 0) + 1;
        const key = `${row.language}:${row.proficiency}`;
        counts.byLanguageProficiency[key] = (counts.byLanguageProficiency[key] || 0) + 1;

        const context = parseContextFromRow(row);
        if (context && context.current_page) {
            counts.byContextPage[context.current_page] = (counts.byContextPage[context.current_page] || 0) + 1;
        }
        if (context && context.active_category) {
            counts.byContextCategory[context.active_category] =
                (counts.byContextCategory[context.active_category] || 0) + 1;
        }
    }

    return counts;
}

function strictChecks(rows) {
    const seen = {
        categories: new Set(),
        pages: new Set(),
        tools: new Set(),
        productIds: new Set()
    };

    for (const row of rows) {
        const toolName = row.tool_calls[0].function.name;
        seen.tools.add(toolName);

        try {
            const args = JSON.parse(row.tool_calls[0].function.arguments);
            ["product_id", "product_id_1", "product_id_2"].forEach((k) => {
                if (Object.prototype.hasOwnProperty.call(args, k) && Number.isInteger(args[k])) {
                    seen.productIds.add(args[k]);
                }
            });
        } catch (err) {
            // Keep strict checks running even if some rows have malformed argument payloads.
        }

        const context = parseContextFromRow(row);
        if (context && context.active_category) seen.categories.add(context.active_category);
        if (context && context.current_page) seen.pages.add(context.current_page);
        if (context) {
            ["viewed_products", "cart_items", "visible_products"].forEach((k) => {
                if (Array.isArray(context[k])) {
                    context[k].forEach((id) => {
                        if (Number.isInteger(id)) seen.productIds.add(id);
                    });
                }
            });
        }
    }

    const allowed = {
        categories: schema.categories,
        pages: schema.pages,
        tools: schema.tools.map((t) => t.name),
        product_id_min: Math.min(...catalog.map((p) => p.id)),
        product_id_max: Math.max(...catalog.map((p) => p.id))
    };

    const disallowedValues = {
        categories: [...seen.categories].filter((v) => !categorySet.has(v)).sort(),
        pages: [...seen.pages].filter((v) => !pageSet.has(v)).sort(),
        tools: [...seen.tools].filter((v) => !toolMap.has(v)).sort(),
        product_ids: [...seen.productIds].filter((v) => !validProductIds.has(v)).sort((a, b) => a - b)
    };

    return {
        allowed,
        seen: {
            categories: [...seen.categories].sort(),
            pages: [...seen.pages].sort(),
            tools: [...seen.tools].sort(),
            product_ids: [...seen.productIds].sort((a, b) => a - b)
        },
        disallowed_values: disallowedValues,
        pass:
            disallowedValues.categories.length === 0 &&
            disallowedValues.pages.length === 0 &&
            disallowedValues.tools.length === 0 &&
            disallowedValues.product_ids.length === 0
    };
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
    const strict = strictChecks(rows);
    const report = {
        file: inPath,
        generated_at: new Date().toISOString(),
        counts,
        strict_checks: strict,
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
                strict_pass: strict.pass,
                byLanguage: counts.byLanguage,
                byLanguageProficiency: counts.byLanguageProficiency
            },
            null,
            2
        )
    );
}

main();