import { useEffect, useMemo, useState, useRef } from "react";
import {
  ChevronDown, ChevronUp, PackageCheck, MapPin, Package,
  LifeBuoy, Send, PhoneCall, CheckCircle2, Plus, Clock, AlertCircle,
} from "lucide-react";
import { useUserActivity } from "../context/UserActivityContext";
import { getOrCreateUserId } from "../utils/user";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ── Status metadata ─────────────────────────────────────── */
const ORDER_STATUS_META = {
  Processing: { color: "oklch(80% 0.18 75)",  bg: "oklch(80% 0.18 75 / 0.1)",  border: "oklch(80% 0.18 75 / 0.25)",  pct: 33 },
  Shipped:    { color: "oklch(72% 0.20 250)",  bg: "oklch(72% 0.20 250 / 0.1)", border: "oklch(72% 0.20 250 / 0.25)", pct: 66 },
  Delivered:  { color: "oklch(78% 0.18 145)",  bg: "oklch(78% 0.18 145 / 0.1)", border: "oklch(78% 0.18 145 / 0.25)", pct: 100 },
};

const TICKET_STATUS = {
  pending:     { label: "Pending",     color: "oklch(78% 0.16 80)",  bg: "oklch(78% 0.16 80 / 0.1)",  Icon: Clock },
  in_progress: { label: "In Progress", color: "oklch(78% 0.16 195)", bg: "oklch(78% 0.16 195 / 0.1)", Icon: AlertCircle },
  resolved:    { label: "Resolved",    color: "oklch(78% 0.16 145)", bg: "oklch(78% 0.16 145 / 0.1)", Icon: CheckCircle2 },
};

