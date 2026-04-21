import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { UserActivityProvider } from "./context/UserActivityContext";
import { UIGuideProvider } from "./ui-guide/UIGuideProvider";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AISidePanel from "./components/AISidePanel";
import CartDrawer from "./components/CartDrawer";
import Home from "./pages/Home";
import Present from "./pages/Present";
import CategoryPage from "./pages/CategoryPage";
import RobotDetail from "./pages/RobotDetail";
import OrderHistory from "./pages/OrderHistory";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const openAI = useCallback(() => setIsAIOpen(true), []);
  const closeAI = useCallback(() => setIsAIOpen(false), []);

  // Listen for open-chat custom events to open the side panel
  useEffect(() => {
    function handleOpenChat() {
      setIsAIOpen(true);
    }
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <UserActivityProvider>
        <UIGuideProvider>
          <div className="min-h-screen flex flex-col bg-primary">
            <Navbar onCartClick={() => setIsCartOpen(true)} onAIClick={openAI} isAIOpen={isAIOpen} />
            <div className="flex flex-1">
              <main
                className="flex-1 min-w-0"
                style={{
                  transition: "margin 0.35s var(--ease-out-expo)",
                }}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/present" element={<Present />} />
                  <Route path="/catalog" element={<Navigate to="/catalog/kitchen" replace />} />
                  <Route path="/catalog/:slug" element={<CategoryPage />} />
                  <Route path="/robot/:id" element={<RobotDetail />} />
                  <Route path="/orders" element={<OrderHistory />} />
                </Routes>
                <Footer />
              </main>
              <AISidePanel isOpen={isAIOpen} onClose={closeAI} />
            </div>
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            {/* Mobile AI FAB */}
            {!isAIOpen && (
              <button
                onClick={openAI}
                aria-label="Open AI assistant"
                className="md:hidden fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--color-accent), oklch(72% 0.22 280))",
                  boxShadow: "0 8px 24px oklch(65% 0.28 290 / 0.45), 0 0 0 4px oklch(65% 0.28 290 / 0.12)",
                  color: "#fff",
                }}
              >
                <Sparkles size={22} />
              </button>
            )}
          </div>
        </UIGuideProvider>
      </UserActivityProvider>
    </Router>
  );
}

export default App;
