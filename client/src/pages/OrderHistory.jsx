import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, PackageCheck, MapPin, Package } from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import { getOrCreateUserId } from "../utils/user";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_META = {
  Processing: { color: "oklch(80% 0.18 75)",  bg: "oklch(80% 0.18 75 / 0.1)",  border: "oklch(80% 0.18 75 / 0.25)",  pct: 33 },
  Shipped:    { color: "oklch(72% 0.20 250)",  bg: "oklch(72% 0.20 250 / 0.1)", border: "oklch(72% 0.20 250 / 0.25)", pct: 66 },
  Delivered:  { color: "oklch(78% 0.18 145)",  bg: "oklch(78% 0.18 145 / 0.1)", border: "oklch(78% 0.18 145 / 0.25)", pct: 100 },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Processing;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
    >
      {status}
    </span>
  );
}

export default function OrderHistory() {
  const { setPage } = useUserActivity();
  const [userId, setUserId] = useState(getOrCreateUserId());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { setPage("orders"); }, [setPage]);

  async function fetchOrders(targetUserId) {
    if (!targetUserId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/orders/user/${encodeURIComponent(targetUserId.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch orders.");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(userId); }, []);

  const summary = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    return { count: orders.length, total };
  }, [orders]);

  return (
    <div className="bg-grid min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">Your account</p>
          <h1 className="font-bold text-white leading-tight mb-2"
            style={{ fontSize: "clamp(1.8rem, 3vw + 0.5rem, 3rem)" }}>
            Order History
          </h1>
          <p className="text-text-muted text-sm">Track your past orders and delivery status.</p>
        </div>

        {/* Lookup bar */}
        <div
          className="rounded-2xl p-5 mb-8 border"
          style={{ background: "var(--color-surface-elevated)", borderColor: "oklch(80% 0 0 / 0.08)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="text-text-muted text-xs font-medium uppercase tracking-wider">User ID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchOrders(userId)}
                className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-text-muted focus:outline-none"
                style={{
                  background: "oklch(18% 0.032 255 / 0.8)",
                  border: "1px solid oklch(80% 0 0 / 0.1)",
                }}
                placeholder="USR-XXXXXX"
              />
            </div>
            <button
              onClick={() => fetchOrders(userId)}
              className="py-2.5 rounded-xl font-semibold text-white text-sm"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 16px var(--color-accent-glow)",
              }}
            >
              Load Orders
            </button>
          </div>

          {summary.count > 0 && (
            <div className="flex gap-6 mt-4 pt-4 border-t" style={{ borderColor: "oklch(80% 0 0 / 0.06)" }}>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider">Orders</p>
                <p className="text-white font-bold text-xl">{summary.count}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wider">Total Spent</p>
                <p className="text-white font-bold text-xl">${summary.total.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 mb-4 text-red-300 text-sm border border-red-500/20"
            style={{ background: "oklch(50% 0.2 20 / 0.08)" }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin mb-3" />
            <p className="text-text-muted text-sm">Loading orders…</p>
          </div>
        )}

        {!loading && orders.length === 0 && !error && (
          <div
            className="rounded-2xl p-12 text-center border"
            style={{ background: "var(--color-surface-elevated)", borderColor: "oklch(80% 0 0 / 0.06)" }}
          >
            <PackageCheck size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
            <p className="text-white font-semibold mb-1">No orders yet</p>
            <p className="text-text-muted text-sm">Orders placed with this User ID will appear here.</p>
          </div>
        )}

        {/* Order cards */}
        <div className="space-y-4">
          {orders.map((order, orderIndex) => {
            const meta = STATUS_META[order.status] || STATUS_META.Processing;
            const expanded = expandedId === order.id;
            const isLatest = orderIndex === 0;

            return (
              <div
                key={order.id}
                className="rounded-2xl border overflow-hidden"
                style={{
                  background: "var(--color-surface-elevated)",
                  borderColor: "oklch(80% 0 0 / 0.08)",
                }}
              >
                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: order meta */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                      >
                        <Package size={18} style={{ color: meta.color }} />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm leading-snug">{order.order_id}</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        {/* Items summary */}
                        <p className="text-text-muted text-xs mt-1">
                          {(order.items || []).slice(0, 2).map((it) => it.name).join(", ")}
                          {(order.items || []).length > 2 && ` +${order.items.length - 2} more`}
                        </p>
                      </div>
                    </div>

                    {/* Right: status + amount */}
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={order.status} />
                      <p className="text-white font-bold">${Number(order.total_amount).toLocaleString()}</p>
                      <p className="text-text-muted text-xs">
                        ETA: {order.estimated_delivery
                          ? new Date(order.estimated_delivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(80% 0 0 / 0.08)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${meta.pct}%`,
                          background: meta.color,
                          boxShadow: `0 0 8px ${meta.color}`,
                          transition: "width 0.6s var(--ease-out-expo)",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-muted mt-1.5">
                      <span>Processing</span>
                      <span>Shipped</span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      data-guide-id={isLatest ? "order-track-latest" : `order-track-${order.order_id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        color: meta.color,
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <MapPin size={12} />
                      Track Order
                    </button>

                    <button
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors ml-auto"
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expanded ? "Hide details" : "View details"}
                    </button>
                  </div>
                </div>

                {/* Expanded items */}
                {expanded && (
                  <div
                    className="px-5 pb-4 pt-1 border-t space-y-2"
                    style={{ borderColor: "oklch(80% 0 0 / 0.06)" }}
                  >
                    {(order.items || []).map((item, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
                        style={{ background: "oklch(18% 0.032 255 / 0.5)", border: "1px solid oklch(80% 0 0 / 0.06)" }}
                      >
                        <span className="text-white font-medium">{item.name}</span>
                        <span className="text-text-muted text-xs">
                          Qty {item.quantity} · ${Number(item.price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
