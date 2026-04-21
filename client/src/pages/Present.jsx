import { useEffect, useRef, useState } from "react";
import ParticleNetwork from "../components/ParticleNetwork";

/* ─── Typewriter hook ──────────────────────────────────────────── */
function useTypewriter(text, speed = 40, delay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setDisplayed("");
    setDone(false);
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return { displayed, done };
}

/* ─── Animated counter ─────────────────────────────────────────── */
function Counter({ to, suffix = "" }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.ceil(to / 60);
          const timer = setInterval(() => {
            start = Math.min(start + step, to);
            setVal(start);
            if (start >= to) clearInterval(timer);
          }, 16);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ─── Fade-in section wrapper ──────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s var(--ease-out-expo,cubic-bezier(.16,1,.3,1)) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Section label ────────────────────────────────────────────── */
function SectionLabel({ text, color = "oklch(65% 0.28 290)" }) {
  return (
    <p
      style={{
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        marginBottom: "14px",
      }}
    >
      {text}
    </p>
  );
}

/* ─── Section heading ──────────────────────────────────────────── */
function SectionHeading({ children }) {
  return (
    <h2
      style={{
        fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)",
        fontWeight: 800,
        color: "oklch(94% 0.008 260)",
        lineHeight: 1.2,
        marginBottom: "24px",
      }}
    >
      {children}
    </h2>
  );
}

