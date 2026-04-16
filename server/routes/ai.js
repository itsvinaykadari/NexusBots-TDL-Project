const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const Chat = require('../models/Chat');

const router = express.Router();

const ALLOWED_LANGUAGES = new Set(['en', 'hi', 'te']);
const ALLOWED_CATEGORIES = new Set(['Kitchen', 'Home Cleaner', 'Drone', 'Humanoid']);
const PAGE_MAP = new Map([
    ['/', 'home'],
    ['home', 'home'],
    ['catalog', 'catalog'],
    ['assistant', 'assistant'],
    ['orders', 'orders'],
    ['orderhistory', 'orders'],
    ['robot', 'product'],
    ['product', 'product'],
    ['cart', 'cart'],
]);

const SERVER_ROOT = path.join(__dirname, '..');
const PIPELINE_SCRIPT = path.join(SERVER_ROOT, 'ai', 'pipeline.py');
const SARVAM_SCRIPT = path.join(SERVER_ROOT, 'ai', 'sarvam_client.py');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const AI_PIPELINE_TIMEOUT_MS = Number(process.env.AI_PIPELINE_TIMEOUT_MS || 120000);
const AI_SARVAM_TIMEOUT_MS = Number(process.env.AI_SARVAM_TIMEOUT_MS || 60000);

function normalizeLanguage(language) {
    if (typeof language !== 'string') return 'en';
    const code = language.trim().toLowerCase();
    return ALLOWED_LANGUAGES.has(code) ? code : 'en';
}

function normalizeCategory(value) {
    if (typeof value !== 'string') return '';
    const category = value.trim();
    if (category === 'All') return '';
    return ALLOWED_CATEGORIES.has(category) ? category : '';
}

function normalizePage(value) {
    if (typeof value !== 'string') return 'home';
    const key = value.trim().toLowerCase().replace(/\s+/g, '');
    return PAGE_MAP.get(key) || 'home';
}

function toInt(value, fallback = null) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeContext(context) {
    if (!context || typeof context !== 'object') {
        return {
            currentPage: 'home',
            viewedProducts: [],
            cart: [],
            currentProduct: null,
            searchQuery: '',
            selectedCategory: '',
        };
    }

    const viewedProducts = Array.isArray(context.viewedProducts)
        ? context.viewedProducts
            .slice(-20)
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const id = toInt(item.id);
                if (!id) return null;
                return {
                    id,
                    name: typeof item.name === 'string' ? item.name.trim() : '',
                    category: normalizeCategory(item.category),
                    timestamp: toInt(item.timestamp, Date.now()),
                };
            })
            .filter(Boolean)
        : [];

    const cart = Array.isArray(context.cart)
        ? context.cart
            .slice(-20)
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const id = toInt(item.id);
                if (!id) return null;
                return {
                    id,
                    name: typeof item.name === 'string' ? item.name.trim() : '',
                    category: normalizeCategory(item.category),
                    price: toNumber(item.price, 0),
                    quantity: Math.max(1, toInt(item.quantity, 1)),
                };
            })
            .filter(Boolean)
        : [];

    let currentProduct = null;
    if (context.currentProduct && typeof context.currentProduct === 'object') {
        const id = toInt(context.currentProduct.id);
        if (id) {
            currentProduct = {
                id,
                name: typeof context.currentProduct.name === 'string' ? context.currentProduct.name.trim() : '',
                category: normalizeCategory(context.currentProduct.category),
            };
        }
    }

    return {
        currentPage: normalizePage(context.currentPage),
        viewedProducts,
        cart,
        currentProduct,
        searchQuery: typeof context.searchQuery === 'string' ? context.searchQuery.trim() : '',
        selectedCategory: normalizeCategory(context.selectedCategory),
    };
}

function extractJson(stdout) {
    const text = (stdout || '').trim();
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch (_) {
        // continue below
    }

    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
        try {
            return JSON.parse(text.slice(first, last + 1));
        } catch (_) {
            return null;
        }
    }

    return null;
}

