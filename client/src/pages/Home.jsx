import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, MessageCircle, Mic, Eye, Brain, Zap, Shield, ChefHat, SprayCan, Plane, PersonStanding } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import robots from "../data/robots";
import ParticleNetwork from "../components/ParticleNetwork";

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(2.5rem)",
        transition: `opacity 0.7s var(--ease-out-expo) ${delay}ms, transform 0.7s var(--ease-out-expo) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Category data ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: "Kitchen",
    tagline: "Smart assistants for the modern kitchen",
    desc: "Voice-controlled companions that manage recipes, timers, and smart appliances — so you can focus on cooking.",
    image: "https://firexcore.com/wp-content/uploads/2025/01/Key-Features-of-Samsung-Ballie-AI-Robot.webp",
    Icon: ChefHat,
    accent: "oklch(78% 0.18 80)",
  },
  {
    name: "Home Cleaner",
    tagline: "Autonomous cleaning, redefined",
    desc: "From floors to windows, these robots keep your home spotless with zero effort.",
    image: "https://m.media-amazon.com/images/I/71aHkBTp0OL._AC_UF1000,1000_QL80_.jpg",
    Icon: SprayCan,
    accent: "oklch(78% 0.16 160)",
  },
  {
    name: "Drone",
    tagline: "Aerial intelligence at your command",
    desc: "Indoor patrol, thermal inspection, and surface cleaning — drones that work so you don't have to.",
    image: "https://www-cdn.djiits.com/dps/d90267d0c1579a191284086d26cd8156.jpg",
    Icon: Plane,
    accent: "oklch(78% 0.16 240)",
  },
  {
    name: "Humanoid",
    tagline: "Companions that learn alongside you",
    desc: "Interactive robots for education, coding, and play — building the next generation of thinkers.",
    image: "https://knowledge-hub.com/wp-content/uploads/2019/12/aa.jpg",
    Icon: PersonStanding,
    accent: "oklch(78% 0.16 310)",
  },
];

// AI capabilities showcase
const AI_CAPABILITIES = [
  {
    icon: Brain,
    title: "Intelligent Recommendations",
    desc: "Our AI understands your needs and recommends the perfect robot based on your lifestyle.",
  },
  {
    icon: MessageCircle,
    title: "Multilingual Chat",
    desc: "Ask questions in English, Hindi, or Telugu — our assistant speaks your language.",
  },
  {
    icon: Mic,
    title: "Voice Interaction",
    desc: "Speak naturally. Our voice AI listens and responds with contextual guidance.",
  },
  {
    icon: Eye,
    title: "Visual Guidance",
    desc: "The AI highlights exactly where to click — guiding you step by step through the interface.",
  },
  {
    icon: Zap,
    title: "Smart Comparisons",
    desc: "Compare specs, prices, and features across robots with AI-powered analysis.",
  },
  {
    icon: Shield,
    title: "Expert Knowledge",
    desc: "Fine-tuned on robotics domain data for accurate, trustworthy product advice.",
  },
];

// Stats removed per design iteration

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { setPage } = useUserActivity();
  useEffect(() => setPage("home"), []);

  return (
    <div className="overflow-x-hidden bg-grid">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden">
        {/* Particle network background */}
        <ParticleNetwork />

        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute -top-40 -left-40 w-[800px] h-[800px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.4), transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full opacity-12"
          style={{ background: "radial-gradient(circle, oklch(78% 0.16 195 / 0.35), transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, oklch(78% 0.18 145 / 0.3), transparent 65%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center py-32">
          {/* Badge */}
          <Reveal>
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border mb-10"
              style={{
                borderColor: "oklch(65% 0.28 290 / 0.3)",
                background: "oklch(65% 0.28 290 / 0.06)",
              }}
            >
              <Sparkles size={14} style={{ color: "var(--color-accent)" }} />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--color-accent)" }}>
                AI-Powered Robotics Platform
              </span>
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={80}>
            <h1
              className="font-extrabold text-white leading-[0.92] tracking-tight mb-8 mx-auto"
              style={{ fontSize: "var(--text-hero)", maxWidth: "900px" }}
            >
              The future of
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195), oklch(78% 0.18 145))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                robotics
              </span>
              {" "}is here.
            </h1>
          </Reveal>

          {/* Subtitle */}
          <Reveal delay={160}>
            <p
              className="text-text-muted leading-relaxed mb-12 mx-auto"
              style={{ fontSize: "clamp(1.05rem, 0.5vw + 0.9rem, 1.25rem)", maxWidth: "640px" }}
            >
              Discover our curated collection of premium robots across four categories.
              Let our AI assistant guide you to the perfect match — through conversation, not catalogs.
            </p>
          </Reveal>

          {/* CTAs */}
          <Reveal delay={240}>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-white text-base cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))",
                  boxShadow: "0 0 40px oklch(65% 0.28 290 / 0.3), inset 0 1px 0 oklch(80% 0.2 290 / 0.2)",
                  transition: "box-shadow 0.3s var(--ease-out-expo), transform 0.2s var(--ease-out-expo)",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 60px oklch(65% 0.28 290 / 0.5), inset 0 1px 0 oklch(80% 0.2 290 / 0.3)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 40px oklch(65% 0.28 290 / 0.3), inset 0 1px 0 oklch(80% 0.2 290 / 0.2)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Sparkles size={18} />
                Talk to AI Assistant
              </button>
              <span className="text-text-muted text-sm hidden sm:block">
                or explore categories from the menu above
              </span>
            </div>
          </Reveal>

        </div>

        {/* Scroll cue */}
        {/* <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[10px] tracking-widest uppercase text-text-muted">Discover</span>
          <div className="w-px h-8 bg-gradient-to-b from-text-muted to-transparent" />
        </div> */}
      </section>

      {/* ── CATEGORY WORLDS ────────────────────────────────────────────── */}
      <section style={{ paddingBlock: "var(--space-section)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-12">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">Explore</p>
              <h2 className="font-bold text-white" style={{ fontSize: "var(--text-heading)" }}>
                Four worlds of robotics.
              </h2>
              <p className="text-text-muted mt-3 max-w-lg mx-auto leading-relaxed">
                Each category represents a different frontier. Click below to dive in.
              </p>
            </div>
          </Reveal>

          {/* Category cards — large editorial tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat, i) => {
              const count = robots.filter((r) => r.category === cat.name).length;
              return (
                <Reveal key={cat.name} delay={i * 100}>
                  <Link
                    to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                    className="group relative overflow-hidden rounded-3xl border border-white/6 block"
                    style={{
                      minHeight: "340px",
                      transition: "transform 0.5s var(--ease-out-expo), box-shadow 0.5s var(--ease-out-expo)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.01)";
                      e.currentTarget.style.boxShadow = `0 24px 80px oklch(65% 0.28 290 / 0.15)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Background image */}
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105"
                      style={{
                        opacity: 0.35,
                        transition: "transform 0.7s var(--ease-out-expo), opacity 0.5s var(--ease-out-expo)",
                      }}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 group-hover:opacity-90"
                      style={{
                        background: "linear-gradient(160deg, oklch(12% 0.025 255 / 0.85) 30%, oklch(12% 0.025 255 / 0.5) 100%)",
                        transition: "opacity 0.5s",
                      }}
                    />

                    {/* Content */}
                    <div className="relative h-full flex flex-col justify-end p-8 lg:p-10">
                      {(() => {
                        const bgColor = cat.accent.replace(")", " / 0.15)");
                        const borderColor = cat.accent.replace(")", " / 0.25)");
                        return (
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                            style={{
                              background: bgColor,
                              border: "1px solid " + borderColor,
                            }}
                          >
                            <cat.Icon size={22} style={{ color: cat.accent }} />
                          </div>
                        );
                      })()}
                      <div className="flex items-center gap-3 mb-2">
                        <h3
                          className="font-bold text-white leading-tight"
                          style={{ fontSize: "clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)" }}
                        >
                          {cat.name}
                        </h3>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            background: "oklch(65% 0.28 290 / 0.15)",
                            color: "var(--color-accent)",
                            border: "1px solid oklch(65% 0.28 290 / 0.2)",
                          }}
                        >
                          {count} robots
                        </span>
                      </div>
                      <p className="text-text-muted text-sm leading-relaxed max-w-md mb-5">
                        {cat.desc}
                      </p>
                      <span
                        className="inline-flex items-center gap-2 text-sm font-semibold text-accent group-hover:gap-3"
                        style={{ transition: "gap 0.3s var(--ease-out-expo)" }}
                      >
                        Explore {cat.name} <ArrowRight size={15} />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI ASSISTANT SHOWCASE ──────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ paddingBlock: "var(--space-section)" }}
      >
        {/* Subtle glow */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, oklch(65% 0.28 290 / 0.4), transparent 60%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6"
                style={{
                  borderColor: "oklch(78% 0.16 195 / 0.25)",
                  background: "oklch(78% 0.16 195 / 0.06)",
                }}
              >
                <Sparkles size={13} style={{ color: "var(--color-neon)" }} />
                <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--color-neon)" }}>
                  Powered by Fine-Tuned AI
                </span>
              </div>
              <h2 className="font-bold text-white" style={{ fontSize: "var(--text-heading)" }}>
                Your personal robotics advisor.
              </h2>
              <p className="text-text-muted mt-4 max-w-xl mx-auto">
                Our AI assistant is trained specifically on robotics — it doesn't just search, it understands.
                Ask anything and let it guide you visually through the experience.
              </p>
            </div>
          </Reveal>

          {/* Capabilities grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_CAPABILITIES.map((cap, i) => (
              <Reveal key={cap.title} delay={i * 60}>
                <div
                  className="group rounded-2xl border p-6 lg:p-7"
                  style={{
                    borderColor: "oklch(80% 0 0 / 0.06)",
                    background: "oklch(18% 0.030 255 / 0.5)",
                    transition: "border-color 0.3s, background 0.3s, transform 0.3s var(--ease-out-expo)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "oklch(65% 0.28 290 / 0.2)";
                    e.currentTarget.style.background = "oklch(20% 0.035 260 / 0.6)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "oklch(80% 0 0 / 0.06)";
                    e.currentTarget.style.background = "oklch(18% 0.030 255 / 0.5)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: "oklch(65% 0.28 290 / 0.1)",
                      border: "1px solid oklch(65% 0.28 290 / 0.15)",
                    }}
                  >
                    <cap.icon size={20} style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{cap.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{cap.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* CTA */}
          <Reveal delay={400}>
            <div className="text-center mt-12">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-white cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))",
                  boxShadow: "0 0 30px oklch(65% 0.28 290 / 0.25)",
                  transition: "box-shadow 0.3s var(--ease-out-expo), transform 0.2s",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 50px oklch(65% 0.28 290 / 0.45)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 30px oklch(65% 0.28 290 / 0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <MessageCircle size={18} />
                Start a Conversation
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section style={{ paddingBlock: "var(--space-section)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">How it works</p>
              <h2 className="font-bold text-white" style={{ fontSize: "var(--text-heading)" }}>
                AI-guided discovery.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Tell us what you need",
                desc: "Describe your requirements in any language — our AI understands context, budget, and use case.",
              },
              {
                step: "02",
                title: "Get guided recommendations",
                desc: "The assistant highlights products on screen, walks you through comparisons, and explains specs.",
              },
              {
                step: "03",
                title: "Make an informed choice",
                desc: "With AI-powered guidance, you'll find the right robot without scrolling through endless product grids.",
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={i * 120}>
                <div className="relative">
                  <span
                    className="block text-6xl font-black mb-4 leading-none"
                    style={{
                      background: "linear-gradient(180deg, oklch(65% 0.28 290 / 0.3), oklch(65% 0.28 290 / 0.05))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {item.step}
                  </span>
                  <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
