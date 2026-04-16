import { useMemo, useState } from "react";
import { MessageCircle, X, Bot, CheckCircle2, PhoneCall, Send } from "lucide-react";
import { getOrCreateUserId } from "../utils/user";
import { useUserActivity } from "../context/UserActivityContext";
import robots from "../data/robots";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LANGUAGE_OPTIONS = [
    { value: "en", label: "EN" },
    { value: "hi", label: "हिंदी" },
    { value: "te", label: "తెలుగు" },
];

const FAQS = [
    {
        key: "where-order",
        question: "Where is my order?",
        answer:
            "You can track your order from Order History using your User ID. If you share User ID and Order ID, we can validate and show the latest status.",
    },
    {
        key: "cancel-order",
        question: "How do I cancel my order?",
        answer:
            "If the order status is Processing, cancellation is usually possible. Please share your order details in support and we will help initiate cancellation.",
    },
    {
        key: "damaged-product",
        question: "I received a damaged product",
        answer:
            "Sorry about that. Please keep your Order ID ready and upload photos when asked. We will prioritize replacement or refund based on inspection.",
    },
    {
        key: "refund",
        question: "I want a refund",
        answer:
            "Refunds are available for eligible cases such as damaged delivery or failed fulfillment. After verification, refund is processed to original payment method.",
    },
    {
        key: "delivery-time",
        question: "How long does delivery take?",
        answer:
            "Typical delivery is 2-7 days depending on your location and item availability. You can see estimated delivery on your order details.",
    },
];

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

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState("support"); // support | ai

    // Existing support flow states
    const [messages, setMessages] = useState([]);
    const [activeFaq, setActiveFaq] = useState(null);
    const [showResolution, setShowResolution] = useState(false);
    const [showCallbackForm, setShowCallbackForm] = useState(false);
    const [callbackStatus, setCallbackStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const [callbackForm, setCallbackForm] = useState({
        userId: getOrCreateUserId(),
        orderId: "",
        issueDescription: "",
    });

    // New AI flow states
    const [aiMessages, setAiMessages] = useState([
        {
            role: "bot",
            content:
                "Hi! I can help you search robots, compare products, and recommend options using your current app context.",
            toolCalled: null,
            proficiency: null,
            products: [],
        },
    ]);
    const [aiInput, setAiInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiLanguage, setAiLanguage] = useState("en");
    const [aiChatId, setAiChatId] = useState(null);

    const {
        currentPage,
        viewedProducts,
        cart,
        currentProduct,
        searchQuery,
        selectedCategory,
    } = useUserActivity();

    const robotById = useMemo(() => new Map(robots.map((robot) => [robot.id, robot])), []);

    const visibleMessages = useMemo(() => {
        if (messages.length > 0) return messages;
        return [
            {
                role: "bot",
                content:
                    "Hi! I can quickly help with common issues. Please choose one of the questions below.",
            },
        ];
    }, [messages]);

    function handleFaqClick(faq) {
        setActiveFaq(faq);
        setMessages((prev) => [
            ...prev,
            { role: "user", content: faq.question },
            { role: "bot", content: `${faq.answer}\n\nDid this resolve your issue?` },
        ]);
        setShowResolution(true);
        setShowCallbackForm(false);
        setCallbackStatus("");
    }

    function handleResolvedYes() {
        setMessages((prev) => [
            ...prev,
            { role: "user", content: "Yes" },
            { role: "bot", content: "Great! Glad I could help. Reach out anytime." },
        ]);
        setShowResolution(false);
        setShowCallbackForm(false);
    }

    function handleResolvedNo() {
        setMessages((prev) => [
            ...prev,
            { role: "user", content: "No" },
            {
                role: "bot",
                content:
                    "No worries! Our support agent will call you shortly. Please submit a callback request below.",
            },
        ]);
        setShowResolution(false);
        setShowCallbackForm(true);
        setCallbackForm((prev) => ({
            ...prev,
            issueDescription: activeFaq?.question || prev.issueDescription,
        }));
    }

    async function submitCallbackRequest(event) {
        event.preventDefault();
        if (!callbackForm.userId.trim() || !callbackForm.issueDescription.trim()) {
            setCallbackStatus("Please provide user_id and issue description.");
            return;
        }

        setLoading(true);
        setCallbackStatus("");
        try {
            const response = await fetch(`${API_BASE}/api/chats/support/request-callback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: callbackForm.userId.trim(),
                    order_id: callbackForm.orderId.trim() || null,
                    issue_description: callbackForm.issueDescription.trim(),
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to request callback.");
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    content: "Callback request saved successfully. Our support agent will call you shortly.",
                },
            ]);
            setCallbackStatus("Callback requested successfully.");
            setShowCallbackForm(false);
        } catch (error) {
            setCallbackStatus(error.message || "Failed to request callback.");
        } finally {
            setLoading(false);
        }
    }

    async function submitAiMessage(event) {
        event.preventDefault();
        const message = aiInput.trim();
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
                    language: aiLanguage,
                    context,
                    chatId: aiChatId,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to get AI response.");
            }

            if (data.chatId) {
                setAiChatId(data.chatId);
            }

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
                },
            ]);
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

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent hover:bg-neon text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all hover:scale-110"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[390px] max-w-[95vw] h-[560px] bg-secondary rounded-2xl shadow-2xl shadow-black/40 border border-white/10 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-accent/20 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                                <Bot size={18} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">Nexus Assistant</p>
                                <p className="text-green-400 text-[11px]">
                                    {mode === "support" ? "FAQ + Callback" : "AI Tool Calling"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-white/10 rounded-lg p-1">
                                <button
                                    onClick={() => setMode("support")}
                                    className={`text-xs px-2 py-1 rounded-md ${mode === "support" ? "bg-white/20 text-white" : "text-slate-300"
                                        }`}
                                >
                                    Support
                                </button>
                                <button
                                    onClick={() => setMode("ai")}
                                    className={`text-xs px-2 py-1 rounded-md ${mode === "ai" ? "bg-white/20 text-white" : "text-slate-300"
                                        }`}
                                >
                                    AI
                                </button>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {mode === "support" && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {visibleMessages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${msg.role === "user"
                                                ? "bg-accent text-white rounded-br-sm"
                                                : "bg-white/5 text-slate-200 rounded-bl-sm"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            <div className="space-y-2">
                                <p className="text-slate-400 text-xs">Common questions</p>
                                {FAQS.map((faq) => (
                                    <button
                                        key={faq.key}
                                        onClick={() => handleFaqClick(faq)}
                                        className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 px-3 py-2 rounded-lg text-sm"
                                    >
                                        {faq.question}
                                    </button>
                                ))}
                            </div>

                            {showResolution && (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                                    <p className="text-slate-200 text-sm mb-2">Did this resolve your issue?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleResolvedYes}
                                            className="flex-1 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green rounded-lg py-2 text-sm"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={handleResolvedNo}
                                            className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg py-2 text-sm"
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            )}

                            {showCallbackForm && (
                                <form
                                    onSubmit={submitCallbackRequest}
                                    className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2"
                                >
                                    <p className="text-white text-sm font-medium flex items-center gap-2">
                                        <PhoneCall size={14} /> Request a Call Back
                                    </p>

                                    <input
                                        value={callbackForm.userId}
                                        onChange={(event) =>
                                            setCallbackForm((prev) => ({ ...prev, userId: event.target.value }))
                                        }
                                        placeholder="User ID"
                                        className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />

                                    <input
                                        value={callbackForm.orderId}
                                        onChange={(event) =>
                                            setCallbackForm((prev) => ({ ...prev, orderId: event.target.value }))
                                        }
                                        placeholder="Order ID (optional)"
                                        className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />

                                    <textarea
                                        value={callbackForm.issueDescription}
                                        onChange={(event) =>
                                            setCallbackForm((prev) => ({ ...prev, issueDescription: event.target.value }))
                                        }
                                        placeholder="Issue description"
                                        rows={3}
                                        className="w-full bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-white rounded-lg py-2 text-sm"
                                    >
                                        {loading ? "Submitting..." : "Request a Call Back"}
                                    </button>

                                    {callbackStatus && (
                                        <p className="text-xs text-slate-300 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> {callbackStatus}
                                        </p>
                                    )}
                                </form>
                            )}
                        </div>
                    )}

                    {mode === "ai" && (
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {aiMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${msg.role === "user"
                                                    ? "bg-accent text-white rounded-br-sm"
                                                    : "bg-white/5 text-slate-200 rounded-bl-sm"
                                                }`}
                                        >
                                            <p>{msg.content}</p>

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
                                                </div>
                                            )}

                                            {msg.role === "bot" && Array.isArray(msg.products) && msg.products.length > 0 && (
                                                <div className="mt-2 space-y-2">
                                                    {msg.products.slice(0, 2).map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="bg-primary/80 border border-white/10 rounded-lg p-2 flex gap-2"
                                                        >
                                                            <img
                                                                src={product.image}
                                                                alt={product.name}
                                                                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-xs text-white font-semibold truncate">{product.name}</p>
                                                                <p className="text-[11px] text-slate-400">{product.category}</p>
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
                                        <div className="max-w-[85%] px-3 py-2 rounded-xl bg-white/5 text-slate-300 text-sm">
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={submitAiMessage} className="p-3 border-t border-white/10 space-y-2">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={aiLanguage}
                                        onChange={(event) => setAiLanguage(event.target.value)}
                                        className="bg-primary border border-white/10 text-white text-xs rounded-lg px-2 py-2 outline-none"
                                    >
                                        {LANGUAGE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        value={aiInput}
                                        onChange={(event) => setAiInput(event.target.value)}
                                        placeholder="Ask about robots..."
                                        className="flex-1 bg-primary border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!aiInput.trim() || aiLoading}
                                        className="p-2 rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-50 text-white"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
