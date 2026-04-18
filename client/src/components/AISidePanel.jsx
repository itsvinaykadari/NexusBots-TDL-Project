import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  Send,
  Sparkles,
  Mic,
  MicOff,
  ChevronRight,
  Search,
  GitCompareArrows,
  ShoppingCart,
  Package,
  Compass,
  MessageCircle,
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

/* ── Quick action cards for the welcome screen ────────────── */
const QUICK_ACTIONS = [
  {
    icon: Search,
    label: "Find robots",
    prompt: "Show me the best robots for home use",
    color: "oklch(78% 0.16 240)",
  },
  {
    icon: GitCompareArrows,
    label: "Compare",
    prompt: "Compare the top two kitchen robots",
    color: "oklch(78% 0.16 160)",
  },
  {
    icon: ShoppingCart,
    label: "Smart cart",
    prompt: "What's in my cart? Any recommendations?",
    color: "oklch(78% 0.16 80)",
  },
  {
    icon: Package,
    label: "Track order",
    prompt: "Help me check my order status",
    color: "oklch(78% 0.16 310)",
  },
];

export default function AISidePanel({ isOpen, onClose }) {
  const { startFlow } = useUIGuide();

  // AI flow states
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatId, setAiChatId] = useState(null);

  // STT state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

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
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  // ─── STT (Web Speech API) ─────────────────────────────────
  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    // Auto-detect language — no explicit lang setting lets browser use system default
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setAiInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
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

        {/* Collapse arrow */}
        <button
          onClick={onClose}
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

              {/* Quick actions */}
              <p className="text-text-muted text-[11px] font-medium uppercase tracking-wider mb-3 self-start">
                Quick actions
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => submitAiMessage(null, action.prompt)}
                    className="flex items-center gap-2.5 p-3 rounded-xl text-left text-xs font-medium cursor-pointer"
                    style={{
                      background: "oklch(18% 0.025 255 / 0.5)",
                      border: "1px solid oklch(80% 0 0 / 0.08)",
                      color: "#fff",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${action.color.replace(")", " / 0.3)")}`;
                      e.currentTarget.style.background = "oklch(20% 0.030 255 / 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.08)";
                      e.currentTarget.style.background = "oklch(18% 0.025 255 / 0.5)";
                    }}
                  >
                    <action.icon size={16} style={{ color: action.color, flexShrink: 0 }} />
                    {action.label}
                  </button>
                ))}
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
                    ? {
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
                borderColor: "oklch(80% 0 0 / 0.08)",
              }}
            >
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask about robots…"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none"
              />
              <button
                type="button"
                onClick={toggleListening}
                className="p-2 transition-colors cursor-pointer"
                style={{
                  color: isListening
                    ? "oklch(70% 0.20 25)"
                    : "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
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