function StatusPill({ status }) {
  const meta = ORDER_STATUS_META[status] || ORDER_STATUS_META.Processing;
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
    >
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function OrderHistory() {
  const { setPage } = useUserActivity();
  const [tab, setTab] = useState("orders");

  /* ── Orders state ────────────────────────── */
  const [userId, setUserId] = useState(getOrCreateUserId());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [supportOrderId, setSupportOrderId] = useState(null);
  const [supportForm, setSupportForm] = useState({ issueDescription: "" });
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportStatus, setSupportStatus] = useState("");

  /* ── Tickets state ───────────────────────── */
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({ orderId: "", issueDescription: "" });

  useEffect(() => { setPage("orders"); }, [setPage]);

  /* ── Data fetchers ───────────────────────── */
  async function fetchOrders(targetUserId) {
    if (!targetUserId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/orders/user/${encodeURIComponent(targetUserId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch orders.");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message || "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTickets() {
    try {
      const res = await fetch(`${API_BASE}/api/chats/support/callbacks`);
      const data = await res.json();
      if (data.callbacks) {
        setTickets(data.callbacks.filter((t) => t.user_id === userId));
      }
    } catch {
      /* empty state shown */
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => { fetchOrders(userId); fetchTickets(); }, []);

  /* ── Handlers ────────────────────────────── */
  async function submitOrderSupport(orderId, e) {
    e.preventDefault();
    if (!supportForm.issueDescription.trim() || supportSubmitting) return;
    setSupportSubmitting(true);
    setSupportStatus("");
    try {
      const res = await fetch(`${API_BASE}/api/chats/support/request-callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          order_id: orderId,
          issue_description: supportForm.issueDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to submit.");
      setSupportStatus("success");
      setSupportForm({ issueDescription: "" });
      fetchTickets();
      setTimeout(() => { setSupportOrderId(null); setSupportStatus(""); }, 2000);
    } catch (err) {
      setSupportStatus(err.message || "Failed to submit support request.");
    } finally {
      setSupportSubmitting(false);
    }
  }

  async function submitTicket(e) {
    e.preventDefault();
    if (!ticketForm.issueDescription.trim() || ticketSubmitting) return;
    setTicketSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/chats/support/request-callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          order_id: ticketForm.orderId.trim() || null,
          issue_description: ticketForm.issueDescription.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketForm({ orderId: "", issueDescription: "" });
        setShowTicketForm(false);
        fetchTickets();
      }
    } catch {
      /* error handled via empty state */
    } finally {
      setTicketSubmitting(false);
    }
  }

  const summary = useMemo(() => {
    const total = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    return { count: orders.length, total };
  }, [orders]);

  return (
    <div className="bg-grid min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-2">Your account</p>
          <h1 className="font-bold text-white leading-tight mb-2" style={{ fontSize: "clamp(1.8rem, 3vw + 0.5rem, 3rem)" }}>
            Orders &amp; Support
          </h1>
          <p className="text-text-muted text-sm">Manage your orders and support requests in one place.</p>
        </div>

        {/* ── Tab slider ─────────────────────────── */}
        <div
          className="relative inline-flex rounded-xl p-1 mb-8"
          style={{ background: "oklch(18% 0.030 255 / 0.6)", border: "1px solid oklch(80% 0 0 / 0.08)" }}
        >
          <div
            className="absolute top-1 h-[calc(100%-8px)] rounded-lg"
            style={{
              width: "50%",
              left: tab === "orders" ? "4px" : "calc(50%)",
              background: "linear-gradient(135deg, oklch(65% 0.28 290 / 0.2), oklch(65% 0.28 290 / 0.12))",
              border: "1px solid oklch(65% 0.28 290 / 0.25)",
              transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          <button
            onClick={() => setTab("orders")}
            className="relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ color: tab === "orders" ? "#fff" : "var(--color-text-muted)", background: "transparent", border: "none", transition: "color 0.2s" }}
          >
            <Package size={15} /> Orders
          </button>
          <button
            data-guide-id="orders-support-tab"
            onClick={() => setTab("support")}
            className="relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ color: tab === "support" ? "#fff" : "var(--color-text-muted)", background: "transparent", border: "none", transition: "color 0.2s" }}
          >
            <LifeBuoy size={15} /> Support
          </button>
        </div>

        {/* ══ ORDERS TAB ═══════════════════════════ */}
        {tab === "orders" && (
          <>
            {/* Lookup bar */}
            <div className="rounded-2xl p-5 mb-8 border" style={{ background: "var(--color-surface-elevated)", borderColor: "oklch(80% 0 0 / 0.08)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="text-text-muted text-xs font-medium uppercase tracking-wider">User ID</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchOrders(userId)}
                    className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-text-muted focus:outline-none"
                    style={{ background: "oklch(18% 0.032 255 / 0.8)", border: "1px solid oklch(80% 0 0 / 0.1)" }}
                    placeholder="USR-XXXXXX"
                  />
                </div>
                <button
                  onClick={() => fetchOrders(userId)}
                  className="py-2.5 rounded-xl font-semibold text-white text-sm"
                  style={{ background: "var(--color-accent)", boxShadow: "0 0 16px var(--color-accent-glow)" }}
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
              <div className="rounded-xl px-4 py-3 mb-4 text-red-300 text-sm border border-red-500/20" style={{ background: "oklch(50% 0.2 20 / 0.08)" }}>
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
              <div className="rounded-2xl p-12 text-center border" style={{ background: "var(--color-surface-elevated)", borderColor: "oklch(80% 0 0 / 0.06)" }}>
                <PackageCheck size={40} className="mx-auto text-text-muted mb-3 opacity-40" />
                <p className="text-white font-semibold mb-1">No orders yet</p>
                <p className="text-text-muted text-sm">Orders placed with this User ID will appear here.</p>
              </div>
            )}

            {/* Order cards */}
            <div className="space-y-4">
              {orders.map((order, orderIndex) => {
                const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.Processing;
                const expanded = expandedId === order.id;
                const isLatest = orderIndex === 0;

                return (
                  <div key={order.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--color-surface-elevated)", borderColor: "oklch(80% 0 0 / 0.08)" }}>
                    <div className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                            <Package size={18} style={{ color: meta.color }} />
                          </div>
                          <div>
                            <p className="text-white font-semibold text-sm leading-snug">{order.order_id}</p>
                            <p className="text-text-muted text-xs mt-0.5">
                              {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <p className="text-text-muted text-xs mt-1">
                              {(order.items || []).slice(0, 2).map((it) => it.name).join(", ")}
                              {(order.items || []).length > 2 && ` +${order.items.length - 2} more`}
                            </p>
                          </div>
                        </div>
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
                          <div className="h-full rounded-full" style={{ width: `${meta.pct}%`, background: meta.color, boxShadow: `0 0 8px ${meta.color}`, transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }} />
                        </div>
                        <div className="flex justify-between text-xs text-text-muted mt-1.5">
                          <span>Processing</span><span>Shipped</span><span>Delivered</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          data-guide-id={isLatest ? "order-track-latest" : `order-track-${order.order_id}`}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                        >
                          <MapPin size={12} /> Track Order
                        </button>
                        <button
                          onClick={() => { setSupportOrderId(supportOrderId === order.order_id ? null : order.order_id); setSupportStatus(""); setSupportForm({ issueDescription: "" }); }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ color: "var(--color-accent)", background: "oklch(65% 0.28 290 / 0.1)", border: "1px solid oklch(65% 0.28 290 / 0.2)" }}
                        >
                          <LifeBuoy size={12} /> Get Support
                        </button>
                        <button
                          onClick={() => setExpandedId(expanded ? null : order.id)}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors ml-auto"
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {expanded ? "Hide" : "Details"}
                        </button>
                      </div>
                    </div>

                    {/* Inline support form */}
                    {supportOrderId === order.order_id && (
                      <div className="px-5 pb-4 pt-3 border-t" style={{ borderColor: "oklch(65% 0.28 290 / 0.12)" }}>
                        {supportStatus === "success" ? (
                          <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(78% 0.16 145)" }}>
                            <CheckCircle2 size={16} />
                            Support request submitted. Our team will reach out shortly.
                          </div>
                        ) : (
                          <form onSubmit={(e) => submitOrderSupport(order.order_id, e)} className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <PhoneCall size={14} style={{ color: "var(--color-accent)" }} />
                              <p className="text-white text-sm font-semibold">Request support for {order.order_id}</p>
                            </div>
                            <textarea
                              value={supportForm.issueDescription}
                              onChange={(e) => setSupportForm({ issueDescription: e.target.value })}
                              placeholder="Describe your issue (delivery delay, damaged product, refund...)"
                              rows={3}
                              className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none resize-none"
                              style={{ background: "oklch(14% 0.020 260)", borderColor: "oklch(80% 0 0 / 0.08)" }}
                            />
                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                disabled={supportSubmitting || !supportForm.issueDescription.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))", border: "none" }}
                              >
                                <Send size={14} />
                                {supportSubmitting ? "Submitting…" : "Submit Request"}
                              </button>
                              {typeof supportStatus === "string" && supportStatus !== "" && supportStatus !== "success" && (
                                <p className="text-xs text-red-400">{supportStatus}</p>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Expanded items */}
                    {expanded && (
                      <div className="px-5 pb-4 pt-1 border-t space-y-2" style={{ borderColor: "oklch(80% 0 0 / 0.06)" }}>
                        {(order.items || []).map((item, idx) => (
                          <div
                            key={`${order.id}-${idx}`}
                            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
                            style={{ background: "oklch(18% 0.032 255 / 0.5)", border: "1px solid oklch(80% 0 0 / 0.06)" }}
                          >
                            <span className="text-white font-medium">{item.name}</span>
                            <span className="text-text-muted text-xs">Qty {item.quantity} · ${Number(item.price).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ SUPPORT TAB ══════════════════════════ */}
        {tab === "support" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-text-muted text-sm">Track your support requests and submit new ones.</p>
              <button
                data-guide-id="support-new-ticket"
                onClick={() => setShowTicketForm(!showTicketForm)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))",
                  border: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px oklch(65% 0.28 290 / 0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <Plus size={16} /> New Ticket
              </button>
            </div>

            {/* New ticket form */}
            {showTicketForm && (
              <form
                onSubmit={submitTicket}
                data-guide-id="support-ticket-form"
                className="rounded-2xl border p-6 mb-8"
                style={{ borderColor: "oklch(65% 0.28 290 / 0.15)", background: "oklch(18% 0.030 255 / 0.6)" }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <PhoneCall size={16} style={{ color: "var(--color-accent)" }} />
                  <h2 className="text-white font-semibold">Submit a Support Request</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-text-muted text-xs font-medium mb-1.5 uppercase tracking-wider">Order ID (optional)</label>
                    <input
                      value={ticketForm.orderId}
                      onChange={(e) => setTicketForm({ ...ticketForm, orderId: e.target.value })}
                      placeholder="e.g. ORD-12345"
                      className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none"
                      style={{ background: "oklch(14% 0.020 260)", borderColor: "oklch(80% 0 0 / 0.08)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-text-muted text-xs font-medium mb-1.5 uppercase tracking-wider">Your User ID</label>
                    <input value={userId} readOnly className="w-full rounded-xl border px-4 py-3 text-sm text-text-muted outline-none cursor-not-allowed"
                      style={{ background: "oklch(14% 0.020 260)", borderColor: "oklch(80% 0 0 / 0.08)" }} />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-text-muted text-xs font-medium mb-1.5 uppercase tracking-wider">Describe your issue</label>
                  <textarea
                    value={ticketForm.issueDescription}
                    onChange={(e) => setTicketForm({ ...ticketForm, issueDescription: e.target.value })}
                    placeholder="Tell us what happened..."
                    rows={4}
                    className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none resize-none"
                    style={{ background: "oklch(14% 0.020 260)", borderColor: "oklch(80% 0 0 / 0.08)" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!ticketForm.issueDescription.trim() || ticketSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, oklch(65% 0.28 290), oklch(58% 0.26 280))", border: "none" }}
                  >
                    <Send size={14} /> {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTicketForm(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-muted cursor-pointer"
                    style={{ background: "oklch(80% 0 0 / 0.05)", border: "1px solid oklch(80% 0 0 / 0.08)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Tickets list */}
            <div data-guide-id="support-ticket-list">
              {ticketsLoading ? (
                <div className="text-center py-20 text-text-muted text-sm">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: "oklch(65% 0.28 290 / 0.08)", border: "1px solid oklch(65% 0.28 290 / 0.15)" }}>
                    <LifeBuoy size={28} style={{ color: "var(--color-accent)" }} />
                  </div>
                  <h3 className="text-white font-semibold mb-2">No support tickets yet</h3>
                  <p className="text-text-muted text-sm max-w-sm mx-auto">
                    Having an issue? Create a new ticket and our team will get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => {
                    const status = TICKET_STATUS[ticket.status] || TICKET_STATUS.pending;
                    return (
                      <div key={ticket.id} data-guide-id={`support-ticket-${ticket.id}`} className="rounded-2xl border p-5" style={{ borderColor: "oklch(80% 0 0 / 0.06)", background: "oklch(18% 0.030 255 / 0.5)" }}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-semibold text-sm">#{ticket.id}</span>
                              {ticket.order_id && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "oklch(65% 0.28 290 / 0.1)", color: "var(--color-accent)", border: "1px solid oklch(65% 0.28 290 / 0.2)" }}>
                                  {ticket.order_id}
                                </span>
                              )}
                            </div>
                            <p className="text-text-muted text-sm line-clamp-2">{ticket.issue_description}</p>
                            <p className="text-text-muted text-xs mt-2">
                              {new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0" style={{ color: status.color, background: status.bg }}>
                            <status.Icon size={12} /> {status.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
