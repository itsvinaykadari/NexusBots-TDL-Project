import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, PackageCheck } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import { getOrCreateUserId } from "../utils/user";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getProgressPercent(status) {
    if (status === "Delivered") return 100;
    if (status === "Shipped") return 66;
    return 33;
}

export default function OrderHistory() {
    const { setPage } = useUserActivity();
    const [userId, setUserId] = useState(getOrCreateUserId());
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        setPage("orders");
    }, [setPage]);

    async function fetchOrders(targetUserId) {
        if (!targetUserId.trim()) return;
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE}/api/orders/user/${encodeURIComponent(targetUserId.trim())}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch order history.");
            setOrders(data.orders || []);
        } catch (err) {
            setError(err.message || "Failed to fetch order history.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrders(userId);
    }, []);

    const summary = useMemo(() => {
        const total = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        return { count: orders.length, total };
    }, [orders]);

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
                <p className="text-text-muted">View your past orders, statuses, and tracking progress.</p>
            </div>

            <div className="bg-surface border border-white/10 rounded-2xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="text-text-muted text-sm">User ID</label>
                        <input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="mt-1 w-full bg-primary border border-white/10 rounded-xl px-3 py-2 text-white"
                            placeholder="USR-XXXXXX"
                        />
                    </div>
                    <button
                        onClick={() => fetchOrders(userId)}
                        className="bg-accent hover:bg-accent-dark text-white py-2.5 rounded-xl font-medium"
                    >
                        Load Orders
                    </button>
                    <div className="text-sm text-text-muted">
                        <p>Orders: <span className="text-white font-semibold">{summary.count}</span></p>
                        <p>Total Spent: <span className="text-white font-semibold">${summary.total.toLocaleString()}</span></p>
                    </div>
                </div>
            </div>

            {error && <p className="text-red-400 mb-4">{error}</p>}
            {loading && <p className="text-text-muted mb-4">Loading order history...</p>}

            {!loading && orders.length === 0 && (
                <div className="bg-surface border border-white/10 rounded-2xl p-8 text-center">
                    <PackageCheck className="mx-auto text-text-muted mb-2" />
                    <p className="text-text-muted">No orders found for this user.</p>
                </div>
            )}

            <div className="space-y-4">
                {orders.map((order) => {
                    const expanded = expandedId === order.id;
                    const progress = getProgressPercent(order.status);
                    return (
                        <div key={order.id} className="bg-surface border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-white font-semibold">Order ID: {order.order_id}</p>
                                    <p className="text-text-muted text-sm">User ID: {order.user_id}</p>
                                    <p className="text-text-muted text-sm">Date: {new Date(order.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-semibold">${Number(order.total_amount).toLocaleString()}</p>
                                    <p className="text-neon text-sm">{order.status}</p>
                                    <p className="text-text-muted text-xs">ETA: {order.estimated_delivery ? new Date(order.estimated_delivery).toLocaleDateString() : "-"}</p>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="mt-1 flex justify-between text-xs text-text-muted">
                                    <span>Processing</span>
                                    <span>Shipped</span>
                                    <span>Delivered</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setExpandedId(expanded ? null : order.id)}
                                className="mt-4 flex items-center gap-2 text-sm text-text-muted hover:text-white"
                            >
                                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                {expanded ? "Hide Details" : "View Details"}
                            </button>

                            {expanded && (
                                <div className="mt-3 space-y-2">
                                    {(order.items || []).map((item, idx) => (
                                        <div key={`${order.id}-${idx}`} className="bg-primary border border-white/10 rounded-lg p-3">
                                            <p className="text-white font-medium">{item.name}</p>
                                            <p className="text-text-muted text-sm">Quantity: {item.quantity} • Price: ${Number(item.price).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
