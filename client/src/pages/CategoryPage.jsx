import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChefHat, SprayCan, Plane, PersonStanding,
  ArrowLeft, Star, Sparkles,
  Timer, Wifi, ShieldCheck, Zap,
  Eye, Thermometer, Droplets, BookOpen,
  Home, Layers, SlidersHorizontal, Users,
} from "lucide-react";
import robots from "../data/robots";
import { useUserActivity } from "../context/UserActivityContext";
import RobotShowcard from "../components/RobotShowcard";

// ─── Slug ↔ category mapping ─────────────────────────────────────────
const SLUG_TO_CATEGORY = {
  kitchen: "Kitchen",
  "home-cleaner": "Home Cleaner",
  drone: "Drone",
  humanoid: "Humanoid",
};

export function categoryToSlug(cat) {
  return cat.toLowerCase().replace(/\s+/g, "-");
}

// ─── Rich editorial metadata per category ────────────────────────────
const CATEGORY_DETAILS = {
  Kitchen: {
    icon: ChefHat,
    accentHue: 80,
    tagline: "Your AI-powered sous-chef",
    overview:
      "Kitchen robots bring intelligence to your most-used room. From managing timers and recipe lookups to coordinating smart appliances, these companions turn your kitchen into a hands-free command center.",
    stats: { priceRange: "$599 – $1,599", avgRating: "4.4", robots: 3 },
    useCases: [
      {
        icon: Timer,
        title: "Timer & Recipe Management",
        desc: "Set multi-step cooking timers, look up recipes with voice commands, and get step-by-step guidance without touching your phone.",
      },
      {
        icon: Wifi,
        title: "Smart Appliance Control",
        desc: "Integrate with your oven, coffee maker, and refrigerator — start preheating, schedule brewing, or check food stocks hands-free.",
      },
      {
        icon: Eye,
        title: "Remote Kitchen Monitoring",
        desc: "Check on boiling pots or oven progress from another room via live camera feeds and automatic alerts when something needs attention.",
      },
      {
        icon: Zap,
        title: "Hands-Free Assistance",
        desc: "Voice-activate reminders, unit conversions, shopping list additions, and grocery ordering without stopping what you're doing.",
      },
    ],
    buyingGuide: [
      { title: "Display Size", tip: "Larger displays (10\"+) are easier to read across a kitchen. Consider whether you prefer touch or voice-only interaction." },
      { title: "Voice Platform", tip: "Check if it integrates with Alexa, Google Assistant, or Siri — your existing smart home ecosystem matters." },
      { title: "Battery Life", tip: "Kitchen robots move around. 4–5 hours of battery covers a full day of light use; plan for nightly charging." },
      { title: "Connectivity", tip: "Wi-Fi 6 or 6E ensures stable streaming for video calls and live recipe content while you cook." },
    ],
    whoItsFor: ["Home cooks who multitask", "Smart home enthusiasts", "Busy families", "Remote caregivers"],
  },

  "Home Cleaner": {
    icon: SprayCan,
    accentHue: 160,
    tagline: "Spotless floors, zero effort",
    overview:
      "Home cleaning robots handle the daily grind so you don't have to. Modern units combine vacuum, mop, and self-maintenance into one autonomous system that adapts to your schedule and floor plan.",
    stats: { priceRange: "$499 – $1,799", avgRating: "4.5", robots: 3 },
    useCases: [
      {
        icon: Home,
        title: "Autonomous Floor Vacuuming",
        desc: "Smart-mapped robots navigate furniture, detect debris, and clean every corner — returning to dock and emptying themselves automatically.",
      },
      {
        icon: Droplets,
        title: "Robotic Mopping",
        desc: "Dual-roller vibration mops scrub hard floors while simultaneously vacuuming, cutting your cleaning time to near zero.",
      },
      {
        icon: Eye,
        title: "Window & Surface Cleaning",
        desc: "Dedicated window robots cling to glass with suction, plan systematic routes, and spray-wipe without any human setup mid-run.",
      },
      {
        icon: SlidersHorizontal,
        title: "Zone-Based Scheduling",
        desc: "Define no-go areas, priority rooms, and daily schedules through an app — your robot cleans exactly where and when you need it.",
      },
    ],
    buyingGuide: [
      { title: "Suction Power", tip: "Higher Pa (3,000–10,000+) handles pet hair and debris better. Mid-range (2,000–4,000 Pa) suits most homes." },
      { title: "Navigation Type", tip: "LiDAR mapping creates accurate floor plans; camera-based is cheaper but less precise in low light." },
      { title: "Dock Features", tip: "Auto-empty docks let you go weeks without touching the robot. Auto-wash docks keep mop pads clean automatically." },
      { title: "Runtime per Charge", tip: "75–180 minutes covers most homes in one pass. Larger homes benefit from auto-resume-after-charging." },
    ],
    whoItsFor: ["Pet owners", "Allergy sufferers", "Busy professionals", "Multi-floor homeowners"],
  },

  Drone: {
    icon: Plane,
    accentHue: 240,
    tagline: "Eyes in the sky, on the ground",
    overview:
      "Drone robots span a wide range — from compact indoor security cameras that fly preset patrol routes to enterprise-grade thermal inspection platforms. There's a drone for every surveillance or maintenance need.",
    stats: { priceRange: "$249 – $13,600", avgRating: "4.4", robots: 3 },
    useCases: [
      {
        icon: ShieldCheck,
        title: "Indoor Security Patrol",
        desc: "Autonomous drones fly programmed routes inside your home, stream live HD footage, and alert you to intrusions — all from a dock when idle.",
      },
      {
        icon: Thermometer,
        title: "Enterprise Thermal Inspection",
        desc: "Industrial drones with thermal cameras detect heat signatures for infrastructure inspection, emergency response, and energy audits.",
      },
      {
        icon: Droplets,
        title: "Pool Surface Cleaning",
        desc: "Water-surface drones patrol pools with sonar navigation, collecting debris, leaves, and oils without requiring manual operation.",
      },
      {
        icon: Eye,
        title: "Aerial Monitoring & Survey",
        desc: "High-resolution imaging combined with intelligent flight paths makes aerial survey, mapping, and data collection fast and repeatable.",
      },
    ],
    buyingGuide: [
      { title: "Flight / Runtime", tip: "Indoor patrol drones run 5–10 min (auto-dock); enterprise models reach 30–41 min. Match to mission length." },
      { title: "Camera Quality", tip: "1080p suits home security; thermal + 48MP zoom is needed for professional inspections and long-range capture." },
      { title: "Obstacle Avoidance", tip: "Multi-sensor avoidance (LiDAR + vision) is essential for confined indoor spaces and complex outdoor environments." },
      { title: "Weatherproofing", tip: "IP55+ rating is required for outdoor or industrial use. Consumer models are typically indoor-only." },
    ],
    whoItsFor: ["Homeowners & renters", "Pool owners", "Enterprise inspection teams", "Emergency responders"],
  },

  Humanoid: {
    icon: PersonStanding,
    accentHue: 310,
    tagline: "Learn, build, and grow together",
    overview:
      "Humanoid and educational robots make abstract concepts tangible. Whether introducing a child to coding logic or running a classroom robotics curriculum, these robots turn learning into a hands-on, social experience.",
    stats: { priceRange: "$149 – $395", avgRating: "4.7", robots: 3 },
    useCases: [
      {
        icon: Sparkles,
        title: "Interactive Learning Companion",
        desc: "Conversational AI adapts to each child's pace, asks questions, tells stories, and provides educational content without screen overload.",
      },
      {
        icon: Zap,
        title: "Coding & STEM Education",
        desc: "Block-based and Python programming interfaces let beginners write their first programs, control motors, and see results in real time.",
      },
      {
        icon: Layers,
        title: "Hands-On Classroom Projects",
        desc: "Build-and-program kits with guided lessons align to national STEM curricula, keeping students engaged across 40+ structured sessions.",
      },
      {
        icon: Users,
        title: "Social-Emotional Development",
        desc: "Expressive faces, emotion recognition, and responsive personalities help children develop empathy and communication skills through play.",
      },
    ],
    buyingGuide: [
      { title: "Age Range", tip: "Match the robot to your child's age — 5-7 suits simpler interaction; 8-14 benefits from programmable models." },
      { title: "Programming Depth", tip: "Blockly (drag-and-drop) is great for beginners; Scratch + Python gives older students room to grow." },
      { title: "Curriculum Alignment", tip: "Look for robots with structured lesson plans and teacher guides if you're purchasing for classroom use." },
      { title: "Durability & Safety", tip: "Educational robots take drops. Look for rounded edges, non-toxic materials, and CE/FCC certification." },
    ],
    whoItsFor: ["Kids aged 5–14", "Parents & caregivers", "Teachers & schools", "STEM program coordinators"],
  },
};

