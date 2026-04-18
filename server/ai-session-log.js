/**
 * AI session logger — writes one JSONL entry per request to logs/ai_sessions.jsonl
 * Each line is a self-contained JSON object for easy grep/jq analysis.
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'ai_sessions.jsonl');

// Ensure logs/ exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(entry) {
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_) {
        // Non-fatal — logging must never crash the request
    }
}

/**
 * Log a full AI request/response cycle.
 *
 * @param {object} opts
 * @param {string}  opts.message          - Raw user message
 * @param {string}  opts.language         - Normalized language code
 * @param {object}  opts.context          - Normalized user context (page, cart, etc.)
 * @param {number|null} opts.chatId       - Chat session ID
 * @param {object|null} opts.pipelineResult   - Full pipeline.py output (or null on error)
 * @param {string|null} opts.pipelineError    - Error string if pipeline threw
 * @param {object|null} opts.sarvamResult     - Full sarvam_client.py output (or null on error)
 * @param {string|null} opts.sarvamError      - Error string if sarvam threw
 * @param {string}  opts.finalResponse    - The text actually sent back to the client
 * @param {string}  opts.responseSource   - 'guided'|'sarvam'|'fallback'
 * @param {number}  opts.durationMs       - Total request processing time
 */
function logSession({
    message,
    language,
    context,
    chatId,
    pipelineResult,
    pipelineError,
    sarvamResult,
    sarvamError,
    finalResponse,
    responseSource,
    durationMs,
}) {
    writeLog({
        ts: new Date().toISOString(),
        chatId,
        durationMs,

        // ── Input ──────────────────────────────────────────────
        input: {
            message,
            language,
            page: context?.currentPage,
            selectedCategory: context?.selectedCategory,
            searchQuery: context?.searchQuery,
            cartItems: context?.cart?.length ?? 0,
            viewedProducts: context?.viewedProducts?.length ?? 0,
            currentProduct: context?.currentProduct?.name ?? null,
        },

        // ── Pipeline (intent / tool routing) ───────────────────
        pipeline: pipelineError
            ? { error: pipelineError }
            : {
                toolCalled: pipelineResult?.toolCalled,
                toolArgs: pipelineResult?.toolArgs,
                toolSource: pipelineResult?.toolSource,
                ragEnabled: pipelineResult?.ragEnabled,
                proficiency: pipelineResult?.proficiency,
                language: pipelineResult?.language,
                ui_guide: pipelineResult?.ui_guide,
                toolResultSummary: pipelineResult?.toolResult?.summary ?? null,
                productsCount: Array.isArray(pipelineResult?.productsReferenced)
                    ? pipelineResult.productsReferenced.length
                    : 0,
                products: Array.isArray(pipelineResult?.productsReferenced)
                    ? pipelineResult.productsReferenced.map(p => ({ id: p.id, name: p.name, price: p.price }))
                    : [],
            },

        // ── Sarvam (text generation) ────────────────────────────
        sarvam: sarvamError
            ? { error: sarvamError, fallbackResponse: sarvamResult?.response ?? null }
            : {
                source: sarvamResult?.source,
                ok: sarvamResult?.ok,
                responsePreview: typeof sarvamResult?.response === 'string'
                    ? sarvamResult.response.slice(0, 300)
                    : null,
            },

        // ── Final output ───────────────────────────────────────
        output: {
            source: responseSource,
            responsePreview: typeof finalResponse === 'string'
                ? finalResponse.slice(0, 400)
                : null,
            responseLength: typeof finalResponse === 'string' ? finalResponse.length : 0,
        },
    });
}

module.exports = { logSession, LOG_FILE };