/* ─── Glass info card ──────────────────────────────────────────── */
function InfoCard({ icon, title, desc, color = "oklch(65% 0.28 290)" }) {
  return (
    <div
      className="glass-card"
      style={{
        borderRadius: "14px",
        padding: "18px 20px",
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
        borderColor: `${color}33`,
      }}
    >
      <span
        style={{
          fontSize: "1.4rem",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: "2px",
          filter: "drop-shadow(0 0 6px currentColor)",
        }}
      >
        {icon}
      </span>
      <div>
        <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "oklch(92% 0.01 260)", marginBottom: "4px" }}>
          {title}
        </p>
        <p style={{ fontSize: "0.83rem", color: "oklch(62% 0.02 260)", lineHeight: 1.65 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Numbered step card ───────────────────────────────────────── */
function StepCard({ num, title, desc, color }) {
  return (
    <div
      className="glass-card"
      style={{
        borderRadius: "14px",
        padding: "20px 22px",
        borderColor: `${color}33`,
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: `${color}20`,
          border: `1.5px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.85rem",
          color,
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "oklch(92% 0.01 260)", marginBottom: "4px" }}>
          {title}
        </p>
        <p style={{ fontSize: "0.83rem", color: "oklch(62% 0.02 260)", lineHeight: 1.65 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── Metric row ───────────────────────────────────────────────── */
function MetricBar({ label, value, pct, color }) {
  const ref = useRef(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "0.82rem", color: "oklch(75% 0.02 260)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.82rem", color, fontWeight: 700 }}>{value}</span>
      </div>
      <div
        style={{
          height: "6px",
          borderRadius: "999px",
          background: "oklch(30% 0.02 260)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "999px",
            background: color,
            width: animated ? `${pct}%` : "0%",
            transition: "width 1.1s cubic-bezier(.16,1,.3,1)",
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Full-page section wrapper ────────────────────────────────── */
function Slide({ children, style = {} }) {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "clamp(4rem,8vw,8rem) clamp(1.5rem,6vw,8rem)",
        borderTop: "1px solid oklch(80% 0 0 / 0.06)",
        position: "relative",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/* ─── Main component ───────────────────────────────────────────── */
export default function Present() {
  const subtitle = "Lightweight Agentic Function Routing with UI Guidance for Multilingual Robotics Commerce";
  const { displayed, done } = useTypewriter(subtitle, 30, 900);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="overflow-x-hidden bg-grid" style={{ minHeight: "100vh" }}>

      {/* ══════════════════════════════════
          1. HERO / ABSTRACT
      ══════════════════════════════════ */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "0 clamp(1rem, 4vw, 4rem)",
        }}
      >
        <ParticleNetwork />

        {/* Parallax blobs */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-200px",
            left: "-200px",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.22), transparent 65%)",
            transform: `translateY(${scrollY * 0.12}px)`,
            transition: "transform 0.1s linear",
          }}
        />
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: "-150px",
            right: "-150px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(78% 0.16 195 / 0.16), transparent 65%)",
            transform: `translateY(${-scrollY * 0.08}px)`,
            transition: "transform 0.1s linear",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "900px",
            width: "100%",
            textAlign: "center",
          }}
        >
          {/* Course chip */}
          <FadeIn delay={0}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 18px",
                borderRadius: "999px",
                background: "oklch(65% 0.28 290 / 0.12)",
                border: "1px solid oklch(65% 0.28 290 / 0.35)",
                marginBottom: "28px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "oklch(65% 0.28 290)",
                  boxShadow: "0 0 8px oklch(65% 0.28 290)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "oklch(78% 0.16 290)",
                  textTransform: "uppercase",
                }}
              >
                CS6420 · Topics in Deep Learning · IIT Hyderabad
              </span>
            </div>
          </FadeIn>

          {/* Wordmark */}
          <FadeIn delay={150}>
            <h1
              style={{
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                fontSize: "clamp(3.5rem, 10vw, 8rem)",
                margin: "0 0 6px",
                background:
                  "linear-gradient(135deg, #ffffff 20%, oklch(78% 0.16 290) 55%, oklch(78% 0.16 195) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              NEXUS BOTS
            </h1>
          </FadeIn>

          {/* Divider */}
          <FadeIn delay={250}>
            <div
              style={{
                width: "clamp(60px,12vw,120px)",
                height: "2px",
                margin: "20px auto 28px",
                background:
                  "linear-gradient(90deg, transparent, oklch(65% 0.28 290), oklch(78% 0.16 195), transparent)",
              }}
            />
          </FadeIn>

          {/* Typewriter subtitle */}
          <FadeIn delay={400}>
            <h2
              style={{
                fontSize: "clamp(1.05rem, 1.5vw + 0.8rem, 1.55rem)",
                color: "oklch(88% 0.022 260)",
                lineHeight: 1.65,
                maxWidth: "740px",
                margin: "0 auto",
                minHeight: "4.5em",
                fontWeight: 400,
              }}
            >
              {displayed}
              {!done && (
                <span
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1.1em",
                    background: "oklch(78% 0.16 195)",
                    verticalAlign: "text-bottom",
                    marginLeft: "2px",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              )}
            </h2>
          </FadeIn>

          {/* Abstract blurb */}
          <FadeIn delay={560}>
            <p
              style={{
                fontSize: "0.93rem",
                color: "oklch(65% 0.02 260)",
                lineHeight: 1.8,
                maxWidth: "680px",
                margin: "18px auto 0",
              }}
            >
              A hybrid architecture where a fine-tuned <strong style={{ color: "oklch(78% 0.16 290)" }}>0.6B model</strong> handles
              all structured tool-call routing locally, while a cloud LLM is invoked only for free-text generation —
              reducing per-query cost by up to <strong style={{ color: "oklch(78% 0.16 195)" }}>30×</strong> over GPT-4o.
            </p>
          </FadeIn>

          {/* Author row */}
          <FadeIn delay={700}>
            <div
              className="glass-card"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "16px",
                padding: "14px 28px",
                borderRadius: "14px",
                marginTop: "40px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                VK
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "oklch(94% 0.008 260)", fontSize: "0.97rem" }}>
                  Vinay Kumar Kadari
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "oklch(60% 0.02 260)", letterSpacing: "0.04em" }}>
                  CS24MTECH14008
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Scroll hint */}
          <FadeIn delay={950}>
            <div
              style={{
                marginTop: "52px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "oklch(50% 0.02 260)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                scroll to explore
              </span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 3v14M4 11l6 6 6-6"
                  stroke="oklch(65% 0.28 290)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════
          2. INTRODUCTION
      ══════════════════════════════════ */}
      <Slide>
        {/* accent blob */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.10), transparent 70%)",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "48px",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left text */}
          <div>
            <FadeIn delay={0}>
              <SectionLabel text="01 · Introduction" />
              <SectionHeading>
                The Rise of{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Conversational Commerce
                </span>
              </SectionHeading>
            </FadeIn>
            <FadeIn delay={100}>
              <p style={{ color: "oklch(68% 0.02 260)", lineHeight: 1.85, fontSize: "0.95rem", marginBottom: "18px" }}>
                Consumer robotics — humanoid robots, vacuum cleaners, delivery drones, educational platforms — is a fast-growing
                product category requiring <strong style={{ color: "oklch(85% 0.01 260)" }}>intelligent discovery assistance</strong>.
                Users expect chatbots that not only answer queries but also navigate catalog pages, compare products, and update carts.
              </p>
            </FadeIn>
            <FadeIn delay={180}>
              <p style={{ color: "oklch(68% 0.02 260)", lineHeight: 1.85, fontSize: "0.95rem", marginBottom: "18px" }}>
                Current systems route <em>every</em> query through large LLM APIs (GPT-4, Claude, Gemini) for both intent
                classification and generation. This is <strong style={{ color: "oklch(78% 0.16 290)" }}>unnecessarily expensive</strong> —
                intent parsing is fundamentally a structured classification task.
              </p>
            </FadeIn>
            <FadeIn delay={260}>
              <p style={{ color: "oklch(68% 0.02 260)", lineHeight: 1.85, fontSize: "0.95rem" }}>
                Serving Hindi and Telugu speakers further complicates the pipeline, since no existing
                system routes romanized voice input (e.g., <em>"drone kahan milega?"</em>) through an English-trained model.
              </p>
            </FadeIn>
          </div>

          {/* Right cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <FadeIn delay={80}>
              <InfoCard
                icon="🤖"
                title="Consumer Robotics Boom"
                desc="Humanoid robots, vacuum cleaners, delivery drones, and educational platforms demand intelligent, conversational discovery."
                color="oklch(65% 0.28 290)"
              />
            </FadeIn>
            <FadeIn delay={160}>
              <InfoCard
                icon="💬"
                title="Conversational Interfaces"
                desc="Users expect AI that performs actions — navigate catalog, compare specs, update cart — not just answer questions."
                color="oklch(78% 0.16 195)"
              />
            </FadeIn>
            <FadeIn delay={240}>
              <InfoCard
                icon="🌐"
                title="Multilingual Complexity"
                desc="Hindi and Telugu speakers require voice-to-romanized-text pipelines before any routing can occur."
                color="oklch(72% 0.22 60)"
              />
            </FadeIn>
            <FadeIn delay={320}>
              <InfoCard
                icon="⚡"
                title="Nexus Bots: Our Approach"
                desc="Fine-tuned 0.6B model routes locally. Cloud LLM invoked only for NLG. Two novel contributions: romanized multilingual routing + UI guidance output."
                color="oklch(72% 0.20 155)"
              />
            </FadeIn>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          3. PROBLEM DEFINITION
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "440px",
            height: "440px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(72% 0.22 60 / 0.10), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="02 · Problem Definition" color="oklch(72% 0.22 60)" />
          <SectionHeading>
            Three Gaps in{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.22 60), oklch(78% 0.16 30))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Existing Systems
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "20px",
            marginBottom: "36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Problem 1 */}
          <FadeIn delay={80}>
            <div
              className="glass-card"
              style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(72% 0.22 60 / 0.30)" }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "oklch(72% 0.22 60 / 0.15)",
                  border: "1.5px solid oklch(72% 0.22 60 / 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "16px",
                }}
              >
                💸
              </div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "oklch(92% 0.01 260)", marginBottom: "10px" }}>
                2.1 — Cost & Latency
              </p>
              <p style={{ fontSize: "0.85rem", color: "oklch(62% 0.02 260)", lineHeight: 1.7, marginBottom: "12px" }}>
                Routing through GPT-4o costs <strong style={{ color: "oklch(72% 0.22 60)" }}>$0.01–$0.05 per call</strong> —
                $100–$500/day at 10,000 queries. API latency of 1–3 s degrades real-time usability.
              </p>
              <div
                style={{
                  background: "oklch(72% 0.22 60 / 0.08)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  color: "oklch(72% 0.22 60)",
                  fontWeight: 600,
                }}
              >
                Intent parsing is classification — not generation
              </div>
            </div>
          </FadeIn>

          {/* Problem 2 */}
          <FadeIn delay={160}>
            <div
              className="glass-card"
              style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(65% 0.28 290 / 0.30)" }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "oklch(65% 0.28 290 / 0.15)",
                  border: "1.5px solid oklch(65% 0.28 290 / 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "16px",
                }}
              >
                🖥️
              </div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "oklch(92% 0.01 260)", marginBottom: "10px" }}>
                2.2 — No UI Guidance
              </p>
              <p style={{ fontSize: "0.85rem", color: "oklch(62% 0.02 260)", lineHeight: 1.7, marginBottom: "12px" }}>
                Existing chatbots return free-text only. A user asking{" "}
                <em style={{ color: "oklch(78% 0.02 260)" }}>"how do I compare two robots?"</em>{" "}
                needs an <strong style={{ color: "oklch(65% 0.28 290)" }}>on-screen highlight</strong>, not a paragraph.
              </p>
              <div
                style={{
                  background: "oklch(65% 0.28 290 / 0.08)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  color: "oklch(65% 0.28 290)",
                  fontWeight: 600,
                }}
              >
                No system models UI guidance as structured output
              </div>
            </div>
          </FadeIn>

          {/* Problem 3 */}
          <FadeIn delay={240}>
            <div
              className="glass-card"
              style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(78% 0.16 195 / 0.30)" }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "oklch(78% 0.16 195 / 0.15)",
                  border: "1.5px solid oklch(78% 0.16 195 / 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.3rem",
                  marginBottom: "16px",
                }}
              >
                🗣️
              </div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "oklch(92% 0.01 260)", marginBottom: "10px" }}>
                2.3 — Multilingual Gap
              </p>
              <p style={{ fontSize: "0.85rem", color: "oklch(62% 0.02 260)", lineHeight: 1.7, marginBottom: "12px" }}>
                Hindi and Telugu speakers are excluded unless <strong style={{ color: "oklch(78% 0.16 195)" }}>separate per-language models</strong>{" "}
                are deployed. No system routes romanized voice input through an English-trained model.
              </p>
              <div
                style={{
                  background: "oklch(78% 0.16 195 / 0.08)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  color: "oklch(78% 0.16 195)",
                  fontWeight: 600,
                }}
              >
                e.g., "drone kahan milega?" → unrouted
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Scope banner */}
        <FadeIn delay={320}>
          <div
            className="glass-card"
            style={{
              borderRadius: "14px",
              padding: "18px 28px",
              display: "flex",
              flexWrap: "wrap",
              gap: "28px",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "oklch(55% 0.02 260)", letterSpacing: "0.1em", textTransform: "uppercase", flexBasis: "100%" }}>
              2.4 · Scope of This Work
            </p>
            {[
              { val: "12", label: "Products" },
              { val: "4", label: "Categories" },
              { val: "6", label: "Tool Calls" },
              { val: "11", label: "UI Flows" },
              { val: "EN / HI / TE", label: "Languages" },
              { val: "React + Node.js", label: "Stack" },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: "2px",
                  }}
                >
                  {val}
                </p>
                <p style={{ fontSize: "0.72rem", color: "oklch(55% 0.02 260)", letterSpacing: "0.06em" }}>{label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </Slide>

      {/* ══════════════════════════════════
          4a. PROPOSED SOLUTION — Part 1
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(72% 0.20 155 / 0.10), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="03 · Proposed Solution — Part 1 of 2" color="oklch(72% 0.20 155)" />
          <SectionHeading>
            Dual-Model Architecture{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.20 155), oklch(78% 0.16 195))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &amp; UI Guidance
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "40px",
            alignItems: "start",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* 3.1 Dual-Model */}
          <div>
            <FadeIn delay={80}>
              <div
                className="glass-card"
                style={{ borderRadius: "16px", padding: "28px 24px", marginBottom: "20px", borderColor: "oklch(72% 0.20 155 / 0.30)" }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(72% 0.20 155)", marginBottom: "12px", letterSpacing: "0.04em" }}>
                  §3.1 — Dual-Model Agentic Architecture
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "16px" }}>
                  A fine-tuned <strong style={{ color: "oklch(85% 0.01 260)" }}>Qwen3-0.6B-FC</strong> runs locally,
                  outputting a structured JSON <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px", fontSize: "0.8rem" }}>
                    {"{tool, arguments, ui_guide}"}
                  </code> per user turn.
                  <strong style={{ color: "oklch(78% 0.16 195)" }}> SARVAM-M</strong> (cloud) is called only for
                  natural-language generation — reducing cost by up to <strong style={{ color: "oklch(72% 0.22 60)" }}>30×</strong> over GPT-4o.
                </p>

                {/* Pipeline */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "4px",
                    justifyContent: "center",
                    padding: "12px",
                    background: "oklch(20% 0.02 260 / 0.5)",
                    borderRadius: "10px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {[
                    { label: "Input", sub: "text/voice", c: "oklch(65% 0.28 290)" },
                    "→",
                    { label: "STT", sub: "SARVAM", c: "oklch(72% 0.22 60)" },
                    "→",
                    { label: "Qwen3 FC", sub: "0.6B local", c: "oklch(72% 0.20 155)" },
                    "→",
                    { label: "Tool Exec", sub: "SQLite", c: "oklch(78% 0.16 195)" },
                    "→",
                    { label: "SARVAM-M", sub: "NLG cloud", c: "oklch(70% 0.18 220)" },
                    "→",
                    { label: "UI Guide", sub: "highlight", c: "oklch(72% 0.24 320)" },
                  ].map((item, i) =>
                    item === "→" ? (
                      <span key={i} style={{ color: "oklch(40% 0.02 260)", fontSize: "0.9rem" }}>→</span>
                    ) : (
                      <div
                        key={item.label}
                        style={{
                          background: `${item.c}14`,
                          border: `1px solid ${item.c}44`,
                          borderRadius: "7px",
                          padding: "6px 10px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ color: item.c }}>{item.label}</div>
                        <div style={{ color: "oklch(45% 0.02 260)", fontSize: "0.65rem", fontWeight: 400 }}>{item.sub}</div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Cost comparison */}
            <FadeIn delay={200}>
              <div className="glass-card" style={{ borderRadius: "14px", padding: "20px 24px" }}>
                <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "oklch(60% 0.02 260)", marginBottom: "14px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Cost at 10k queries / day
                </p>
                {[
                  { label: "Full GPT-4o", val: "$24–56 / day", pct: 100, color: "oklch(65% 0.20 30)" },
                  { label: "Full SARVAM-M", val: "~$1.90 / day", pct: 8, color: "oklch(72% 0.22 60)" },
                  { label: "Nexus Bots (ours)", val: "~$0.95 / day", pct: 4, color: "oklch(72% 0.20 155)" },
                ].map((r) => (
                  <MetricBar key={r.label} label={r.label} value={r.val} pct={r.pct} color={r.color} />
                ))}
              </div>
            </FadeIn>
          </div>

          {/* 3.2 UI Guidance */}
          <div>
            <FadeIn delay={120}>
              <div
                className="glass-card"
                style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(78% 0.16 195 / 0.30)" }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(78% 0.16 195)", marginBottom: "12px", letterSpacing: "0.04em" }}>
                  §3.2 — UI Guidance as Structured Output
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "20px" }}>
                  The FC model emits a <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px", fontSize: "0.8rem" }}>ui_guide</code>{" "}
                  key alongside each tool call, selecting one of <strong style={{ color: "oklch(78% 0.16 195)" }}>11 predefined flows</strong>.
                  React's <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px", fontSize: "0.8rem" }}>UIGuideProvider</code>{" "}
                  maps this key to a DOM element and highlights it via Floating UI tooltips. No frontend conditional logic required.
                </p>

                <div
                  style={{
                    background: "oklch(20% 0.02 260 / 0.5)",
                    borderRadius: "10px",
                    padding: "16px",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    color: "oklch(70% 0.02 260)",
                    lineHeight: 1.8,
                    overflowX: "auto",
                  }}
                >
                  <span style={{ color: "oklch(65% 0.28 290)" }}>{"{"}</span>
                  <br />
                  {"  "}<span style={{ color: "oklch(78% 0.16 195)" }}>"tool"</span>
                  {": "}
                  <span style={{ color: "oklch(72% 0.22 60)" }}>"navigate_to"</span>,
                  <br />
                  {"  "}<span style={{ color: "oklch(78% 0.16 195)" }}>"arguments"</span>
                  {": {"}<span style={{ color: "oklch(72% 0.20 155)" }}>"page"</span>{": "}<span style={{ color: "oklch(72% 0.22 60)" }}>"catalog"</span>{"}, "}
                  <br />
                  {"  "}<span style={{ color: "oklch(78% 0.16 195)" }}>"ui_guide"</span>
                  {": "}
                  <span style={{ color: "oklch(72% 0.22 60)" }}>"find_drone"</span>
                  <br />
                  <span style={{ color: "oklch(65% 0.28 290)" }}>{"}"}</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                  {["find_drone", "compare_mode", "cart_open", "search_bar", "filter_panel", "product_detail", "checkout", "recommend_panel", "category_nav", "voice_input", "help_overlay"].map((key) => (
                    <span
                      key={key}
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        background: "oklch(78% 0.16 195 / 0.10)",
                        border: "1px solid oklch(78% 0.16 195 / 0.3)",
                        color: "oklch(78% 0.16 195)",
                      }}
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          4b. PROPOSED SOLUTION — Part 2
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.09), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="03 · Proposed Solution — Part 2 of 2" color="oklch(65% 0.28 290)" />
          <SectionHeading>
            Multilingual Routing{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(72% 0.22 60))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &amp; Tool Schema
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "40px",
            alignItems: "start",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* 3.3 Romanized Multilingual */}
          <div>
            <FadeIn delay={80}>
              <div
                className="glass-card"
                style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(65% 0.28 290 / 0.30)", marginBottom: "20px" }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(65% 0.28 290)", marginBottom: "12px", letterSpacing: "0.04em" }}>
                  §3.3 — Romanized Multilingual Routing
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "16px" }}>
                  Rather than deploying a 7B+ multilingual model, we use a two-step approach that enables an
                  <strong style={{ color: "oklch(85% 0.01 260)" }}> English-trained 0.6B model</strong> to serve Hindi and Telugu speakers without modification.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <StepCard
                    num="1"
                    title="SARVAM STT Transcription"
                    desc='HI/TE voice → romanized Latin: "drone kahan milega" — no script conversion needed.'
                    color="oklch(65% 0.28 290)"
                  />
                  <StepCard
                    num="2"
                    title="Romanized Training Examples"
                    desc="500 romanized examples included in fine-tuning data, enabling the model to route multilingual queries natively."
                    color="oklch(72% 0.22 60)"
                  />
                </div>

                {/* Language flow */}
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    padding: "12px",
                    background: "oklch(20% 0.02 260 / 0.5)",
                    borderRadius: "10px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  {[
                    { text: "Hindi / Telugu voice", c: "oklch(72% 0.22 60)" },
                    "→",
                    { text: "SARVAM STT", c: "oklch(65% 0.28 290)" },
                    "→",
                    { text: "Romanized Latin", c: "oklch(78% 0.16 195)" },
                    "→",
                    { text: "Qwen3 FC routes", c: "oklch(72% 0.20 155)" },
                  ].map((item, i) =>
                    item === "→" ? (
                      <span key={i} style={{ color: "oklch(40% 0.02 260)" }}>→</span>
                    ) : (
                      <span
                        key={item.text}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "7px",
                          background: `${item.c}14`,
                          border: `1px solid ${item.c}44`,
                          color: item.c,
                        }}
                      >
                        {item.text}
                      </span>
                    )
                  )}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* 3.4 Tool Schema */}
          <div>
            <FadeIn delay={120}>
              <div
                className="glass-card"
                style={{ borderRadius: "16px", padding: "28px 24px", borderColor: "oklch(78% 0.16 195 / 0.30)" }}
              >
                <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(78% 0.16 195)", marginBottom: "12px", letterSpacing: "0.04em" }}>
                  §3.4 — Tool Schema
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "20px" }}>
                  Six tools are defined with schemas shared identically between training and inference —
                  eliminating drift. Each tool maps to a deterministic backend action.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { tool: "search_products", desc: "Query catalog by keyword, category, or spec", color: "oklch(65% 0.28 290)" },
                    { tool: "get_product", desc: "Fetch full detail page for a single SKU", color: "oklch(78% 0.16 195)" },
                    { tool: "compare_products", desc: "Side-by-side spec comparison of 2+ items", color: "oklch(72% 0.20 155)" },
                    { tool: "recommend", desc: "Contextual product suggestion from user history", color: "oklch(72% 0.22 60)" },
                    { tool: "add_to_cart", desc: "Add a selected product to the shopping cart", color: "oklch(70% 0.24 320)" },
                    { tool: "navigate_to", desc: "Route the user to a catalog page or UI section", color: "oklch(68% 0.18 30)" },
                  ].map(({ tool, desc, color }) => (
                    <div
                      key={tool}
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: `${color}0c`,
                        border: `1px solid ${color}33`,
                      }}
                    >
                      <code
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color,
                          flexShrink: 0,
                          minWidth: "130px",
                          lineHeight: 1.6,
                        }}
                      >
                        {tool}
                      </code>
                      <span style={{ fontSize: "0.78rem", color: "oklch(60% 0.02 260)", lineHeight: 1.6 }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          5. EXPERIMENTS
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "460px",
            height: "460px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(70% 0.24 320 / 0.09), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="04 · Experiments" color="oklch(70% 0.24 320)" />
          <SectionHeading>
            Dataset, Fine-Tuning{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(70% 0.24 320), oklch(65% 0.28 290))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &amp; Benchmarks
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: "24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Dataset */}
          <FadeIn delay={80}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(70% 0.24 320 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(70% 0.24 320)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                §4.1 — Dataset Construction
              </p>
              <p style={{ fontSize: "0.83rem", color: "oklch(65% 0.02 260)", lineHeight: 1.7, marginBottom: "16px" }}>
                <strong style={{ color: "oklch(85% 0.01 260)" }}>1,113 rows</strong> in ChatML format.
                100 manually authored golden examples → GPT-4 generated remaining via structured templates.
                Each row is a <em>three-turn conversation</em>.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                {[
                  { label: "English", train: 501, test: 55, color: "oklch(65% 0.28 290)" },
                  { label: "Hindi", train: 373, test: 27, color: "oklch(72% 0.22 60)" },
                  { label: "Telugu", train: 239, test: 18, color: "oklch(78% 0.16 195)" },
                ].map(({ label, train, test, color }) => (
                  <div
                    key={label}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: `${color}0e`,
                      border: `1px solid ${color}33`,
                    }}
                  >
                    <p style={{ fontWeight: 700, fontSize: "0.82rem", color, marginBottom: "4px" }}>{label}</p>
                    <p style={{ fontSize: "0.75rem", color: "oklch(55% 0.02 260)" }}>Train: {train} · Test: {test}</p>
                  </div>
                ))}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "oklch(50% 0.02 260 / 0.12)",
                    border: "1px solid oklch(50% 0.02 260 / 0.25)",
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "oklch(75% 0.01 260)", marginBottom: "4px" }}>Total</p>
                  <p style={{ fontSize: "0.75rem", color: "oklch(55% 0.02 260)" }}>1,113 · Test: 100</p>
                </div>
              </div>

              <p style={{ fontSize: "0.78rem", color: "oklch(55% 0.02 260)", lineHeight: 1.6 }}>
                Difficulty split: 400 Simple · 380 Medium · 280 Complex · 53 Edge
              </p>
            </div>
          </FadeIn>

          {/* Fine-tuning */}
          <FadeIn delay={160}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(65% 0.28 290 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(65% 0.28 290)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                §4.2 — Fine-Tuning (QLoRA)
              </p>
              <p style={{ fontSize: "0.83rem", color: "oklch(65% 0.02 260)", lineHeight: 1.7, marginBottom: "16px" }}>
                <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px" }}>Qwen/Qwen3-0.6B</code> via
                HF PEFT/TRL · LoRA <em>r</em>=16, α=32 · <strong style={{ color: "oklch(78% 0.16 290)" }}>1.67% trainable params</strong> ·
                LR 2×10⁻⁴ cosine · 1 epoch · batch 16 · bf16
              </p>

              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "oklch(55% 0.02 260)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Training Dynamics
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { epoch: "0.14", loss: "2.053", acc: "63.8%", highlight: false },
                  { epoch: "0.71 (eval)", loss: "0.097", acc: "98.2%", highlight: false },
                  { epoch: "0.86", loss: "0.075", acc: "98.9%", highlight: false },
                  { epoch: "1.00", loss: "0.054", acc: "99.1%", highlight: true },
                ].map(({ epoch, loss, acc, highlight }) => (
                  <div
                    key={epoch}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 1fr",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: highlight ? "oklch(65% 0.28 290 / 0.10)" : "oklch(20% 0.02 260 / 0.4)",
                      border: highlight ? "1px solid oklch(65% 0.28 290 / 0.4)" : "1px solid transparent",
                      fontSize: "0.78rem",
                    }}
                  >
                    <span style={{ color: highlight ? "oklch(78% 0.16 290)" : "oklch(65% 0.02 260)", fontWeight: highlight ? 700 : 400 }}>
                      Epoch {epoch}
                    </span>
                    <span style={{ color: "oklch(62% 0.02 260)", textAlign: "center" }}>Loss: {loss}</span>
                    <span style={{ color: highlight ? "oklch(72% 0.20 155)" : "oklch(62% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "right" }}>
                      Acc: {acc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Benchmarks */}
          <FadeIn delay={240}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(78% 0.16 195 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(78% 0.16 195)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                §4.3 — Benchmark Suite
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: "oklch(78% 0.16 195 / 0.08)",
                    border: "1px solid oklch(78% 0.16 195 / 0.28)",
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "oklch(78% 0.16 195)", marginBottom: "6px" }}>
                    B1 — Function-Calling Accuracy
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "oklch(60% 0.02 260)", lineHeight: 1.65 }}>
                    100-row held-out test set across 3 systems: fine-tuned FC, base model, heuristic router.
                    Metrics: Tool Accuracy, Argument F1, UI Guide Accuracy. Broken down by EN / HI / TE.
                  </p>
                </div>

                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    background: "oklch(65% 0.28 290 / 0.08)",
                    border: "1px solid oklch(65% 0.28 290 / 0.28)",
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "oklch(65% 0.28 290)", marginBottom: "6px" }}>
                    B2 — Base-Model Baseline
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "oklch(60% 0.02 260)", lineHeight: 1.65 }}>
                    75 hand-crafted prompts across all 6 tools × 3 languages × 3 difficulty levels,
                    run on base Qwen3-0.6B to establish the no-adaptation ceiling and identify failure modes.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          6. RESULTS
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "440px",
            height: "440px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(72% 0.20 155 / 0.10), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="05 · Results" color="oklch(72% 0.20 155)" />
          <SectionHeading>
            Performance{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.20 155), oklch(78% 0.16 195))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &amp; Cost Analysis
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
            gap: "28px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* B2 Base model */}
          <FadeIn delay={80}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(72% 0.22 60 / 0.28)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(72% 0.22 60)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                B2 — Base Qwen3-0.6B (75 prompts, no fine-tuning)
              </p>
              <p style={{ fontSize: "0.78rem", color: "oklch(55% 0.02 260)", marginBottom: "18px" }}>
                Establishes the no-adaptation ceiling
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                {[
                  { metric: "Tool Acc", en: "66%", hi: "71%", te: "68%", all: "68%" },
                  { metric: "Arg Acc", en: "52%", hi: "48%", te: "47%", all: "49%" },
                  { metric: "UI Guide", en: "28%", hi: "33%", te: "32%", all: "31%" },
                  { metric: "Full Match", en: "16%", hi: "21%", te: "11%", all: "16%" },
                ].map(({ metric, en, hi, te, all }) => (
                  <div
                    key={metric}
                    style={{
                      padding: "10px 10px",
                      borderRadius: "10px",
                      background: "oklch(20% 0.02 260 / 0.5)",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ fontSize: "0.7rem", color: "oklch(55% 0.02 260)", marginBottom: "6px", fontWeight: 600 }}>{metric}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                      {[["EN", en], ["HI", hi], ["TE", te], ["All", all]].map(([lang, val]) => (
                        <div key={lang}>
                          <span style={{ fontSize: "0.6rem", color: "oklch(45% 0.02 260)" }}>{lang} </span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: lang === "All" ? "oklch(72% 0.22 60)" : "oklch(75% 0.01 260)" }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <MetricBar label="Tool Accuracy (All)" value="68%" pct={68} color="oklch(72% 0.22 60)" />
              <MetricBar label="Argument Accuracy (All)" value="49%" pct={49} color="oklch(65% 0.28 290)" />
              <MetricBar label="UI Guide Accuracy (All)" value="31%" pct={31} color="oklch(78% 0.16 195)" />
            </div>
          </FadeIn>

          {/* B1 System comparison */}
          <FadeIn delay={160}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(72% 0.20 155 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(72% 0.20 155)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                B1 — System Comparison (100-row test set)
              </p>
              <p style={{ fontSize: "0.78rem", color: "oklch(55% 0.02 260)", marginBottom: "18px" }}>
                enable_thinking=False to match training format
              </p>

              {/* Table */}
              <div style={{ marginBottom: "18px" }}>
                {[
                  { system: "Qwen3-0.6B-FC (ours)", toolAcc: "0.64", argF1: "0.49", uiGuide: "0.35", highlight: true },
                  { system: "Qwen3-0.6B BASE", toolAcc: "0.55", argF1: "0.37", uiGuide: "0.23", highlight: false },
                  { system: "Heuristic Router", toolAcc: "0.35", argF1: "0.17", uiGuide: "0.19", highlight: false },
                ].map(({ system, toolAcc, argF1, uiGuide, highlight }) => (
                  <div
                    key={system}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: "8px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "6px",
                      background: highlight ? "oklch(72% 0.20 155 / 0.10)" : "oklch(20% 0.02 260 / 0.4)",
                      border: highlight ? "1px solid oklch(72% 0.20 155 / 0.4)" : "1px solid transparent",
                      fontSize: "0.78rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: highlight ? "oklch(85% 0.01 260)" : "oklch(60% 0.02 260)", fontWeight: highlight ? 700 : 400 }}>
                      {system}
                    </span>
                    <span style={{ color: highlight ? "oklch(72% 0.20 155)" : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{toolAcc}</span>
                    <span style={{ color: highlight ? "oklch(72% 0.20 155)" : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{argF1}</span>
                    <span style={{ color: highlight ? "oklch(72% 0.20 155)" : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{uiGuide}</span>
                  </div>
                ))}
                {/* Header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: "8px",
                    padding: "4px 12px",
                    fontSize: "0.68rem",
                    color: "oklch(45% 0.02 260)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <span>System</span>
                  <span style={{ textAlign: "center" }}>Tool Acc</span>
                  <span style={{ textAlign: "center" }}>Arg F1</span>
                  <span style={{ textAlign: "center" }}>UI Guide</span>
                </div>
              </div>

              {/* Gain badges */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "oklch(72% 0.20 155 / 0.08)",
                  border: "1px solid oklch(72% 0.20 155 / 0.25)",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: "oklch(55% 0.02 260)", marginBottom: "8px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Gain vs. Base Model
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { label: "Tool Acc", gain: "+9 pp" },
                    { label: "Arg F1", gain: "+12 pp" },
                    { label: "UI Guide", gain: "+12 pp" },
                  ].map(({ label, gain }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <p style={{ fontWeight: 800, fontSize: "1.1rem", color: "oklch(72% 0.20 155)" }}>{gain}</p>
                      <p style={{ fontSize: "0.7rem", color: "oklch(50% 0.02 260)" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          7. CONCLUSION
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-140px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.12), transparent 65%)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", width: "100%" }}>
          <FadeIn delay={0}>
            <SectionLabel text="06 · Conclusion" color="oklch(65% 0.28 290)" />
            <SectionHeading>
              What Nexus Bots{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Demonstrates
              </span>
            </SectionHeading>
          </FadeIn>

          <FadeIn delay={80}>
            <p style={{ fontSize: "1rem", color: "oklch(68% 0.02 260)", lineHeight: 1.85, marginBottom: "36px" }}>
              Full-LLM routing is <strong style={{ color: "oklch(85% 0.01 260)" }}>unnecessary</strong> for structured commerce intent.
              Offloading tool-call classification to a fine-tuned 0.6B model reduces per-query cost by up to
              <strong style={{ color: "oklch(72% 0.22 60)" }}> 30×</strong> compared to GPT-4o and
              <strong style={{ color: "oklch(78% 0.16 195)" }}> 2×</strong> compared to full SARVAM-M, while keeping routing local.
            </p>
          </FadeIn>

          {/* Contribution cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "18px", marginBottom: "40px" }}>
            <FadeIn delay={120}>
              <div className="glass-card" style={{ borderRadius: "16px", padding: "24px 20px", borderColor: "oklch(65% 0.28 290 / 0.32)", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🌐</div>
                <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "oklch(65% 0.28 290)", marginBottom: "8px" }}>
                  Romanized Multilingual Routing
                </p>
                <p style={{ fontSize: "0.82rem", color: "oklch(60% 0.02 260)", lineHeight: 1.65 }}>
                  English-trained 0.6B model serves Hindi and Telugu speakers via SARVAM STT + 500 romanized training examples. No separate multilingual model needed.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="glass-card" style={{ borderRadius: "16px", padding: "24px 20px", borderColor: "oklch(78% 0.16 195 / 0.32)", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🖥️</div>
                <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "oklch(78% 0.16 195)", marginBottom: "8px" }}>
                  UI Guidance as Structured Output
                </p>
                <p style={{ fontSize: "0.82rem", color: "oklch(60% 0.02 260)", lineHeight: 1.65 }}>
                  First-class ui_guide key emitted alongside every tool call bridges AI intent with on-screen interaction via Floating UI tooltips.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={280}>
              <div className="glass-card" style={{ borderRadius: "16px", padding: "24px 20px", borderColor: "oklch(72% 0.20 155 / 0.32)", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚡</div>
                <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "oklch(72% 0.20 155)", marginBottom: "8px" }}>
                  30× Cost Reduction
                </p>
                <p style={{ fontSize: "0.82rem", color: "oklch(60% 0.02 260)", lineHeight: 1.65 }}>
                  Local Qwen3-0.6B-FC eliminates all routing API costs. Only SARVAM-M NLG calls incur cloud expense — ~$0.95/day at 10k queries.
                </p>
              </div>
            </FadeIn>
          </div>

          {/* Final summary ribbon */}
          <FadeIn delay={360}>
            <div
              style={{
                padding: "24px 32px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, oklch(65% 0.28 290 / 0.08), oklch(78% 0.16 195 / 0.08))",
                border: "1px solid oklch(65% 0.28 290 / 0.22)",
                display: "flex",
                flexWrap: "wrap",
                gap: "28px",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {[
                { val: "0.6B", label: "Local FC Model" },
                { val: "30×", label: "Cost Saving vs GPT-4o" },
                { val: "99.1%", label: "Token Accuracy" },
                { val: "3", label: "Languages Served" },
                { val: "11", label: "UI Guidance Flows" },
              ].map(({ val, label }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontWeight: 800,
                      fontSize: "clamp(1.4rem, 3vw, 2rem)",
                      background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      lineHeight: 1.1,
                      marginBottom: "4px",
                    }}
                  >
                    {val}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "oklch(50% 0.02 260)", letterSpacing: "0.05em" }}>{label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          FOOTER
      ══════════════════════════════════ */}
      <footer
        style={{
          padding: "clamp(2rem,4vw,4rem) clamp(1.5rem,6vw,8rem)",
          borderTop: "1px solid oklch(80% 0 0 / 0.06)",
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              fontWeight: 800,
              fontSize: "1.1rem",
              background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(78% 0.16 195))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "4px",
            }}
          >
            NEXUS BOTS
          </p>
          <p style={{ fontSize: "0.8rem", color: "oklch(50% 0.02 260)" }}>
            CS6420 · Topics in Deep Learning · IIT Hyderabad
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "oklch(80% 0.01 260)" }}>Vinay Kumar Kadari</p>
          <p style={{ fontSize: "0.78rem", color: "oklch(50% 0.02 260)" }}>CS24MTECH14008 · April 2026</p>
        </div>
      </footer>

      {/* Global keyframes */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 8px oklch(65% 0.28 290); }
          50%       { box-shadow: 0 0 16px oklch(65% 0.28 290); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}
