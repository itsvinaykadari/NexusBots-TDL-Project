import React, { useEffect, useRef, useState } from "react";
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
              A hybrid architecture where a <strong style={{ color: "oklch(78% 0.16 290)" }}>small LLM model</strong> guided by enhanced prompting,
              performs structured tool-call routing locally, while a cloud LLM is used only for natural-language generation
              reducing overall system cost by up to <strong style={{ color: "oklch(78% 0.16 195)" }}>2× compared to fully cloud-based LLM pipelines</strong>.
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
                Consumer robotics including humanoid robots, vacuum cleaners, delivery drones, and educational platforms is a rapidly growing
                product category that requires <strong style={{ color: "oklch(85% 0.01 260)" }}>intelligent discovery assistance</strong>.
                Users increasingly expect conversational systems that not only answer queries but also navigate catalog pages, compare products, and update carts.
              </p>
            </FadeIn>

            <FadeIn delay={180}>
              <p style={{ color: "oklch(68% 0.02 260)", lineHeight: 1.85, fontSize: "0.95rem", marginBottom: "18px" }}>
                Existing solutions rely on routing <em>every</em> query through large cloud-hosted LLMs (e.g., GPT-4, Claude, Gemini) for both intent
                classification and response generation. This approach is <strong style={{ color: "oklch(78% 0.16 290)" }}>cost-inefficient</strong>,
                as intent parsing is fundamentally a structured classification task that does not require large-scale models.
              </p>
            </FadeIn>

            <FadeIn delay={260}>
              <p style={{ color: "oklch(68% 0.02 260)", lineHeight: 1.85, fontSize: "0.95rem" }}>
                Supporting multilingual users particularly Hindi and Telugu speakers introduces additional challenges, as current systems
                struggle to handle romanized inputs (e.g., <em>"drone kahan milega?"</em>) with models primarily trained on English data.
              </p>
            </FadeIn>
          </div>

          {/* Right cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <FadeIn delay={80}>
              <InfoCard
                icon="🤖"
                title="Consumer Robotics Boom"
                desc="Humanoid robots, vacuum cleaners, delivery drones, and educational platforms require intelligent, conversational discovery."
                color="oklch(65% 0.28 290)"
              />
            </FadeIn>
            <FadeIn delay={160}>
              <InfoCard
                icon="💬"
                title="Conversational Interfaces"
                desc="Users expect AI systems that not only answer questions but also perform actions such as navigating catalogs, comparing products, and updating carts."
                color="oklch(78% 0.16 195)"
              />
            </FadeIn>
            <FadeIn delay={240}>
              <InfoCard
                icon="🌐"
                title="Multilingual Complexity"
                desc="Hindi and Telugu queries introduce additional complexity, especially with romanized inputs (e.g., 'drone kahan milega?') that must be handled by English-trained models."
                color="oklch(72% 0.22 60)"
              />
            </FadeIn>
            <FadeIn delay={320}>
              <InfoCard
                icon="⚡"
                title="Nexus Bots: Our Approach"
                desc="A small LLM model with enhanced prompting performs local tool routing, while a cloud LLM is used only for natural-language generation. Key contributions: romanized multilingual routing and UI-guided outputs."
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
                Intent parsing is fundamentally a classification task, not a generative one.
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
                <em style={{ color: "oklch(78% 0.02 260)" }}>"where is the cheapest drone?"</em>{" "}
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
                No existing system explicitly models UI guidance as a structured output.
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
                Hindi and Telugu support typically requires <strong style={{ color: "oklch(78% 0.16 195)" }}>separate per-language models</strong>{" "}
                Existing systems do not effectively handle romanized inputs
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
                e.g., "drone kahan milega?" using English-trained models.
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
              // { val: "12", label: "Products" },
              { val: "4", label: "Categories" },
              { val: "6", label: "Tool Calls" },
              // { val: "11", label: "UI Flows" },
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
                  3.1 — Dual-Model Agentic Architecture
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "16px" }}>
                  A <strong style={{ color: "oklch(85% 0.01 260)" }}>Qwen3-0.6B model</strong> with enhanced prompting runs locally,
                  outputting a structured JSON <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px", fontSize: "0.8rem" }}>
                    {"{tool, arguments, ui_guide}"}
                  </code> per user turn.
                  <strong style={{ color: "oklch(78% 0.16 195)" }}> SARVAM-M</strong> (cloud) is called only for
                  natural-language generation reducing cost significantly.
                  {/* <strong style={{ color: "oklch(72% 0.22 60)" }}>30×</strong> over GPT-4o. */}
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
                    { label: "Small Model", sub: "Qwen3-0.6B local", c: "oklch(72% 0.20 155)" },
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
                  3.2 — UI Guidance as Structured Output
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "20px" }}>
                  The small model emits a <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px", fontSize: "0.8rem" }}>ui_guide</code>{" "}
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

                <div
                  style={{
                    marginTop: "16px",
                  }}
                >
                  <p
                    style={{
                      marginBottom: "8px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "oklch(70% 0.02 260)",
                    }}
                  >
                    Available UI Guide Flows:
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {[
                      "find_drone",
                      "compare_mode",
                      "cart_open",
                      "search_bar",
                      "filter_panel",
                      "product_detail",
                      "checkout",
                      "recommend_panel",
                      "category_nav",
                      "voice_input",
                      "help_overlay",
                    ].map((key) => (
                      <span
                        key={key}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: "oklch(78% 0.16 195 / 0.10)",
                          border: "1px solid oklch(78% 0.16 195 / 0.3)",
                          color: "oklch(78% 0.16 195)",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {key}
                      </span>
                    ))}
                  </div>
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
                  3.3 — Romanized Multilingual Routing
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "16px" }}>
                  Rather than deploying a 7B+ multilingual model, we use a two-step approach that enables an
                  <strong style={{ color: "oklch(85% 0.01 260)" }}> English-trained 0.6B model</strong> to serve Hindi and Telugu speakers without requiring a separate multilingual model.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <StepCard
                    num="1"
                    title="SARVAM STT Transcription"
                    desc='HI/TE voice → romanized Latin: "drone kahan milega" - no native script handling required.'
                    color="oklch(65% 0.28 290)"
                  />
                  <StepCard
                    num="2"
                    title="Romanized Training Examples"
                    desc="Romanized examples are included to help the model handle multilingual queries effectively."
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
                  3.4 — Tool Schema
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75, marginBottom: "20px" }}>
                  Six tools are defined with schemas shared consistently between training and inference,
                  eliminating schema drift. Each tool maps to a deterministic backend action.
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
          4. EXPERIMENTS
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
            Dataset, Enhanced Prompt{" "}
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
                4.1 — Dataset Construction
              </p>
              <p style={{ fontSize: "0.83rem", color: "oklch(65% 0.02 260)", lineHeight: 1.7, marginBottom: "16px" }}>
                The dataset consists of <strong style={{ color: "oklch(85% 0.01 260)" }}>1,113 rows</strong>training examples and a 100-row held-out test set, all in ChatML format.
                Each example is a three-turn conversation designed for function-calling.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                {[
                  { label: "English", train: 607, test: 55, color: "oklch(65% 0.28 290)" },
                  { label: "Hindi", train: 313, test: 27, color: "oklch(72% 0.22 60)" },
                  { label: "Telugu", train: 193, test: 18, color: "oklch(78% 0.16 195)" },
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
                  <p style={{ fontSize: "0.75rem", color: "oklch(55% 0.02 260)" }}>Train: 1,113 · Test: 100</p>
                </div>
              </div>

              {/* <p style={{ fontSize: "0.78rem", color: "oklch(55% 0.02 260)", lineHeight: 1.6 }}>
                Difficulty split: 400 Simple · 380 Medium · 280 Complex · 53 Edge
              </p> */}
            </div>
          </FadeIn>

          {/* Enhanced Prompt Specification */}
          <FadeIn delay={160}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(65% 0.28 290 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(65% 0.28 290)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                4.2 — Enhanced Prompt Specification
              </p>
              <p style={{ fontSize: "0.83rem", color: "oklch(65% 0.02 260)", lineHeight: 1.7, marginBottom: "16px" }}>
                We replaced fine-tuning with a highly structured <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px" }}>few-shot prompt</code> template. This specification guides the base <code style={{ background: "oklch(25% 0.02 260)", padding: "2px 6px", borderRadius: "5px" }}>Qwen3-0.6B</code> without modifying weights, preserving pre-trained generalization while maximizing tool accuracy.
              </p>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "oklch(55% 0.02 260)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
                Prompt Components
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { component: "System Role", desc: "Defines the assistant as a strict routing engine", highlight: false },
                  { component: "Tool Schema", desc: "JSON-Schema definitions for available APIs", highlight: false },
                  { component: "Golden Examples", desc: "Hand-crafted multishot demos of tool use", highlight: false },
                  { component: "Output Format", desc: "Forces single JSON string with ui_guide", highlight: true },
                ].map(({ component, desc, highlight }) => (
                  <div
                    key={component}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.1fr 2fr",
                      gap: "8px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: highlight ? "oklch(65% 0.28 290 / 0.10)" : "oklch(20% 0.02 260 / 0.4)",
                      border: highlight ? "1px solid oklch(65% 0.28 290 / 0.4)" : "1px solid transparent",
                      fontSize: "0.78rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: highlight ? "oklch(78% 0.16 290)" : "oklch(65% 0.02 260)", fontWeight: highlight ? 700 : 400 }}>
                      {component}
                    </span>
                    <span style={{ color: "oklch(62% 0.02 260)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Benchmarks */}
          <FadeIn delay={240}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(78% 0.16 195 / 0.30)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(78% 0.16 195)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                4.3 — Benchmark Suite
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
                    Evaluated on a 100-row held-out test set across multiple systems:
                    Enhanced Prompt, Original Prompt, LoRA v2, LoRA v1, and Heuristic Router.
                    Metrics: Tool Accuracy, Argument F1, UI Guide Accuracy, with breakdown by EN / HI / TE.
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
                    75 hand-crafted prompts covering all 6 tools, 3 languages, and multiple difficulty levels
                    (including edge cases), used to evaluate the base model without adaptation.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          5a. RESULTS — Overall System Performance
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
          <SectionLabel text="05 · Results — Part 1 of 4" color="oklch(72% 0.20 155)" />
          <SectionHeading>
            Overall System{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.20 155), oklch(78% 0.16 195))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Performance
            </span>
          </SectionHeading>
        </FadeIn>

        {/* Hero stat row */}
        <FadeIn delay={60}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "28px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {[
              { val: "79%", label: "Tool Accuracy", sub: "NexusBots (Ours)", color: "oklch(72% 0.20 155)" },
              { val: "1113ms", label: "p50 Latency", sub: "vs 2252ms Sarvam", color: "oklch(78% 0.16 195)" },
              { val: "0", label: "Parse Errors", sub: "vs 9 for Sarvam-M", color: "oklch(72% 0.22 60)" },
              { val: "~2×", label: "Faster than Sarvam", sub: "same accuracy level", color: "oklch(65% 0.28 290)" },
            ].map(({ val, label, sub, color }) => (
              <div
                key={label}
                className="glass-card"
                style={{
                  flex: "1 1 160px",
                  borderRadius: "14px",
                  padding: "20px 18px",
                  borderColor: `${color}33`,
                  textAlign: "center",
                }}
              >
                <p style={{ fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.2rem)", color, lineHeight: 1, marginBottom: "6px" }}>{val}</p>
                <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "oklch(85% 0.01 260)", marginBottom: "3px" }}>{label}</p>
                <p style={{ fontSize: "0.72rem", color: "oklch(52% 0.02 260)" }}>{sub}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Main comparison table */}
        <FadeIn delay={140}>
          <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", position: "relative", zIndex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "oklch(55% 0.02 260)", marginBottom: "16px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              3-Way Comparison · 100 Queries
            </p>

            {/* Column headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr",
                gap: "8px",
                padding: "6px 14px",
                fontSize: "0.67rem",
                color: "oklch(42% 0.02 260)",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              <span>Model</span>
              <span style={{ textAlign: "center" }}>Tool Acc</span>
              <span style={{ textAlign: "center" }}>Arg F1</span>
              <span style={{ textAlign: "center" }}>UI Guide</span>
              <span style={{ textAlign: "center" }}>Latency p50</span>
              <span style={{ textAlign: "center" }}>Errors</span>
            </div>

            {[
              { system: "NexusBots (Ours)", toolAcc: "0.79", argF1: "0.5467", uiGuide: "0.72", latency: "1113 ms", errors: "0", highlight: true, color: "oklch(72% 0.20 155)" },
              { system: "Sarvam-M (thinking ON)", toolAcc: "0.78", argF1: "0.5567", uiGuide: "0.57", latency: "2252 ms", errors: "9 parse", highlight: false, color: "oklch(65% 0.28 290)" },
              { system: "Groq LLaMA-3.1-8B", toolAcc: "0.75", argF1: "0.5942", uiGuide: "0.68", latency: "434 ms", errors: "9 API", highlight: false, color: "oklch(72% 0.22 60)" },
            ].map(({ system, toolAcc, argF1, uiGuide, latency, errors, highlight, color }) => (
              <div
                key={system}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr",
                  gap: "8px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  marginBottom: "6px",
                  background: highlight ? `${color}12` : "oklch(20% 0.02 260 / 0.4)",
                  border: highlight ? `1px solid ${color}44` : "1px solid transparent",
                  fontSize: "0.8rem",
                  alignItems: "center",
                }}
              >
                <span style={{ color: highlight ? "oklch(90% 0.01 260)" : "oklch(62% 0.02 260)", fontWeight: highlight ? 700 : 400 }}>
                  {system}
                  {highlight && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "0.65rem",
                        padding: "2px 7px",
                        borderRadius: "999px",
                        background: `${color}20`,
                        border: `1px solid ${color}44`,
                        color,
                        fontWeight: 700,
                      }}
                    >
                      ours
                    </span>
                  )}
                </span>
                <span style={{ color: highlight ? color : "oklch(55% 0.02 260)", fontWeight: highlight ? 800 : 400, textAlign: "center" }}>{toolAcc}</span>
                <span style={{ color: highlight ? color : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{argF1}</span>
                <span style={{ color: highlight ? color : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{uiGuide}</span>
                <span style={{ color: highlight ? "oklch(72% 0.22 60)" : "oklch(55% 0.02 260)", fontWeight: highlight ? 700 : 400, textAlign: "center" }}>{latency}</span>
                <span style={{ color: errors === "0" ? "oklch(72% 0.20 155)" : "oklch(65% 0.20 30)", fontWeight: 700, textAlign: "center" }}>{errors}</span>
              </div>
            ))}

            {/* Key insights */}
            <div
              style={{
                marginTop: "18px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {[
                { icon: "✅", text: "Matches Sarvam accuracy with 2× faster latency" },
                { icon: "🚫", text: "Zero parse errors vs 9 for both baselines" },
                { icon: "💰", text: "Zero routing API cost — fully local" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "oklch(72% 0.20 155 / 0.08)",
                    border: "1px solid oklch(72% 0.20 155 / 0.22)",
                    fontSize: "0.78rem",
                    color: "oklch(72% 0.02 260)",
                  }}
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Slide>

      {/* ══════════════════════════════════
          5b. RESULTS — Multilingual Breakdown
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "460px",
            height: "460px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(65% 0.28 290 / 0.09), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="05 · Results — Part 2 of 4" color="oklch(65% 0.28 290)" />
          <SectionHeading>
            Multilingual{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(72% 0.22 60))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tool Accuracy
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "22px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* NexusBots */}
          <FadeIn delay={80}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(72% 0.20 155 / 0.32)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: "999px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: "oklch(72% 0.20 155 / 0.15)",
                    border: "1px solid oklch(72% 0.20 155 / 0.4)",
                    color: "oklch(72% 0.20 155)",
                  }}
                >
                  OURS
                </div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "oklch(90% 0.01 260)" }}>NexusBots</p>
              </div>
              <p style={{ fontSize: "0.75rem", color: "oklch(52% 0.02 260)", marginBottom: "14px" }}>Qwen3-0.6B + Enhanced Prompt</p>
              <MetricBar label="English (EN)" value="84%" pct={84} color="oklch(65% 0.28 290)" />
              <MetricBar label="Telugu (TE)" value="83%" pct={83} color="oklch(78% 0.16 195)" />
              <MetricBar label="Hindi (HI)" value="67%" pct={67} color="oklch(72% 0.22 60)" />
              {/* <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "9px",
                  background: "oklch(72% 0.20 155 / 0.08)",
                  border: "1px solid oklch(72% 0.20 155 / 0.22)",
                  fontSize: "0.76rem",
                  color: "oklch(68% 0.02 260)",
                }}
              >
                Strong in EN + TE · Hindi gap vs Sarvam
              </div> */}
            </div>
          </FadeIn>

          {/* Sarvam-M */}
          <FadeIn delay={160}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(65% 0.28 290 / 0.28)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "oklch(90% 0.01 260)", marginBottom: "4px" }}>Sarvam-M</p>
              <p style={{ fontSize: "0.75rem", color: "oklch(52% 0.02 260)", marginBottom: "14px" }}>thinking ON · 2252ms p50</p>
              <MetricBar label="Telugu (TE)" value="89%" pct={89} color="oklch(78% 0.16 195)" />
              <MetricBar label="Hindi (HI)" value="81%" pct={81} color="oklch(72% 0.22 60)" />
              <MetricBar label="English (EN)" value="73%" pct={73} color="oklch(65% 0.28 290)" />
              {/* <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "9px",
                  background: "oklch(65% 0.28 290 / 0.07)",
                  border: "1px solid oklch(65% 0.28 290 / 0.22)",
                  fontSize: "0.76rem",
                  color: "oklch(68% 0.02 260)",
                }}
              >
                Best Hindi · but high latency + parse errors
              </div> */}
            </div>
          </FadeIn>

          {/* Groq */}
          <FadeIn delay={240}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(72% 0.22 60 / 0.28)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "oklch(90% 0.01 260)", marginBottom: "4px" }}>Groq LLaMA-3.1-8B</p>
              <p style={{ fontSize: "0.75rem", color: "oklch(52% 0.02 260)", marginBottom: "14px" }}>Fast · 434ms p50</p>
              <MetricBar label="English (EN)" value="75%" pct={75} color="oklch(65% 0.28 290)" />
              <MetricBar label="Telugu (TE)" value="83%" pct={83} color="oklch(78% 0.16 195)" />
              <MetricBar label="Hindi (HI)" value="70%" pct={70} color="oklch(72% 0.22 60)" />
              {/* <div
                style={{
                  marginTop: "14px",
                  padding: "10px 14px",
                  borderRadius: "9px",
                  background: "oklch(72% 0.22 60 / 0.07)",
                  border: "1px solid oklch(72% 0.22 60 / 0.22)",
                  fontSize: "0.76rem",
                  color: "oklch(68% 0.02 260)",
                }}
              >
                Fastest · best UI guidance · but 9 API errors
              </div> */}
            </div>
          </FadeIn>
        </div>

        {/* Observations callout */}
        <FadeIn delay={300}>
          <div
            className="glass-card"
            style={{
              marginTop: "24px",
              borderRadius: "14px",
              padding: "18px 24px",
              position: "relative",
              zIndex: 1,
              borderColor: "oklch(65% 0.28 290 / 0.22)",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "0.75rem", color: "oklch(52% 0.02 260)", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: "10px" }}>
              Key Observations
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {[
                { icon: "🔵", text: "Our model leads in English (84%) and matches Groq in Telugu (83%), while remaining competitive in Hindi (67%)." },
                // { icon: "🟡", text: "Hindi gap (67% vs 81%) is likely due to fewer romanized HI examples — addressable with more data" },
                { icon: "🟢", text: "Despite using a significantly smaller 0.6B model with local routing, our system achieves comparable multilingual performance to larger API-based models, with lower latency and zero routing errors." },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: "8px", flex: "1 1 260px", alignItems: "flex-start", fontSize: "0.8rem", color: "oklch(68% 0.02 260)", lineHeight: 1.6 }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Slide>

      {/* ══════════════════════════════════
          5c. RESULTS — Ablation Study
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            top: "-100px",
            right: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(72% 0.22 60 / 0.10), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="05 · Results — Part 3 of 4" color="oklch(72% 0.22 60)" />
          <SectionHeading>
            Ablation Study:{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.22 60), oklch(72% 0.20 155))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              What Actually Works
            </span>
          </SectionHeading>
        </FadeIn>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))",
            gap: "28px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Approach comparison bars */}
          <FadeIn delay={80}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "28px 26px", borderColor: "oklch(72% 0.22 60 / 0.28)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(72% 0.22 60)", marginBottom: "20px", letterSpacing: "0.04em" }}>
                Tool Accuracy by Approach
              </p>

              <MetricBar label="Base Model +Enhanced Prompt (Ours)" value="79%" pct={79} color="oklch(72% 0.20 155)" />
              <MetricBar label="Qwen3 FC v2" value="64%" pct={64} color="oklch(65% 0.28 290)" />
              <MetricBar label="Base Model (Original Prompt)" value="55%" pct={55} color="oklch(78% 0.16 195)" />
              <MetricBar label="Qwen3 FC v1" value="48%" pct={48} color="oklch(60% 0.14 260)" />
              <MetricBar label="Heuristic Router" value="35%" pct={35} color="oklch(55% 0.10 260)" />
            </div>
          </FadeIn>

          {/* Right: key takeaway + base model detail */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Big takeaway */}
            <FadeIn delay={120}>
              <div
                style={{
                  borderRadius: "16px",
                  padding: "28px 26px",
                  background: "linear-gradient(135deg, oklch(72% 0.20 155 / 0.10), oklch(72% 0.22 60 / 0.08))",
                  border: "1px solid oklch(72% 0.20 155 / 0.30)",
                }}
              >
                <p style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(55% 0.02 260)", marginBottom: "12px" }}>
                  Key Takeaway
                </p>
                <p
                  style={{
                    fontSize: "clamp(1.1rem, 2vw, 1.45rem)",
                    fontWeight: 800,
                    color: "oklch(92% 0.01 260)",
                    lineHeight: 1.4,
                    marginBottom: "14px",
                  }}
                >
                  Prompt Engineering{" "}
                  <span style={{ color: "oklch(72% 0.20 155)" }}>&gt;</span>{" "}
                  Fine-Tuning
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(65% 0.02 260)", lineHeight: 1.75 }}>
                  For a small llm model, carefully structured prompts outperform QLoRA adapters (Qwen3 FC v2) by up to <strong style={{ color: "oklch(72% 0.22 60)" }}>+15 pp</strong>,{" "}
                  as well as <strong style={{ color: "oklch(72% 0.22 60)" }}>+24 pp</strong> over the Base Model (Original Prompt) and{" "}
                  <strong style={{ color: "oklch(72% 0.20 155)" }}>+44 pp</strong> over Heuristics Router.
                  These results suggest that fine-tuning small models with limited data can degrade generalization, while structured prompting better preserves pre-trained capabilities.
                </p>
              </div>
            </FadeIn>

            {/* Base model breakdown */}
            <FadeIn delay={200}>
              <div className="glass-card" style={{ borderRadius: "16px", padding: "22px 24px", borderColor: "oklch(78% 0.16 195 / 0.26)" }}>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "oklch(78% 0.16 195)", marginBottom: "14px", letterSpacing: "0.04em" }}>
                  Base Model Evaluation (75 prompts)
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    marginBottom: "14px",
                  }}
                >
                  {[
                    { label: "Tool Acc · EN", val: "66%", color: "oklch(65% 0.28 290)" },
                    { label: "Tool Acc · HI", val: "71%", color: "oklch(72% 0.22 60)" },
                    { label: "Tool Acc · TE", val: "68%", color: "oklch(78% 0.16 195)" },
                    { label: "Tool Acc · All", val: "68%", color: "oklch(72% 0.20 155)" },
                    { label: "Full Match · EN", val: "16%", color: "oklch(65% 0.28 290)" },
                    { label: "Full Match · HI", val: "21%", color: "oklch(72% 0.22 60)" },
                    { label: "Full Match · TE", val: "11%", color: "oklch(78% 0.16 195)" },
                    { label: "Full Match · All", val: "16%", color: "oklch(72% 0.20 155)" },
                  ].map(({ label, val, color }) => (
                    <div
                      key={label}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "oklch(20% 0.02 260 / 0.5)",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ fontSize: "0.6rem", color: "oklch(45% 0.02 260)", marginBottom: "3px" }}>{label}</p>
                      <p style={{ fontSize: "0.9rem", fontWeight: 800, color }}>{val}</p>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: "0.76rem", color: "oklch(52% 0.02 260)", lineHeight: 1.6 }}>
                  Parse rate 87% model can generate valid JSON but misses tool names without better prompting.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </Slide>

      {/* ══════════════════════════════════
          5d. RESULTS — Cost Analysis
      ══════════════════════════════════ */}
      <Slide>
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: "-120px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(72% 0.22 60 / 0.09), transparent 70%)",
          }}
        />

        <FadeIn delay={0}>
          <SectionLabel text="05 · Results — Part 4 of 4" color="oklch(72% 0.22 60)" />
          <SectionHeading>
            Cost Analysis{" "}
            <span
              style={{
                background: "linear-gradient(135deg, oklch(72% 0.22 60), oklch(72% 0.20 155))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              &amp; Final Summary
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
          {/* Cost table */}
          <FadeIn delay={80}>
            <div className="glass-card" style={{ borderRadius: "16px", padding: "26px 24px", borderColor: "oklch(72% 0.22 60 / 0.28)" }}>
              <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "oklch(72% 0.22 60)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                Cost at 10,000 Queries / Day
              </p>
              <p style={{ fontSize: "0.76rem", color: "oklch(50% 0.02 260)", marginBottom: "18px" }}>
                ~500 input + 150 output tokens per query
              </p>

              {/* Headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: "8px",
                  padding: "5px 12px",
                  fontSize: "0.66rem",
                  color: "oklch(42% 0.02 260)",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                <span>Architecture</span>
                <span style={{ textAlign: "center" }}>Routing Cost</span>
                <span style={{ textAlign: "center" }}>NLG Cost</span>
                <span style={{ textAlign: "center" }}>Total / day</span>
              </div>

              {[
                { arch: "Full GPT-4o", routing: "$12–28", nlg: "$12–28", total: "$24–56", color: "oklch(65% 0.20 30)", best: false },
                { arch: "Full Sarvam-M", routing: "$0.95", nlg: "$0.95", total: "$1.90", color: "oklch(65% 0.28 290)", best: false },
                { arch: "NexusBots (Ours)", routing: "$0 (local)", nlg: "$0.95", total: "~$0.95", color: "oklch(72% 0.20 155)", best: true },
              ].map(({ arch, routing, nlg, total, color, best }) => (
                <div
                  key={arch}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: "8px",
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "6px",
                    background: best ? `${color}12` : "oklch(20% 0.02 260 / 0.4)",
                    border: best ? `1px solid ${color}44` : "1px solid transparent",
                    fontSize: "0.8rem",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: best ? "oklch(90% 0.01 260)" : "oklch(62% 0.02 260)", fontWeight: best ? 700 : 400 }}>
                    {arch}
                    {best && <span style={{ marginLeft: "8px", fontSize: "0.62rem", padding: "1px 6px", borderRadius: "999px", background: `${color}20`, border: `1px solid ${color}44`, color }}>✅</span>}
                  </span>
                  <span style={{ color: routing === "$0 (local)" ? "oklch(72% 0.20 155)" : "oklch(55% 0.02 260)", textAlign: "center", fontWeight: routing === "$0 (local)" ? 700 : 400 }}>{routing}</span>
                  <span style={{ color: "oklch(55% 0.02 260)", textAlign: "center" }}>{nlg}</span>
                  <span style={{ color, fontWeight: 800, textAlign: "center" }}>{total}</span>
                </div>
              ))}

              <div style={{ marginTop: "18px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 140px", textAlign: "center", padding: "14px", borderRadius: "10px", background: "oklch(72% 0.20 155 / 0.09)", border: "1px solid oklch(72% 0.20 155 / 0.25)" }}>
                  <p style={{ fontWeight: 900, fontSize: "1.5rem", color: "oklch(72% 0.20 155)", lineHeight: 1 }}>50%</p>
                  <p style={{ fontSize: "0.72rem", color: "oklch(52% 0.02 260)", marginTop: "4px" }}>cheaper than Sarvam-only</p>
                </div>
                <div style={{ flex: "1 1 140px", textAlign: "center", padding: "14px", borderRadius: "10px", background: "oklch(72% 0.22 60 / 0.09)", border: "1px solid oklch(72% 0.22 60 / 0.25)" }}>
                  <p style={{ fontWeight: 900, fontSize: "1.5rem", color: "oklch(72% 0.22 60)", lineHeight: 1 }}>~30×</p>
                  <p style={{ fontSize: "0.72rem", color: "oklch(52% 0.02 260)", marginTop: "4px" }}>cheaper than GPT-4o systems</p>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Final result summary */}
          <FadeIn delay={160}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div
                className="glass-card"
                style={{
                  borderRadius: "16px",
                  padding: "26px 24px",
                  borderColor: "oklch(72% 0.20 155 / 0.30)",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "oklch(72% 0.20 155)",
                    marginBottom: "16px",
                    letterSpacing: "0.04em",
                  }}
                >
                  Ablation Summary — Tool Accuracy
                </p>

                {/* Removed glass-card here */}
                <div style={{ padding: "28px 26px" }}>
                  <MetricBar label="Base Model +Enhanced Prompt (Ours)" value="79%" pct={79} color="oklch(72% 0.20 155)" />
                  <MetricBar label="Qwen3 FC v2" value="64%" pct={64} color="oklch(65% 0.28 290)" />
                  <MetricBar label="Base Model (Original Prompt)" value="55%" pct={55} color="oklch(78% 0.16 195)" />
                  <MetricBar label="Qwen3 FC v1" value="48%" pct={48} color="oklch(60% 0.14 260)" />
                  <MetricBar label="Heuristic Router" value="35%" pct={35} color="oklch(55% 0.10 260)" />
                </div>
              </div>

              {/* Model strength/weakness card */}
              <div className="glass-card" style={{ borderRadius: "16px", padding: "20px 22px" }}>
                <p style={{ fontWeight: 700, fontSize: "0.82rem", color: "oklch(55% 0.02 260)", marginBottom: "12px", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  Model Comparison
                </p>
                {[
                  { model: "Sarvam-M", strength: "High accuracy, strong Hindi", weakness: "High latency, parse errors", sc: "oklch(65% 0.28 290)" },
                  { model: "Groq LLaMA-8B", strength: "Very fast, best UI guidance", weakness: "API errors, lower consistency", sc: "oklch(72% 0.22 60)" },
                  { model: "NexusBots (Ours)", strength: "Balanced, cost-efficient, local", weakness: "Slightly lower UI guidance", sc: "oklch(72% 0.20 155)" },
                ].map(({ model, strength, weakness, sc }) => (
                  <div
                    key={model}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "9px",
                      marginBottom: "6px",
                      background: "oklch(20% 0.02 260 / 0.45)",
                      border: `1px solid ${sc}22`,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "10px",
                      fontSize: "0.74rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: sc }}>{model}</span>
                    <span style={{ color: "oklch(70% 0.02 260)" }}>✅ {strength}</span>
                    <span style={{ color: "oklch(55% 0.02 260)" }}>⚠ {weakness}</span>
                  </div>
                ))}
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
            <SectionLabel text="06 · Conclusion &amp; Takeaways" color="oklch(65% 0.28 290)" />
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
              Offloading tool-call classification to a 0.6B model with enhanced prompting enables local routing, reducing per-query cost by up to
              <strong style={{ color: "oklch(72% 0.22 60)" }}> 30×</strong> compared to GPT-4o and
              <strong style={{ color: "oklch(78% 0.16 195)" }}> 2×</strong> compared to full SARVAM-M, while maintaining competitive accuracy.
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
                  An English-trained 0.6B model serves Hindi and Telugu users via SARVAM STT and romanized inputs, eliminating the need for a separate multilingual model.
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
                  A first-class `ui_guide` key is emitted alongside each tool call, directly mapping model intent to on-screen interaction using Floating UI tooltips.
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
                  Local routing eliminates all routing API costs. Only SARVAM-M is used for natural-language generation, resulting in ~$0.95/day at 10k queries.
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
                { val: "0.6B", label: "Local Routing Model" },
                { val: "30×", label: "Cost Reduction vs GPT-4o" },
                { val: "79%", label: "Tool Accuracy" },
                { val: "3", label: "Languages Supported" },
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
