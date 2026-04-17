import { Link } from "react-router-dom";
import { ArrowRight, Bot, MessageCircle, Mic } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute top-40 right-1/4 w-72 h-72 bg-neon/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-sm font-medium mb-8">
            <Bot size={16} />
            AI-Powered Robotics Commerce
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            The Future of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon to-accent">
              Robotics
            </span>{" "}
            is Here
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto">
            Browse cutting-edge robots and get AI-powered assistance through one unified assistant across chat and voice.
            Your intelligent robotics shopping experience starts here.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to="/catalog"
              className="flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-all hover:glow-accent"
            >
              Explore Catalog
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/assistant"
              className="flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 transition-all"
            >
              <MessageCircle size={18} />
              Talk to AI Assistant
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-3 p-6 bg-surface/50 rounded-2xl border border-white/5">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Bot size={24} className="text-accent" />
              </div>
              <h3 className="text-white font-semibold">12 Robots</h3>
              <p className="text-text-muted text-sm">Kitchen, home cleaner, drone, and humanoid categories</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 bg-surface/50 rounded-2xl border border-white/5">
              <div className="w-12 h-12 bg-neon/10 rounded-xl flex items-center justify-center">
                <MessageCircle size={24} className="text-neon" />
              </div>
              <h3 className="text-white font-semibold">AI Chat & Voice</h3>
              <p className="text-text-muted text-sm">Get instant help through chat or voice interaction</p>
            </div>
            <div className="flex flex-col items-center gap-3 p-6 bg-surface/50 rounded-2xl border border-white/5">
              <div className="w-12 h-12 bg-neon-green/10 rounded-xl flex items-center justify-center">
                <Mic size={24} className="text-neon-green" />
              </div>
              <h3 className="text-white font-semibold">Multi-Agent AI</h3>
              <p className="text-text-muted text-sm">LangChain-powered agents for sales, support & more</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
