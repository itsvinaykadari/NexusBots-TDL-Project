import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Bot, User } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { getContextSummary, currentProduct, cart, viewedProducts } = useUserActivity();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Proactive greeting based on context
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getProactiveGreeting();
      setMessages([{ role: "bot", content: greeting, timestamp: Date.now() }]);
    }
  }, [isOpen]);

  // Proactive message when user views a product
  useEffect(() => {
    if (isOpen && currentProduct && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "bot" && !lastMsg.content.includes(currentProduct.name)) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "bot",
              content: `I see you're looking at the **${currentProduct.name}**! Want me to tell you more about it, compare it with alternatives, or help you decide?`,
              timestamp: Date.now(),
            },
          ]);
        }, 2000);
      }
    }
  }, [currentProduct]);

  function getProactiveGreeting() {
    if (currentProduct) {
      return `Hi! I see you're checking out the **${currentProduct.name}**. I can answer questions about specs, compare it with similar products, or help you decide. What would you like to know?`;
    }
    if (cart.length > 0) {
      return `Welcome back! You have ${cart.length} item${cart.length > 1 ? "s" : ""} in your cart. Need help with anything before checkout?`;
    }
    if (viewedProducts.length > 0) {
      return `Hi again! You've been browsing our ${viewedProducts[viewedProducts.length - 1]?.category} robots. Want a recommendation based on what you've viewed?`;
    }
    return "Hi! I'm the Nexus Bots assistant. I can help you find the right robot, answer product questions, or provide support. What are you looking for?";
  }

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Placeholder response — will be replaced by real AI in Phase 6
    setTimeout(() => {
      const context = getContextSummary();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `[Placeholder] I understood your query. Once the AI agents are connected, I'll route this based on intent classification and provide product-aware responses using RAG.\n\n**Your context:** ${context}`,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    setIsListening(!isListening);
    // Actual speech recognition will be connected in Phase 7
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-accent hover:bg-neon text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center transition-all hover:scale-110"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-secondary rounded-2xl shadow-2xl shadow-black/40 border border-white/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-accent/20 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Nexus Assistant</p>
                <p className="text-green-400 text-[11px]">Online • Context-aware</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="w-6 h-6 bg-accent/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-neon" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-white/5 text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 bg-neon/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={14} className="text-neon" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-accent/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-neon" />
                </div>
                <div className="bg-white/5 px-4 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-neon/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition-colors ${
                  isListening ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any robot..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-accent/50"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2 bg-accent hover:bg-accent/80 disabled:opacity-30 disabled:hover:bg-accent text-white rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
