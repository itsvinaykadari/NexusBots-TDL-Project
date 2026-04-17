import { useEffect } from "react";
import HeroSection from "../components/HeroSection";
import FeaturedRobots from "../components/FeaturedRobots";
import { MessageCircle, Mic, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserActivity } from "../context/UserActivityContext";

function AIFeatureCard({ icon, title, description, link, color }) {
  return (
    <Link
      to={link}
      className="group p-6 bg-surface rounded-2xl border border-white/5 hover:border-neon/20 transition-all hover:glow-accent"
    >
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-neon transition-colors">
        {title}
      </h3>
      <p className="text-text-muted text-sm">{description}</p>
    </Link>
  );
}

export default function Home() {
  const { setPage } = useUserActivity();
  useEffect(() => setPage("home"), []);

  return (
    <div>
      <HeroSection />

      <FeaturedRobots />

      {/* AI Interaction Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">AI-Powered Assistance</h2>
          <p className="text-text-muted max-w-2xl mx-auto">
            Get product recommendations and support with one unified AI assistant for both
            chat and voice interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AIFeatureCard
            icon={<MessageCircle size={24} className="text-accent" />}
            title="AI Assistant"
            description="Chat or use voice to ask questions, get recommendations, and receive instant AI-powered support."
            link="/assistant"
            color="bg-accent/10"
          />
          <AIFeatureCard
            icon={<Mic size={24} className="text-neon" />}
            title="Voice Interaction"
            description="Talk naturally with our voice AI for a hands-free shopping and support experience."
            link="/assistant"
            color="bg-neon/10"
          />
          <AIFeatureCard
            icon={<Cpu size={24} className="text-purple-400" />}
            title="Multi-Agent System"
            description="Behind the scenes, specialized AI agents collaborate to give you the best experience."
            link="/catalog"
            color="bg-purple-400/10"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/5 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "12", label: "Robot Products" },
              { value: "6", label: "AI Agents" },
              { value: "2", label: "Interaction Channels" },
              { value: "4", label: "Product Categories" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-neon mb-1">{value}</div>
                <div className="text-text-muted text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
