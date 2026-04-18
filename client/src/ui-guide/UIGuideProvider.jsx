import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./guide-pulse.css";
import flows from "./flows.json";

// Route each guide-id prefix lives on so we can auto-navigate
const ID_ROUTE = {
  "nav-":              "/",          // navbar is on every page
  "catalog-filter-":   "/catalog",
  "product-":          null,         // dynamic — stays on current
  "cart-":             null,         // drawer overlay — stays
  "order-track-":      "/orders",
  "orders-support-":   "/orders",
  "support-":          "/orders",    // support is merged into OrderHistory
};

function resolveRoute(guideId) {
  for (const [prefix, route] of Object.entries(ID_ROUTE)) {
    if (guideId.startsWith(prefix)) return route;
  }
  return null;
}

function findElement(guideId) {
  return document.querySelector(`[data-guide-id="${guideId}"]`);
}

// ─── Context ──────────────────────────────────────────────────────────────────
const UIGuideContext = createContext(null);

export function useUIGuide() {
  return useContext(UIGuideContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function UIGuideProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeFlow, setActiveFlow] = useState(null);   // flow key
  const [stepQueue, setStepQueue] = useState([]);        // remaining guide-ids
  const driverRef = useRef(null);
  const pulseElRef = useRef(null);

  function removePulse() {
    if (pulseElRef.current) {
      pulseElRef.current.classList.remove("guide-pulse");
      pulseElRef.current = null;
    }
  }

  function applyPulse(el) {
    removePulse();
    el.classList.add("guide-pulse");
    pulseElRef.current = el;
  }

  // Highlight the current step with driver.js popover + pulse class
  const highlightStep = useCallback((guideId) => {
    const el = findElement(guideId);
    if (!el) return false;

    applyPulse(el);

    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const drv = driver({
      overlayOpacity: 0.45,
      smoothScroll: true,
      allowClose: true,
      onDestroyed: () => {
        removePulse();
        setActiveFlow(null);
        setStepQueue([]);
      },
    });

    drv.highlight({
      element: `[data-guide-id="${guideId}"]`,
      popover: {
        title: labelFor(guideId),
        description: descFor(guideId),
        side: "bottom",
        align: "start",
      },
    });

    driverRef.current = drv;

    // Auto-advance when user clicks the highlighted element
    function onClick() {
      el.removeEventListener("click", onClick);
      // Give the click a tick to process, then advance
      setTimeout(() => advanceFlow(), 80);
    }
    el.addEventListener("click", onClick, { once: true });

    return true;
  }, []);

  // Try to highlight; if element not yet in DOM, retry after a short delay
  const tryHighlight = useCallback((guideId, retries = 8) => {
    if (highlightStep(guideId)) return;
    if (retries <= 0) return;
    setTimeout(() => tryHighlight(guideId, retries - 1), 200);
  }, [highlightStep]);

  // Advance to next step in the queue
  const advanceFlow = useCallback(() => {
    setStepQueue((prev) => {
      const [, ...rest] = prev;
      if (rest.length === 0) {
        if (driverRef.current) driverRef.current.destroy();
        removePulse();
        setActiveFlow(null);
        return [];
      }
      const nextId = rest[0];
      const route = resolveRoute(nextId);
      if (route && location.pathname !== route) {
        navigate(route);
        // highlight will be triggered by the route-change effect
      } else {
        tryHighlight(nextId);
      }
      return rest;
    });
  }, [navigate, location.pathname, tryHighlight]);

  // When route changes mid-flow, try to highlight the current front-of-queue step
  useEffect(() => {
    if (stepQueue.length === 0) return;
    const currentId = stepQueue[0];
    // Small delay for the new page to render
    const t = setTimeout(() => tryHighlight(currentId), 300);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Public: start a named flow
  const startFlow = useCallback((flowKey) => {
    const steps = flows[flowKey];
    if (!steps || steps.length === 0) return;

    // Clean up any running flow
    if (driverRef.current) driverRef.current.destroy();
    removePulse();

    setActiveFlow(flowKey);
    setStepQueue(steps);

    const firstId = steps[0];
    const route = resolveRoute(firstId);
    if (route && location.pathname !== route) {
      navigate(route);
    } else {
      tryHighlight(firstId);
    }
  }, [location.pathname, navigate, tryHighlight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) driverRef.current.destroy();
      removePulse();
    };
  }, []);

  return (
    <UIGuideContext.Provider value={{ startFlow, activeFlow }}>
      {children}
    </UIGuideContext.Provider>
  );
}

// Human-readable labels for popover titles
function labelFor(guideId) {
  const map = {
    "nav-home":                   "Go Home",
    "nav-catalog":                "Browse Products",
    "nav-assistant":              "AI Assistant",
    "nav-orders":                 "Your Orders",
    "nav-cart":                   "Shopping Cart",
    "cart-checkout":              "Checkout",
    "order-track-latest":         "Track Latest Order",
    "catalog-filter-Drone":       "Drone Category",
    "catalog-filter-Kitchen":     "Kitchen Category",
    "catalog-filter-Home Cleaner":"Home Cleaner Category",
    "catalog-filter-Humanoid":    "Humanoid Category",
    "product-add-to-cart":        "Add to Cart",
    "product-compare":            "Compare Products",
    "orders-support-tab":         "Support & Tickets",
    "support-new-ticket":         "Create New Ticket",
    "support-ticket-list":        "View Your Tickets",
  };
  return map[guideId] ?? guideId;
}

function descFor(guideId) {
  if (guideId.startsWith("nav-"))            return "Click to navigate.";
  if (guideId.startsWith("catalog-filter-")) return "Click to filter by this category.";
  if (guideId === "cart-checkout")           return "Proceed to payment when ready.";
  if (guideId === "order-track-latest")      return "Track the status of your most recent order.";
  if (guideId === "product-compare")         return "Compare this robot with similar models.";
  if (guideId === "orders-support-tab")      return "Navigate to the support section.";
  if (guideId === "support-new-ticket")      return "Create a new support ticket for your issue.";
  if (guideId === "support-ticket-list")     return "View and manage your existing tickets.";
  return "Click to continue.";
}
