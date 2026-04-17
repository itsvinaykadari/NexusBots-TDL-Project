import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus, Trash2, CreditCard, CheckCircle2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserActivity } from "../context/UserActivityContext";
import { getOrCreateUserId } from "../utils/user";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function CartDrawer({ isOpen, onClose }) {
  const { cart, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = useUserActivity();
  const [step, setStep] = useState("cart"); // cart | payment | success
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    userId: getOrCreateUserId(),
    email: "",
    paymentMethod: "card",
    upiId: "",
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  // Keep mounted for exit animation; reset internal state when closed
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 320);
      setStep("cart");
      setError("");
      setIsPaying(false);
      setOrderResult(null);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!paymentForm.userId.trim()) { setError("User ID is required."); return; }
    if (!paymentForm.email.trim()) { setError("Email is required."); return; }
    if (paymentForm.paymentMethod === "card") {
      if (!paymentForm.cardName || !paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvv) {
        setError("Please fill all card details."); return;
      }
    } else if (!paymentForm.upiId.trim()) {
      setError("UPI ID is required."); return;
    }

    setError("");
    setIsPaying(true);
    try {
      const payload = {
        user_id: paymentForm.userId.trim(),
        items: cart.map((item) => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total_amount: Number(total.toFixed(2)),
      };
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment failed.");
      setOrderResult(data);
      clearCart();
      setStep("success");
    } catch (err) {
      setError(err.message || "Payment failed.");
    } finally {
      setIsPaying(false);
    }
  }

  if (!mounted) return null;

  const slideStyle = {
    transform: isOpen ? "translateX(0)" : "translateX(100%)",
    transition: "transform 0.32s var(--ease-out-expo)",
  };
  const backdropStyle = {
    opacity: isOpen ? 1 : 0,
    transition: "opacity 0.32s var(--ease-out-expo)",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0% 0 0 / 0.6)", backdropFilter: "blur(4px)", ...backdropStyle }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col border-l"
        style={{
          background: "oklch(18% 0.032 255 / 0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "oklch(80% 0 0 / 0.1)",
          ...slideStyle,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "oklch(80% 0 0 / 0.08)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-accent" />
            <h2 className="text-white text-base font-semibold">
              {step === "cart" && "Your Cart"}
              {step === "payment" && "Checkout"}
              {step === "success" && "Order Placed"}
            </h2>
            {step === "cart" && cart.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--color-text-muted)", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CART STEP ── */}
        {step === "cart" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShoppingBag size={40} className="text-text-muted mb-3 opacity-40" />
                  <p className="text-text-muted text-sm">Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border p-3 flex gap-3"
                    style={{
                      background: "var(--color-surface-elevated)",
                      borderColor: "oklch(80% 0 0 / 0.08)",
                    }}
                  >
                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-white text-sm font-medium truncate leading-snug">{item.name}</p>
                        <p className="text-text-muted text-xs mt-0.5">{item.category}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity stepper */}
                        <div
                          className="flex items-center gap-1 rounded-lg p-0.5"
                          style={{ background: "oklch(80% 0 0 / 0.05)", border: "1px solid oklch(80% 0 0 / 0.08)" }}
                        >
                          <button
                            onClick={() => decreaseQuantity(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-white text-xs font-semibold w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => increaseQuantity(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-bold">
                            ${(item.price * item.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-red-400/60 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 px-4 py-4 border-t"
              style={{ borderColor: "oklch(80% 0 0 / 0.08)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-text-muted text-sm">Total</span>
                <span className="text-white font-bold text-lg">${total.toLocaleString()}</span>
              </div>
              <button
                data-guide-id="cart-checkout"
                disabled={cart.length === 0}
                onClick={() => setStep("payment")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm"
                style={{
                  background: cart.length === 0 ? "oklch(65% 0.28 290 / 0.3)" : "var(--color-accent)",
                  boxShadow: cart.length > 0 ? "0 0 20px var(--color-accent-glow)" : "none",
                  cursor: cart.length === 0 ? "not-allowed" : "pointer",
                  transition: "background 0.2s, box-shadow 0.2s",
                }}
              >
                <CreditCard size={16} />
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === "payment" && (
          <form onSubmit={handlePaymentSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <InputField label="User ID" value={paymentForm.userId}
              onChange={(v) => setPaymentForm((p) => ({ ...p, userId: v }))}
              placeholder="USR-XXXXXX" />
            <InputField label="Email" type="email" value={paymentForm.email}
              onChange={(v) => setPaymentForm((p) => ({ ...p, email: v }))}
              placeholder="you@example.com" />

            <div>
              <label className="text-text-muted text-xs font-medium uppercase tracking-wider">Payment Method</label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-white text-sm"
                style={{ background: "var(--color-surface-elevated)", border: "1px solid oklch(80% 0 0 / 0.1)" }}
              >
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {paymentForm.paymentMethod === "upi" && (
              <InputField label="UPI ID" value={paymentForm.upiId}
                onChange={(v) => setPaymentForm((p) => ({ ...p, upiId: v }))}
                placeholder="name@bank" />
            )}
            {paymentForm.paymentMethod === "card" && (<>
              <InputField label="Card Holder Name" value={paymentForm.cardName}
                onChange={(v) => setPaymentForm((p) => ({ ...p, cardName: v }))} />
              <InputField label="Card Number" value={paymentForm.cardNumber}
                onChange={(v) => setPaymentForm((p) => ({ ...p, cardNumber: v }))}
                placeholder="4111111111111111" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Expiry" value={paymentForm.expiry}
                  onChange={(v) => setPaymentForm((p) => ({ ...p, expiry: v }))}
                  placeholder="MM/YY" />
                <InputField label="CVV" value={paymentForm.cvv}
                  onChange={(v) => setPaymentForm((p) => ({ ...p, cvv: v }))}
                  placeholder="123" />
              </div>
            </>)}

            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ background: "var(--color-surface-elevated)", border: "1px solid oklch(80% 0 0 / 0.08)" }}
            >
              <span className="text-text-muted text-sm">Payable</span>
              <span className="text-white font-bold">${total.toLocaleString()}</span>
            </div>

            {error && (
              <p className="text-red-400 text-sm px-1">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setStep("cart")}
                className="flex-1 py-3 rounded-xl text-white text-sm font-medium border border-white/12 hover:border-white/25 hover:bg-white/5 transition-all">
                Back
              </button>
              <button type="submit" disabled={isPaying}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: isPaying ? "oklch(65% 0.28 290 / 0.5)" : "var(--color-accent)",
                  boxShadow: "0 0 16px var(--color-accent-glow)",
                }}>
                {isPaying ? "Processing…" : "Confirm Payment"}
              </button>
            </div>
          </form>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === "success" && orderResult && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div
              className="rounded-2xl px-4 py-4 mb-5 flex items-start gap-3"
              style={{ background: "oklch(78% 0.18 145 / 0.08)", border: "1px solid oklch(78% 0.18 145 / 0.25)" }}
            >
              <CheckCircle2 size={20} className="text-neon-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-neon-green font-semibold text-sm">Order confirmed!</p>
                <p className="text-text-muted text-xs mt-0.5">Your order has been placed successfully.</p>
              </div>
            </div>

            <div className="space-y-2 text-sm mb-5">
              {[
                ["Order ID", orderResult.order_id],
                ["Status", orderResult.status],
                ["Estimated Delivery", new Date(orderResult.estimated_delivery).toLocaleDateString()],
                ["Total", `$${Number(orderResult.total_amount).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-white text-sm font-semibold mb-3">Items Purchased</p>
            <div className="space-y-2 mb-5">
              {(orderResult.items || []).map((item, idx) => (
                <div key={`${item.product_id}-${idx}`}
                  className="rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: "var(--color-surface-elevated)", border: "1px solid oklch(80% 0 0 / 0.07)" }}>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-text-muted text-xs">Qty: {item.quantity} · ${Number(item.price).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <button onClick={onClose}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold mb-2"
              style={{ background: "var(--color-accent)", boxShadow: "0 0 16px var(--color-accent-glow)" }}>
              Close
            </button>
            <Link to="/orders" onClick={onClose}
              className="block w-full text-center py-3 rounded-xl text-white text-sm font-medium border border-white/12 hover:border-white/25 hover:bg-white/5 transition-all">
              View Order History
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-text-muted focus:outline-none"
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid oklch(80% 0 0 / 0.1)",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.target.style.borderColor = "oklch(65% 0.28 290 / 0.5)"; }}
        onBlur={(e) => { e.target.style.borderColor = "oklch(80% 0 0 / 0.1)"; }}
      />
    </div>
  );
}
