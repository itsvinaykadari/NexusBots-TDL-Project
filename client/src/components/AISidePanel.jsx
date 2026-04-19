import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Loader,
  ChevronRight,
  Compass,
  MessageCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { getOrCreateUserId } from "../utils/user";
import { useUserActivity } from "../context/UserActivityContext";
import { useUIGuide } from "../ui-guide/UIGuideProvider";
import robots from "../data/robots";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function buildContextPayload({
  currentPage,
  viewedProducts,
  cart,
  currentProduct,
  searchQuery,
  selectedCategory,
}) {
  return {
    currentPage,
    viewedProducts: Array.isArray(viewedProducts)
      ? viewedProducts.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          timestamp: item.timestamp,
        }))
      : [],
    cart: Array.isArray(cart)
      ? cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        }))
      : [],
    currentProduct: currentProduct
      ? {
          id: currentProduct.id,
          name: currentProduct.name,
          category: currentProduct.category,
        }
      : null,
    searchQuery: searchQuery || "",
    selectedCategory: selectedCategory || "",
  };
}



export default function AISidePanel({ isOpen, onClose }) {
  const { startFlow } = useUIGuide();

  // AI flow states
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatId, setAiChatId] = useState(null);

  // STT state
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const aiScrollRef = useRef(null);

  const {
    currentPage,
    viewedProducts,
    cart,
    currentProduct,
    searchQuery,
    selectedCategory,
  } = useUserActivity();

  const robotById = useMemo(
    () => new Map(robots.map((robot) => [robot.id, robot])),
    []
  );

  // Auto-scroll AI messages
  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages, aiLoading]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Stop recording if the panel closes while mic is active
  useEffect(() => {
    if (!isOpen && mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Determine if welcome screen should show
  const showWelcome = aiMessages.length === 0;

  // ─── AI handler ─────────────────────────────────────
  async function submitAiMessage(event, overrideMessage) {
    if (event) event.preventDefault();
    const message = overrideMessage || aiInput.trim();
    if (!message || aiLoading) return;
    setAiMessages((prev) => [...prev, { role: "user", content: message }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const context = buildContextPayload({
        currentPage,
        viewedProducts,
        cart,
        currentProduct,
        searchQuery,
        selectedCategory,
      });
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          language: "auto",
          context,
          chatId: aiChatId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to get AI response.");
      if (data.chatId) setAiChatId(data.chatId);
      const products = Array.isArray(data.productsReferenced)
        ? data.productsReferenced
            .map((id) => robotById.get(Number(id)))
            .filter(Boolean)
        : [];
      setAiMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.response || "I processed your request.",
          toolCalled: data.toolCalled || null,
          proficiency: data.proficiency || null,
          products,
          uiGuide: data.ui_guide || null,
          toolSource: data.toolSource || null,
          ragEnabled: data.ragEnabled || false,
          warnings: Array.isArray(data.warnings) ? data.warnings : [],
        },
      ]);
      // Phase 2.3: If AI response includes ui_guide, trigger the visual flow
      if (data.ui_guide && typeof startFlow === "function") {
        setTimeout(() => startFlow(data.ui_guide), 600);
      }
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: error.message || "AI service is not available right now.",
          toolCalled: "fallback",
          proficiency: null,
          products: [],
          isError: true,
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  // ─── STT via MediaRecorder → Sarvam AI ────────────────────────
  // Root cause of the old "mic starts and stops" bug:
  // Web Speech API streams to Google's servers in real-time. On campus/lab
  // networks those servers are often blocked, causing an immediate onend.
  // This implementation records locally via MediaRecorder and sends the
  // complete audio blob to our own /api/ai/stt endpoint, which calls Sarvam.
  async function toggleListening() {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Microphone access denied:", err.message);
      return;
    }

    // Pick the best audio format the browser supports
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ].find((m) => MediaRecorder.isTypeSupported(m)) || "audio/webm";

    audioChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Always release the mic track immediately after recording stops
      stream.getTracks().forEach((t) => t.stop());

      const audioBlob = new Blob(audioChunksRef.current, {
        type: mimeType.split(";")[0],
      });

      // Ignore recordings too short to contain speech (< ~0.5 s = ~8 KB WebM)
      if (audioBlob.size < 500) return;

      setIsTranscribing(true);
      try {
        const resp = await fetch(`${API_BASE}/api/ai/stt`, {
          method: "POST",
          headers: { "Content-Type": mimeType.split(";")[0] },
          body: audioBlob,
        });
        const data = await resp.json();
        if (!resp.ok || !data.transcript) {
          throw new Error(data.error || "Transcription failed.");
        }
        // Auto-submit the transcript straight into the AI pipeline
        submitAiMessage(null, data.transcript);
      } catch (err) {
        console.error("STT error:", err.message);
      } finally {
        setIsTranscribing(false);
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(250); // collect chunks every 250 ms
    setIsListening(true);
  }

  if (!isOpen) return null;

  return (
    <aside
      className="flex flex-col border-l"
      style={{
        width: "420px",
        minWidth: "420px",
        height: "calc(100vh - 64px)",
        position: "sticky",
        top: "64px",
        background: "oklch(13% 0.025 255 / 0.85)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        borderColor: "oklch(65% 0.28 290 / 0.1)",
        zIndex: 40,
        animation: "sidePanelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: "oklch(65% 0.28 290 / 0.12)",
          background: "linear-gradient(180deg, oklch(16% 0.035 260 / 0.98), oklch(14% 0.028 258 / 0.95))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), oklch(72% 0.22 280))",
            }}
          >
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">
              Nexus Assistant
            </p>
            <p className="text-[11px] leading-tight" style={{ color: "var(--color-neon)" }}>
              AI-Powered · EN · हिंदी · తెలుగు
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear chat */}
          {aiMessages.length > 0 && (
            <button
              onClick={() => { setAiMessages([]); setAiChatId(null); }}
              aria-label="Clear chat history"
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "oklch(80% 0 0 / 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--color-text-muted)";
                e.currentTarget.style.background = "transparent";
              }}
              title="Clear chat"
            >
              <Trash2 size={16} />
            </button>
          )}
          {/* Collapse arrow */}
          <button
            onClick={onClose}
            aria-label="Collapse AI panel"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.background = "oklch(80% 0 0 / 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
            title="Collapse panel"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={aiScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {/* Welcome screen */}
          {showWelcome && (
            <div className="flex flex-col items-center justify-center pt-6 pb-4">
              {/* Hero icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290 / 0.2), oklch(78% 0.16 195 / 0.15))",
                  border: "1px solid oklch(65% 0.28 290 / 0.2)",
                  boxShadow: "0 0 40px oklch(65% 0.28 290 / 0.15)",
                }}
              >
                <Sparkles size={28} style={{ color: "var(--color-accent)" }} />
              </div>

              <h2 className="text-white text-lg font-bold mb-1">Welcome to Nexus AI</h2>
              <p className="text-text-muted text-sm text-center max-w-[280px] mb-1.5 leading-relaxed">
                Your personal robotics advisor. Search, compare, and discover
                the perfect robot — by text or voice.
              </p>
              <p className="text-[11px] text-text-muted mb-6 flex items-center gap-1.5">
                <MessageCircle size={11} />
                Supports English, Hindi & Telugu
              </p>

              {/* Capability cards */}
              <div className="w-full space-y-4 mb-6">
                <div
                  className="rounded-xl p-4 border"
                  style={{ background: "oklch(18% 0.030 255 / 0.6)", borderColor: "oklch(65% 0.28 290 / 0.1)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Compass size={14} style={{ color: "var(--color-accent)" }} />
                    <span className="text-white text-xs font-semibold">UI Guidance</span>
                  </div>
                  <p className="text-text-muted text-xs leading-relaxed">
                    Ask me to navigate — I'll visually guide you through the app
                    with highlighted steps.
                  </p>
                </div>
                <div
                  className="rounded-xl p-4 border"
                  style={{ background: "oklch(18% 0.030 255 / 0.6)", borderColor: "oklch(78% 0.16 195 / 0.1)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={14} style={{ color: "var(--color-neon)" }} />
                    <span className="text-white text-xs font-semibold">Robotics Advisor</span>
                  </div>
                  <p className="text-text-muted text-xs leading-relaxed">
                    Powered by fine-tuned function calling. I understand your
                    context and call the right tools automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {aiMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-br-sm"
                    : "text-text rounded-bl-sm"
                }`}
                style={
                  msg.role === "bot"
                    ? msg.isError
                      ? {
                          background: "oklch(28% 0.12 25 / 0.85)",
                          border: "1px solid oklch(65% 0.22 25 / 0.6)",
                          color: "#fecaca",
                        }
                      : {
                          background: "oklch(18% 0.030 255 / 0.8)",
                          border: "1px solid oklch(80% 0 0 / 0.06)",
                        }
                    : {}
                }
              >
                <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.role === "bot" && msg.toolCalled && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                      {msg.toolCalled}
                    </span>
                    {msg.proficiency && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-neon/20 text-neon border border-neon/30">
                        {msg.proficiency}
                      </span>
                    )}
                    {msg.toolSource && msg.toolSource !== "unknown" && (
                      <span className="text-[11px] px-2 py-1 rounded-full border" style={
                        msg.toolSource === "model"
                          ? { background: "oklch(55% 0.18 145 / 0.2)", color: "#4ade80", borderColor: "oklch(55% 0.18 145 / 0.4)" }
                          : { background: "oklch(75% 0.18 80 / 0.15)", color: "#facc15", borderColor: "oklch(75% 0.18 80 / 0.35)" }
                      }>
                        {msg.toolSource === "model" ? "⚡ Model" : "⚙ Heuristic"}
                      </span>
                    )}
                    {msg.ragEnabled && (
                      <span className="text-[11px] px-2 py-1 rounded-full border" style={{
                        background: "oklch(65% 0.20 270 / 0.15)",
                        color: "#a78bfa",
                        borderColor: "oklch(65% 0.20 270 / 0.35)",
                      }}>
                        ◈ RAG
                      </span>
                    )}
                    {msg.uiGuide && (
                      <span className="text-[11px] px-2 py-1 rounded-full border" style={{
                        background: "oklch(78% 0.18 145 / 0.15)",
                        color: "var(--color-neon-green)",
                        borderColor: "oklch(78% 0.18 145 / 0.3)",
                      }}>
                        ✦ Guiding you…
                      </span>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {msg.role === "bot" && msg.warnings?.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed" style={{
                    background: "oklch(75% 0.18 80 / 0.08)",
                    border: "1px solid oklch(75% 0.18 80 / 0.25)",
                    color: "#fbbf24",
                  }}>
                    <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>{msg.warnings.join(" · ")}</span>
                  </div>
                )}

                {msg.role === "bot" &&
                  Array.isArray(msg.products) &&
                  msg.products.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.products.slice(0, 3).map((product) => (
                        <div
                          key={product.id}
                          className="border rounded-xl p-2.5 flex gap-3 card-shimmer"
                          style={{
                            background: "oklch(14% 0.020 260 / 0.8)",
                            borderColor: "oklch(65% 0.28 290 / 0.08)",
                            transition: "border-color 0.2s, background 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.2)";
                            e.currentTarget.style.background = "oklch(16% 0.025 260 / 0.9)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.08)";
                            e.currentTarget.style.background = "oklch(14% 0.020 260 / 0.8)";
                          }}
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            width={48}
                            height={48}
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-semibold truncate">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {product.category}
                            </p>
                            <p className="text-[11px] text-neon font-medium">
                              ${Number(product.price).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {aiLoading && (
            <div className="flex justify-start">
              <div
                className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm text-text-muted"
                style={{
                  background: "oklch(18% 0.030 255 / 0.8)",
                  border: "1px solid oklch(80% 0 0 / 0.06)",
                }}
              >
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <form
          onSubmit={submitAiMessage}
          className="p-4 border-t"
          style={{ borderColor: "oklch(80% 0 0 / 0.08)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center rounded-xl border"
              style={{
                background: "oklch(14% 0.020 260)",
                borderColor: isListening
                  ? "oklch(65% 0.28 290 / 0.5)"
                  : isTranscribing
                  ? "oklch(78% 0.16 195 / 0.4)"
                  : "oklch(80% 0 0 / 0.08)",
                transition: "border-color 0.3s",
              }}
            >
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={
                  isListening
                    ? "Recording… tap mic to stop"
                    : isTranscribing
                    ? "Transcribing your voice…"
                    : "Ask about robots…"
                }
                disabled={isTranscribing}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none disabled:opacity-50"
              />
              {isListening && (
                <div
                  className="flex items-end gap-[2px] px-2 self-center"
                  style={{ height: "20px" }}
                  aria-hidden="true"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="voice-bar"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              )}
              {isTranscribing && (
                <div className="flex items-center px-2 self-center">
                  <Loader
                    size={13}
                    className="animate-spin"
                    style={{ color: "var(--color-accent)" }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={isTranscribing ? undefined : toggleListening}
                disabled={isTranscribing}
                className={`p-2 rounded-lg mr-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed${
                  isListening ? " mic-listening" : ""
                }`}
                style={{
                  color: isListening
                    ? "oklch(65% 0.28 290)"
                    : "var(--color-text-muted)",
                  background: isListening
                    ? "oklch(65% 0.28 290 / 0.12)"
                    : "none",
                  border: "none",
                }}
                aria-label={
                  isTranscribing
                    ? "Processing voice…"
                    : isListening
                    ? "Stop recording"
                    : "Start voice input"
                }
              >
                {isTranscribing ? (
                  <Loader size={16} className="animate-spin" />
                ) : isListening ? (
                  <MicOff size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={!aiInput.trim() || aiLoading}
              className="p-2.5 rounded-xl text-white disabled:opacity-30 transition-colors cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))",
                border: "none",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
