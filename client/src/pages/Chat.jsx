import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

const INITIAL_MESSAGES = [
  {
    role: "bot",
    content:
      "Hello! I'm the NexusBots AI Assistant. I can help you find the perfect robot, answer product questions, or guide you through your purchase. What are you looking for today?",
  },
];

export default function Chat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response (will be replaced with backend API)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "Thanks for your question! This is a placeholder response. Once the backend and LangChain agents are connected, I'll be able to provide real product recommendations, answer detailed questions, and help guide your purchase decisions.",
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
          <Sparkles size={22} className="text-accent" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Chat Assistant</h1>
          <p className="text-sm text-slate-400">
            Powered by LangChain multi-agent system
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-neon-green/10 rounded-full border border-neon-green/20">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
          <span className="text-neon-green text-xs font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === "bot"
                  ? "bg-accent/20 text-accent"
                  : "bg-neon/20 text-neon"
              }`}
            >
              {msg.role === "bot" ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "bot"
                  ? "bg-surface text-slate-200 rounded-tl-sm"
                  : "bg-accent text-white rounded-tr-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/20 text-accent">
              <Bot size={16} />
            </div>
            <div className="bg-surface px-4 py-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          "Recommend an industrial robot",
          "What's best for education?",
          "Compare welding robots",
          "Cheapest service robot?",
        ].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="px-3 py-1.5 bg-surface text-slate-400 text-xs rounded-full border border-white/5 hover:border-accent/30 hover:text-accent transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about robots, get recommendations..."
          className="flex-1 px-4 py-3 bg-surface border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-4 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
