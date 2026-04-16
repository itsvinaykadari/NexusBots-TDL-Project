import { useEffect, useMemo, useState } from "react";
import { X, Plus, Minus, Trash2, CreditCard, CheckCircle2 } from "lucide-react";
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

    useEffect(() => {
        if (!isOpen) {
            setStep("cart");
            setError("");
            setIsPaying(false);
            setOrderResult(null);
        }
    }, [isOpen]);

    const total = useMemo(
        () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cart]
    );

    async function handlePaymentSubmit(e) {
        e.preventDefault();
        if (!paymentForm.userId.trim()) {
            setError("User ID is required.");
            return;
        }
        if (!paymentForm.email.trim()) {
            setError("Email is required.");
            return;
        }

        if (paymentForm.paymentMethod === "card") {
            if (!paymentForm.cardName || !paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvv) {
                setError("Please fill all card payment details.");
                return;
            }
        } else if (!paymentForm.upiId.trim()) {
            setError("UPI ID is required for UPI payment.");
            return;
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
            if (!response.ok) {
                throw new Error(data.error || "Payment failed.");
            }

            setOrderResult(data);
            clearCart();
            setStep("success");
        } catch (err) {
            setError(err.message || "Payment failed.");
        } finally {
            setIsPaying(false);
        }
    }

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

            <aside className="fixed right-0 top-0 h-full w-full max-w-md bg-primary border-l border-white/10 z-50 flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-white text-lg font-semibold">
                        {step === "cart" && "Your Cart"}
                        {step === "payment" && "Payment"}
                        {step === "success" && "Order Success"}
                    </h2>
                    <button onClick={onClose} className="text-slate-300 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {step === "cart" && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {cart.length === 0 ? (
                                <p className="text-slate-400">Your cart is empty.</p>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.id} className="bg-surface border border-white/10 rounded-xl p-3">
                                        <div className="flex gap-3">
                                            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate">{item.name}</p>
                                                <p className="text-slate-400 text-sm">${item.price.toLocaleString()}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        onClick={() => decreaseQuantity(item.id)}
                                                        className="p-1 rounded bg-white/5 text-slate-300 hover:text-white"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => increaseQuantity(item.id)}
                                                        className="p-1 rounded bg-white/5 text-slate-300 hover:text-white"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="ml-auto p-1 rounded bg-red-500/10 text-red-300 hover:text-red-200"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-300">Total</span>
                                <span className="text-white font-semibold">${total.toLocaleString()}</span>
                            </div>
                            <button
                                disabled={cart.length === 0}
                                onClick={() => setStep("payment")}
                                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium"
                            >
                                <CreditCard size={16} />
                                Proceed to Payment
                            </button>
                        </div>
                    </div>
                )}

                {step === "payment" && (
                    <form onSubmit={handlePaymentSubmit} className="flex-1 p-4 space-y-3 overflow-y-auto">
                        <div>
                            <label className="text-slate-300 text-sm">User ID</label>
                            <input
                                value={paymentForm.userId}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, userId: e.target.value }))}
                                className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                placeholder="USR-XXXXXX"
                            />
                        </div>
                        <div>
                            <label className="text-slate-300 text-sm">Email</label>
                            <input
                                type="email"
                                value={paymentForm.email}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, email: e.target.value }))}
                                className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-slate-300 text-sm">Payment Method</label>
                            <select
                                value={paymentForm.paymentMethod}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                            >
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                            </select>
                        </div>
                        {paymentForm.paymentMethod === "upi" && (
                            <div>
                                <label className="text-slate-300 text-sm">UPI ID</label>
                                <input
                                    value={paymentForm.upiId}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, upiId: e.target.value }))}
                                    className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                    placeholder="name@bank"
                                />
                            </div>
                        )}
                        {paymentForm.paymentMethod === "card" && (
                            <>
                                <div>
                                    <label className="text-slate-300 text-sm">Card Holder Name</label>
                                    <input
                                        value={paymentForm.cardName}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardName: e.target.value }))}
                                        className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-slate-300 text-sm">Card Number</label>
                                    <input
                                        value={paymentForm.cardNumber}
                                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                                        className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                        placeholder="4111111111111111"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-slate-300 text-sm">Expiry</label>
                                        <input
                                            value={paymentForm.expiry}
                                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, expiry: e.target.value }))}
                                            className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder="MM/YY"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-300 text-sm">CVV</label>
                                        <input
                                            value={paymentForm.cvv}
                                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, cvv: e.target.value }))}
                                            className="mt-1 w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white"
                                            placeholder="123"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="pt-2">
                            <p className="text-slate-300 text-sm">Payable Amount: <span className="text-white font-semibold">${total.toLocaleString()}</span></p>
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <div className="pt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep("cart")}
                                className="flex-1 border border-white/20 text-white py-2.5 rounded-xl"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={isPaying}
                                className="flex-1 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white py-2.5 rounded-xl"
                            >
                                {isPaying ? "Processing..." : "Confirm Payment"}
                            </button>
                        </div>
                    </form>
                )}

                {step === "success" && orderResult && (
                    <div className="flex-1 p-4 overflow-y-auto">
                        <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-neon-green mb-2">
                                <CheckCircle2 size={20} />
                                <p className="font-semibold">Payment Done</p>
                            </div>
                            <p className="text-white text-sm">Your order has been placed successfully!</p>
                        </div>

                        <div className="mt-4 space-y-2 text-sm">
                            <p className="text-slate-300">Order ID: <span className="text-white font-medium">{orderResult.order_id}</span></p>
                            <p className="text-slate-300">User ID: <span className="text-white font-medium">{orderResult.user_id}</span></p>
                            <p className="text-slate-300">Status: <span className="text-white font-medium">{orderResult.status}</span></p>
                            <p className="text-slate-300">Estimated Delivery: <span className="text-white font-medium">{new Date(orderResult.estimated_delivery).toLocaleDateString()}</span></p>
                            <p className="text-slate-300">Total Amount: <span className="text-white font-medium">${Number(orderResult.total_amount).toLocaleString()}</span></p>
                        </div>

                        <div className="mt-4">
                            <p className="text-white font-medium mb-2">Items Purchased</p>
                            <div className="space-y-2">
                                {(orderResult.items || []).map((item, idx) => (
                                    <div key={`${item.product_id}-${idx}`} className="bg-surface border border-white/10 rounded-lg p-2 text-sm">
                                        <p className="text-white">{item.name}</p>
                                        <p className="text-slate-400">Qty: {item.quantity} • ${item.price.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-5 w-full bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl"
                        >
                            Close
                        </button>
                        <Link
                            to="/orders"
                            onClick={onClose}
                            className="mt-2 block w-full text-center bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl"
                        >
                            View Order History
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
}
