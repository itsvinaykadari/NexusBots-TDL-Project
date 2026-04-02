import { useEffect } from "react";
import HeroSection from "../components/HeroSection";
import FeaturedRobots from "../components/FeaturedRobots";
import { MessageCircle, Mic, Mail, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserActivity } from "../context/UserActivityContext";

function AIFeatureCard({ icon, title, description, link, color }) {
  return (
    <Link
      to={link}
      className="group p-6 bg-surface rounded-2xl border border-white/5 hover:border-neon/20 transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.05)]"
    >
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-neon transition-colors">
        {title}
      </h3>
      <p className="text-slate-400 text-sm">{description}</p>
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
          <p className="text-slate-400 max-w-2xl mx-auto">
            Interact with our intelligent agents through multiple channels. Get product recommendations,
            support, and sales guidance powered by LangChain multi-agent orchestration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
            icon={<Mail size={24} className="text-neon-green" />}
            title="Email Support"
            description="Send detailed inquiries and get comprehensive AI-generated responses via email."
            link="/support"
            color="bg-neon-green/10"
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
              { value: "22", label: "Robot Products" },
              { value: "6", label: "AI Agents" },
              { value: "3", label: "Interaction Channels" },
              { value: "6", label: "Product Categories" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-3xl font-bold text-neon mb-1">{value}</div>
                <div className="text-slate-400 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
