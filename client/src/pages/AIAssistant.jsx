import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Mic, MicOff, Bot, User, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import robots from "../data/robots";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LANGUAGE_OPTIONS = [
    { value: "en", label: "EN" },
    { value: "hi", label: "हिंदी" },
    { value: "te", label: "తెలుగు" },
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

export default function AIAssistant() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [mode, setMode] = useState("chat"); // chat | voice
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [language, setLanguage] = useState("en");
    const [chatId, setChatId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const {
        setPage,
        currentPage,
        viewedProducts,
        cart,
        currentProduct,
        searchQuery,
        selectedCategory,
    } = useUserActivity();

    const robotById = useMemo(() => new Map(robots.map((robot) => [robot.id, robot])), []);

    useEffect(() => {
        setPage("assistant");
        setMessages([
            {
                role: "bot",
                content:
                    "Welcome to Nexus Bots AI Assistant. I can search robots, compare products, recommend options, and help with navigation using your current app context.",
                timestamp: Date.now(),
                toolCalled: null,
                proficiency: null,
                products: [],
            },
        ]);
    }, [setPage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function sendToAI(messageText) {
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
                message: messageText,
                language,
                context,
                chatId,
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to get AI response.");
        }

        if (data.chatId) {
            setChatId(data.chatId);
        }

        const products = Array.isArray(data.productsReferenced)
            ? data.productsReferenced
                .map((id) => robotById.get(Number(id)))
                .filter(Boolean)
            : [];

        setMessages((prev) => [
            ...prev,
            {
                role: "bot",
                content: data.response || "I processed your request.",
                timestamp: Date.now(),
                toolCalled: data.toolCalled || null,
                proficiency: data.proficiency || null,
                products,
            },
        ]);
    }

    async function handleSend() {
        const messageText = input.trim();
        if (!messageText || isTyping) return;

        setMessages((prev) => [...prev, { role: "user", content: messageText, timestamp: Date.now() }]);
        setInput("");
        setIsTyping(true);

        try {
            await sendToAI(messageText);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    content: error.message || "Unable to process your request right now.",
                    timestamp: Date.now(),
                    toolCalled: "fallback",
                    proficiency: null,
                    products: [],
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    }

    function toggleVoice() {
        if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
            alert("Speech recognition is not supported in this browser. Please use Chrome.");
            return;
        }

        setIsListening((prev) => !prev);
        if (!isListening) {
            setVoiceTranscript("Listening... (voice capture integration remains optional)");
            setTimeout(() => {
                setVoiceTranscript("");
                setIsListening(false);
            }, 3000);
        }
    }

    function toggleTTS() {
        setIsSpeaking((prev) => !prev);
    }

    const quickActions = [
        { label: "Compare robots", query: "Compare robot 5 and robot 6 for maintenance and battery" },
        { label: "Best humanoid", query: "Recommend a humanoid robot for kids under 500" },
        { label: "Budget options", query: "Show me good robots under 800 in Home Cleaner" },
        { label: "Drone options", query: "Compare drone robots for monitoring" },
    ];

    return (
        <div className="min-h-screen bg-primary pt-8 pb-16">
            <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bot size={32} className="text-neon" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">AI Assistant</h1>
                    <p className="text-slate-400">
                        Live tool-calling assistant with context-aware recommendations and multilingual responses
                    </p>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
                    <div className="bg-secondary rounded-xl p-1 flex gap-1">
                        <button
                            onClick={() => setMode("chat")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "chat" ? "bg-accent text-white" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            <MessageCircle size={16} />
                            Chat
                        </button>
                        <button
                            onClick={() => setMode("voice")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "voice" ? "bg-accent text-white" : "text-slate-400 hover:text-white"
                                }`}
                        >
                            <Mic size={16} />
                            Voice
                        </button>
                    </div>

                    <select
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        className="bg-secondary border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none"
                    >
                        {LANGUAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="bg-secondary rounded-2xl border border-white/10 overflow-hidden">
                    <div className="h-[420px] overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "bot" && (
                                    <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot size={16} className="text-neon" />
                                    </div>
                                )}

                                <div
                                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                            ? "bg-accent text-white rounded-br-sm"
                                            : "bg-white/5 text-slate-200 rounded-bl-sm"
                                        }`}
                                >
                                    <p>{msg.content}</p>

                                    {msg.role === "bot" && msg.toolCalled && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="text-[11px] px-2 py-1 rounded-full bg-accent/25 text-accent border border-accent/30">
                                                Tool: {msg.toolCalled}
                                            </span>
                                            {msg.proficiency && (
                                                <span className="text-[11px] px-2 py-1 rounded-full bg-neon/20 text-neon border border-neon/30">
                                                    {msg.proficiency}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {msg.role === "bot" && Array.isArray(msg.products) && msg.products.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {msg.products.slice(0, 3).map((product) => (
                                                <div key={product.id} className="bg-primary/80 border border-white/10 rounded-xl p-2.5 flex gap-2">
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-white text-xs font-semibold truncate">{product.name}</p>
                                                        <p className="text-slate-400 text-[11px]">{product.category}</p>
                                                        <p className="text-neon text-[11px] font-medium">${Number(product.price).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-8 h-8 bg-neon/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                        <User size={16} className="text-neon" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Bot size={16} className="text-neon" />
                                </div>
                                <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {mode === "voice" && (
                        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={toggleVoice}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening
                                            ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                                            : "bg-accent/20 text-neon hover:bg-accent/30"
                                        }`}
                                >
                                    {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                                </button>
                                <button
                                    onClick={toggleTTS}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSpeaking ? "bg-neon/20 text-neon" : "bg-white/5 text-slate-400 hover:text-white"
                                        }`}
                                >
                                    {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                </button>
                            </div>

                            {voiceTranscript && (
                                <p className="text-center text-sm text-slate-400 mt-2 italic">{voiceTranscript}</p>
                            )}

                            {!isListening && !voiceTranscript && (
                                <p className="text-center text-xs text-slate-500 mt-2">Tap the mic to start speaking</p>
                            )}
                        </div>
                    )}

                    <div className="p-4 border-t border-white/10">
                        {messages.length <= 1 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {quickActions.map((action) => (
                                    <button
                                        key={action.label}
                                        onClick={() => {
                                            setInput(action.query);
                                            setTimeout(() => inputRef.current?.focus(), 0);
                                        }}
                                        className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-colors"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleSend();
                            }}
                            className="flex items-center gap-2"
                        >
                            <button
                                type="button"
                                onClick={toggleVoice}
                                className={`p-2.5 rounded-xl transition-colors ${isListening ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                placeholder={mode === "voice" ? "Or type your message here..." : "Ask about any robot..."}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-accent/50 transition-colors"
                            />

                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="p-2.5 bg-accent hover:bg-accent/80 disabled:opacity-30 text-white rounded-xl transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
