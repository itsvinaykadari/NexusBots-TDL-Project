import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { computePosition, autoUpdate, offset, flip, shift, arrow } from "@floating-ui/react-dom";
import "./guide-pulse.css";
import flows from "./flows.json";

// Route each guide-id prefix lives on so we can auto-navigate.
// null means "don't force navigation — find a visible element wherever it is."
const ID_ROUTE = {
  "nav-":              null,
  "catalog-filter-":   null,      // exists in both mega-menu AND /catalog page
  "catalog-card-":     null,
  "product-":          null,
  "cart-":             null,
  "order-track-":      "/orders",
  "orders-support-":   "/orders",
  "support-":          "/orders",
};

function resolveRoute(guideId) {
  for (const [prefix, route] of Object.entries(ID_ROUTE)) {
    if (guideId.startsWith(prefix)) return route;
  }
  return null;
}

function isVisible(el) {
  let node = el;
  while (node && node !== document.body) {
    const cs = window.getComputedStyle(node);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) < 0.05) return false;
    node = node.parentElement;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findElement(guideId) {
  const els = document.querySelectorAll(`[data-guide-id="${guideId}"]`);
  for (const el of els) {
    if (isVisible(el)) return el;
  }
  return null;
}

const UIGuideContext = createContext(null);

export function useUIGuide() {
  return useContext(UIGuideContext);
}