// ─── Stat pill ───────────────────────────────────────────────────────
function StatPill({ label, value, hue }) {
  return (
    <div
      className="flex flex-col gap-0.5 px-5 py-3 rounded-xl"
      style={{
        background: `oklch(65% 0.20 ${hue} / 0.08)`,
        border: `1px solid oklch(65% 0.20 ${hue} / 0.18)`,
      }}
    >
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-base font-bold text-white">{value}</span>
    </div>
  );
}

// ─── Use-case card ───────────────────────────────────────────────────
function UseCaseCard({ icon: Icon, title, desc, hue }) {
  return (
    <div
      className="p-5 rounded-2xl border border-white/6 flex flex-col gap-3"
      style={{ background: "oklch(18% 0.025 255 / 0.7)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `oklch(65% 0.22 ${hue} / 0.12)`,
          border: `1px solid oklch(65% 0.22 ${hue} / 0.22)`,
        }}
      >
        <Icon size={18} style={{ color: `oklch(75% 0.22 ${hue})` }} />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-[13px] text-text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Buying guide item ───────────────────────────────────────────────
function GuideItem({ title, tip, index }) {
  return (
    <div className="flex gap-4 items-start">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ background: "oklch(65% 0.28 290 / 0.12)", color: "var(--color-accent)" }}
      >
        {index + 1}
      </span>
      <div>
        <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
        <p className="text-[13px] text-text-muted leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────
export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { setPage, setCategory: trackCategory } = useUserActivity();

  const categoryName = SLUG_TO_CATEGORY[slug];

  useEffect(() => {
    if (!categoryName) {
      navigate("/", { replace: true });
    }
  }, [categoryName, navigate]);

  useEffect(() => {
    if (categoryName) {
      setPage("catalog");
      trackCategory(categoryName);
    }
  }, [categoryName, setPage, trackCategory]);

  if (!categoryName) return null;

  const details = CATEGORY_DETAILS[categoryName];
  const { icon: Icon, accentHue, tagline, overview, stats, useCases, buyingGuide, whoItsFor } = details;

  const categoryRobots = [...robots]
    .filter((r) => r.category === categoryName)
    .sort((a, b) => b.rating - a.rating);
  const [hero, ...rest] = categoryRobots;

  const avgRating = (
    categoryRobots.reduce((s, r) => s + r.rating, 0) / categoryRobots.length
  ).toFixed(1);

  return (
    <div className="bg-grid min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-24 left-0 right-0 h-[500px] opacity-20"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, oklch(65% 0.25 ${accentHue} / 0.5), transparent 70%)`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10">
          <div className="flex items-start gap-5 mb-6">
            {/* Category icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `oklch(65% 0.22 ${accentHue} / 0.12)`,
                border: `1px solid oklch(65% 0.22 ${accentHue} / 0.25)`,
                boxShadow: `0 0 32px oklch(65% 0.22 ${accentHue} / 0.15)`,
              }}
            >
              <Icon size={30} style={{ color: `oklch(75% 0.22 ${accentHue})` }} />
            </div>

            <div>
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-1"
                style={{ color: `oklch(75% 0.22 ${accentHue})` }}
              >
                {tagline}
              </p>
              <h1
                className="font-bold text-white leading-tight"
                style={{ fontSize: "clamp(2.2rem, 4vw + 0.5rem, 3.5rem)" }}
              >
                {categoryName} Robots
              </h1>
            </div>
          </div>

          <p className="text-text-muted leading-relaxed max-w-2xl mb-8" style={{ fontSize: "1.0625rem" }}>
            {overview}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 mb-8">
            <StatPill label="Robots available" value={`${stats.robots} models`} hue={accentHue} />
            <StatPill label="Price range" value={stats.priceRange} hue={accentHue} />
            <StatPill label="Avg. rating" value={`★ ${avgRating} / 5`} hue={accentHue} />
          </div>

          {/* Who it's for */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-text-muted font-medium self-center">Best for:</span>
            {whoItsFor.map((w) => (
              <span
                key={w}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "oklch(80% 0 0 / 0.05)",
                  border: "1px solid oklch(80% 0 0 / 0.1)",
                  color: "oklch(80% 0.01 255)",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── USE CASES ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">What can it do?</h2>
          <p className="text-sm text-text-muted">Core use cases for {categoryName} robots</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((uc) => (
            <UseCaseCard key={uc.title} {...uc} hue={accentHue} />
          ))}
        </div>
      </section>

      {/* ── ROBOTS ────────────────────────────────────────────────── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
        data-guide-id={`catalog-filter-${categoryName}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {categoryName} Lineup
            </h2>
            <p className="text-sm text-text-muted">
              {categoryRobots.length} robots, ranked by rating
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Star size={12} className="text-amber-400" fill="currentColor" />
            Top rated first
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hero && (
            <div className="lg:col-span-2">
              <RobotShowcard robot={hero} featured />
            </div>
          )}
          {rest.map((robot) => (
            <RobotShowcard key={robot.id} robot={robot} />
          ))}
        </div>
      </section>

      {/* ── BUYING GUIDE ──────────────────────────────────────────── */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
      >
        <div
          className="rounded-3xl border border-white/6 p-8 lg:p-10"
          style={{
            background: `linear-gradient(135deg, oklch(65% 0.18 ${accentHue} / 0.07), oklch(18% 0.025 255 / 0.6))`,
          }}
        >
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-1">
              Buying guide — what to look for
            </h2>
            <p className="text-sm text-text-muted">
              Key specs and considerations before you choose a {categoryName.toLowerCase()} robot
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {buyingGuide.map((item, i) => (
              <GuideItem key={item.title} {...item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER NAV ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Home
          </Link>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-chat", { detail: { mode: "ai" } }))}
            className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
          >
            <Sparkles size={14} /> Ask AI for a recommendation
          </button>
        </div>
      </section>

    </div>
  );
}
