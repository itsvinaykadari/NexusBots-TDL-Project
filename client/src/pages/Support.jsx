import { useState, useEffect } from "react";
import { Mail, Send, CheckCircle } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";

export default function Support() {
  const { setPage } = useUserActivity();
  useEffect(() => setPage("support"), []);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder - will connect to backend email agent
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm({ name: "", email: "", subject: "", category: "general", message: "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">Email Support</h1>
        <p className="text-slate-400">
          Send us a detailed inquiry and our AI email agent will compose
          a comprehensive response for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                  placeholder="Brief subject"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent/50 cursor-pointer"
                >
                  <option value="general">General Inquiry</option>
                  <option value="product">Product Question</option>
                  <option value="purchase">Purchase Help</option>
                  <option value="technical">Technical Support</option>
                  <option value="returns">Returns & Issues</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 resize-none"
                placeholder="Describe your question or issue in detail..."
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {submitted ? (
                <>
                  <CheckCircle size={18} />
                  Sent Successfully!
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send to AI Support
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface rounded-xl p-6 border border-white/5">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
              <Mail size={22} className="text-accent" />
            </div>
            <h3 className="text-white font-semibold mb-2">AI Email Agent</h3>
            <p className="text-slate-400 text-sm">
              Your message will be processed by our AI support agent which drafts
              comprehensive, context-aware responses using LangChain orchestration.
            </p>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-white/5">
            <h3 className="text-white font-semibold mb-3">Response Time</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">AI Response</span>
                <span className="text-neon-green font-medium">Instant</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Human Follow-up</span>
                <span className="text-slate-300">24-48 hours</span>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-white/5">
            <h3 className="text-white font-semibold mb-3">Other Channels</h3>
            <p className="text-slate-400 text-sm">
              Need faster help? Try our{" "}
              <a href="/assistant" className="text-accent hover:text-neon">AI Assistant</a>
              for instant responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