// ─── Tooltip component (portaled, Floating UI anchored) ─────────────
function GuideTooltip({ targetEl, title, description, stepInfo, onSkip }) {
  const tipRef = useRef(null);
  const arrowRef = useRef(null);

  useEffect(() => {
    if (!targetEl || !tipRef.current) return;
    const tip = tipRef.current;
    const arrowEl = arrowRef.current;

    const update = () => {
      computePosition(targetEl, tip, {
        placement: "bottom-start",
        middleware: [
          offset(12),
          flip({ padding: 12 }),
          shift({ padding: 12 }),
          arrow({ element: arrowEl }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        Object.assign(tip.style, { left: `${x}px`, top: `${y}px` });
        if (middlewareData.arrow && arrowEl) {
          const { x: ax, y: ay } = middlewareData.arrow;
          const side = placement.split("-")[0];
          const staticSide = { top: "bottom", bottom: "top", left: "right", right: "left" }[side];
          Object.assign(arrowEl.style, {
            left: ax != null ? `${ax}px` : "",
            top: ay != null ? `${ay}px` : "",
            [staticSide]: "-5px",
          });
        }
      });
    };

    const cleanup = autoUpdate(targetEl, tip, update);
    return cleanup;
  }, [targetEl]);

  if (!targetEl) return null;

  return createPortal(
    <div ref={tipRef} className="guide-tooltip" role="dialog" aria-live="polite">
      <div className="guide-tooltip-title">{title}</div>
      {description && <div className="guide-tooltip-desc">{description}</div>}
      <div className="guide-tooltip-actions">
        <span className="guide-tooltip-step">{stepInfo}</span>
        <button className="guide-tooltip-skip" onClick={onSkip}>Skip</button>
      </div>
      <div ref={arrowRef} className="guide-tooltip-arrow" />
    </div>,
    document.body
  );
}

// ─── Provider ─────────────────────────────────────────────────────────
export function UIGuideProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFlow, setActiveFlow] = useState(null);
  const [stepQueue, setStepQueue] = useState([]);
  const [flowStepsTotal, setFlowStepsTotal] = useState(0);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [currentGuideId, setCurrentGuideId] = useState(null);
  const activeElRef = useRef(null);
  const clickHandlerRef = useRef(null);

  const cleanupHighlight = useCallback(() => {
    if (activeElRef.current) {
      activeElRef.current.classList.remove("guide-active");
      if (clickHandlerRef.current) {
        activeElRef.current.removeEventListener("click", clickHandlerRef.current);
      }
      activeElRef.current = null;
    }
    clickHandlerRef.current = null;
  }, []);

  const endFlow = useCallback(() => {
    cleanupHighlight();
    setCurrentTarget(null);
    setCurrentGuideId(null);
    setActiveFlow(null);
    setStepQueue([]);
    setFlowStepsTotal(0);
  }, [cleanupHighlight]);

  // Advance to next step
  const advanceFlowRef = useRef(null);

  const highlightStep = useCallback((guideId) => {
    const el = findElement(guideId);
    if (!el) return false;

    cleanupHighlight();

    el.classList.add("guide-active");
    activeElRef.current = el;
    setCurrentTarget(el);
    setCurrentGuideId(guideId);

    // Scroll element into view if needed
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    // Click on the element itself advances the flow
    const onClick = () => {
      setTimeout(() => advanceFlowRef.current?.(), 80);
    };
    el.addEventListener("click", onClick, { once: true });
    clickHandlerRef.current = onClick;

    return true;
  }, [cleanupHighlight]);

  const tryHighlight = useCallback((guideId, retries = 10) => {
    if (highlightStep(guideId)) return;
    if (retries <= 0) return;
    setTimeout(() => tryHighlight(guideId, retries - 1), 200);
  }, [highlightStep]);

  const advanceFlow = useCallback(() => {
    setStepQueue((prev) => (prev.length <= 1 ? [] : prev.slice(1)));
  }, []);

  advanceFlowRef.current = advanceFlow;

  // Drive navigation/highlight from state changes (not inside setState updaters)
  useEffect(() => {
    if (!activeFlow) return;

    if (stepQueue.length === 0) {
      endFlow();
      return;
    }

    const currentId = stepQueue[0];
    const route = resolveRoute(currentId);

    if (route && location.pathname !== route) {
      const navTimer = setTimeout(() => navigate(route), 0);
      return () => clearTimeout(navTimer);
    }

    const highlightTimer = setTimeout(() => tryHighlight(currentId), 300);
    return () => clearTimeout(highlightTimer);
  }, [activeFlow, stepQueue, location.pathname, navigate, tryHighlight, endFlow]);

  const resolveSteps = useCallback((flowKey) => {
    if (typeof flowKey !== "string") return null;

    if (Array.isArray(flows[flowKey])) {
      return flows[flowKey];
    }

    if (flowKey.startsWith("locate_robot:")) {
      const targetId = Number.parseInt(flowKey.split(":")[1], 10);
      if (Number.isFinite(targetId) && targetId > 0) {
        return [`catalog-card-${targetId}`];
      }
    }

    if (flowKey.startsWith("locate_path:")) {
      const [, category, targetIdRaw] = flowKey.split(":");
      const targetId = Number.parseInt(targetIdRaw, 10);
      if (category && Number.isFinite(targetId) && targetId > 0) {
        return [
          "nav-catalog",
          `catalog-filter-${category}`,
          `catalog-card-${targetId}`,
        ];
      }
    }

    return null;
  }, []);

  const startFlow = useCallback((flowKey) => {
    const steps = resolveSteps(flowKey);
    if (!steps || steps.length === 0) return;

    cleanupHighlight();
    setCurrentTarget(null);
    setCurrentGuideId(null);
    setActiveFlow(flowKey);
    setStepQueue(steps);
    setFlowStepsTotal(steps.length);
  }, [cleanupHighlight, resolveSteps]);

  // Escape closes guide
  useEffect(() => {
    if (!currentTarget) return;
    const onKey = (e) => { if (e.key === "Escape") endFlow(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTarget, endFlow]);

  useEffect(() => () => cleanupHighlight(), [cleanupHighlight]);

  const totalSteps = flowStepsTotal;
  const currentStepIdx = totalSteps - stepQueue.length + 1;

  return (
    <UIGuideContext.Provider value={{ startFlow, activeFlow }}>
      {children}
      {currentTarget && currentGuideId && (
        <GuideTooltip
          targetEl={currentTarget}
          title={labelFor(currentGuideId)}
          description={descFor(currentGuideId)}
          stepInfo={`Step ${currentStepIdx} of ${totalSteps}`}
          onSkip={endFlow}
        />
      )}
    </UIGuideContext.Provider>
  );
}

function labelFor(guideId) {
  if (guideId.startsWith("catalog-card-")) return "Found Robot";

  const map = {
    "nav-home": "Go Home",
    "nav-catalog": "Browse Products",
    "nav-assistant": "AI Assistant",
    "nav-orders": "Your Orders",
    "nav-cart": "Shopping Cart",
    "cart-checkout": "Checkout",
    "order-track-latest": "Track Latest Order",
    "catalog-filter-Drone": "Drone Category",
    "catalog-filter-Kitchen": "Kitchen Category",
    "catalog-filter-Home Cleaner": "Home Cleaner Category",
    "catalog-filter-Humanoid": "Humanoid Category",
    "product-add-to-cart": "Add to Cart",
    "product-compare": "Compare Products",
    "orders-support-tab": "Support & Tickets",
    "support-new-ticket": "Create New Ticket",
    "support-ticket-list": "View Your Tickets",
  };
  return map[guideId] ?? guideId;
}

function descFor(guideId) {
  if (guideId.startsWith("catalog-card-")) return "Click this robot card to open its details page.";
  if (guideId.startsWith("nav-")) return "Click the highlighted button to continue.";
  if (guideId.startsWith("catalog-filter-")) return "Click to filter by this category.";
  if (guideId === "cart-checkout") return "Proceed to payment when ready.";
  if (guideId === "order-track-latest") return "Track the status of your most recent order.";
  if (guideId === "product-compare") return "Compare this robot with similar models.";
  if (guideId === "orders-support-tab") return "Navigate to the support section.";
  if (guideId === "support-new-ticket") return "Create a new support ticket for your issue.";
  if (guideId === "support-ticket-list") return "View and manage your existing tickets.";
  return "Click the highlighted element to continue.";
}