function runPythonJson(scriptPath, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
        const child = spawn(PYTHON_BIN, [scriptPath], {
            cwd: SERVER_ROOT,
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let settled = false;

        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            reject(new Error(`${path.basename(scriptPath)} timed out after ${timeoutMs} ms`));
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });

        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            const parsed = extractJson(stdout);
            if (parsed) {
                resolve(parsed);
                return;
            }

            const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
            reject(new Error(`Failed to parse ${path.basename(scriptPath)} output: ${detail}`));
        });

        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    });
}

function buildPipelineFallback(message, context, language, reason) {
    const category = context.selectedCategory || context.currentProduct?.category || 'Kitchen';
    return {
        ok: false,
        language,
        proficiency: 'beginner',
        toolCalled: 'search_products',
        toolArgs: {
            query: message || 'robot',
            category,
        },
        toolResult: {
            summary: 'AI pipeline fallback activated. Returning safe default behavior.',
            products: [],
            total: 0,
        },
        productsReferenced: [],
        error: reason,
    };
}

function buildTextFallback(pipelineResult, reason) {
    const summary = pipelineResult?.toolResult?.summary;
    if (typeof summary === 'string' && summary.trim()) {
        return `${summary}${reason ? ` (${reason})` : ''}`;
    }
    return 'I can help with robot discovery, comparison, recommendations, and navigation. Please try again.';
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
        return res.status(400).json({
            error: 'message is required.',
            response: 'Please share what kind of robot help you need.',
        });
    }

    const language = normalizeLanguage(req.body?.language);
    const context = normalizeContext(req.body?.context);

    let chatId = toInt(req.body?.chatId);
    try {
        if (!chatId || !Chat.getById(chatId)) {
            const chat = Chat.create(language);
            chatId = chat.id;
        }
    } catch (_) {
        // If chat lookup/create fails, continue with ephemeral response.
        chatId = null;
    }

    try {
        if (chatId) {
            Chat.addMessage(chatId, 'user', message, 'ai_chat', 'ai_pipeline');
        }
    } catch (_) {
        // Non-fatal; continue serving response.
    }

    let pipelineResult;
    let pipelineError = null;
    try {
        pipelineResult = await runPythonJson(
            PIPELINE_SCRIPT,
            {
                message,
                language,
                context,
            },
            AI_PIPELINE_TIMEOUT_MS
        );
    } catch (error) {
        pipelineError = error.message;
        pipelineResult = buildPipelineFallback(message, context, language, error.message);
    }

    let sarvamResult;
    let sarvamError = null;
    try {
        sarvamResult = await runPythonJson(
            SARVAM_SCRIPT,
            {
                toolPayload: pipelineResult,
                language,
                context,
                proficiency: pipelineResult?.proficiency || 'beginner',
            },
            AI_SARVAM_TIMEOUT_MS
        );
    } catch (error) {
        sarvamError = error.message;
        sarvamResult = {
            ok: false,
            source: 'fallback',
            response: buildTextFallback(pipelineResult, error.message),
            error: error.message,
        };
    }

    const responseText =
        (typeof sarvamResult?.response === 'string' && sarvamResult.response.trim()) ||
        buildTextFallback(pipelineResult, sarvamResult?.error);

    try {
        if (chatId) {
            Chat.addMessage(
                chatId,
                'assistant',
                responseText,
                pipelineResult?.toolCalled || 'ai_fallback',
                'ai_pipeline'
            );
        }
    } catch (_) {
        // Non-fatal; response still returned.
    }

    return res.json({
        response: responseText,
        toolCalled: pipelineResult?.toolCalled || 'search_products',
        toolArgs: pipelineResult?.toolArgs || {},
        productsReferenced: Array.isArray(pipelineResult?.productsReferenced)
            ? pipelineResult.productsReferenced
            : [],
        proficiency: pipelineResult?.proficiency || 'beginner',
        chatId,
        source: sarvamResult?.source || 'fallback',
        warnings: [pipelineError, sarvamError, sarvamResult?.error].filter(Boolean),
    });
});

module.exports = router;
