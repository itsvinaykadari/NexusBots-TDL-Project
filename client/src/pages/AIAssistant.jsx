import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Bot, User, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState("chat"); // chat | voice
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { getContextSummary, setPage } = useUserActivity();

  useEffect(() => {
    setPage("assistant");
    setMessages([
      {
        role: "bot",
        content:
          "Welcome to the Nexus Bots AI Assistant! I can help you find robots, compare products, answer technical questions, or provide support. You can type or use voice — switch modes above.\n\nWhat can I help you with today?",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const context = getContextSummary();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `[Placeholder] Your message will be processed by the intent classifier → RAG retrieval → specialized agent pipeline once connected.\n\n**Detected context:** ${context}`,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  }

  function toggleVoice() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    setIsListening((prev) => !prev);
    if (!isListening) {
      setVoiceTranscript("Listening... (Speech API will be connected in Phase 7)");
      setTimeout(() => {
        setVoiceTranscript("");
        setIsListening(false);
      }, 3000);
    }
  }

  function toggleTTS() {
    setIsSpeaking(!isSpeaking);
    // Text-to-speech toggle — connected in Phase 7
  }

  const quickActions = [
    { label: "Compare robots", query: "Compare the top robots in Home Cleaner category" },
    { label: "Best for kids", query: "Which robot is best for a 6 year old?" },
    { label: "Budget options", query: "Show me robots under $500" },
    { label: "Industrial cobots", query: "Tell me about collaborative industrial robots" },
  ];

  return (
    <div className="min-h-screen bg-primary pt-8 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-neon" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Assistant</h1>
          <p className="text-slate-400">
            Chat or speak — powered by intent classification, RAG, and specialized agents
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-secondary rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setMode("chat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "chat" ? "bg-accent text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "voice" ? "bg-accent text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Mic size={16} />
              Voice
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-secondary rounded-2xl border border-white/10 overflow-hidden">
          {/* Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && (
                  <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={16} className="text-neon" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-white/5 text-slate-200 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
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

          {/* Voice mode indicator */}
          {mode === "voice" && (
            <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleVoice}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30"
                      : "bg-accent/20 text-neon hover:bg-accent/30"
                  }`}
                >
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <button
                  onClick={toggleTTS}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isSpeaking ? "bg-neon/20 text-neon" : "bg-white/5 text-slate-400 hover:text-white"
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

          {/* Text input */}
          <div className="p-4 border-t border-white/10">
            {/* Quick actions */}
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
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoice}
                className={`p-2.5 rounded-xl transition-colors ${
                  isListening ? "bg-red-500/20 text-red-400" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "voice" ? "Or type your message here..." : "Ask about any robot..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-accent/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 bg-accent hover:bg-accent/80 disabled:opacity-30 text-white rounded-xl transition-colors"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-secondary rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-semibold mb-1 text-sm">Intent Classification</h3>
            <p className="text-slate-400 text-xs">
              Your queries are classified by a fine-tuned DistilBERT model into 6 intent classes to route to the right agent.
            </p>
          </div>
          <div className="bg-secondary rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-semibold mb-1 text-sm">RAG Retrieval</h3>
            <p className="text-slate-400 text-xs">
              Relevant product information is retrieved using sentence-transformer embeddings before generating a response.
            </p>
          </div>
          <div className="bg-secondary rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-semibold mb-1 text-sm">Multilingual Support</h3>
            <p className="text-slate-400 text-xs">
              Ask in English, Hindi, or Telugu — the system classifies intent across all three languages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
