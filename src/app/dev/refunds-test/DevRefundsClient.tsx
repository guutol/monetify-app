"use client";

import { useState } from "react";

// ── Types (exported so page.tsx can use for serialization) ───────────────────

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export type OrderRow = {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  generationStatus: string;
  refundStatus: string;
  disputeStatus: string;
  isFlagged: boolean;
  refundReason: string | null;
  refundRequestedAt: string | null;
  createdAt: string;
};

export type AdminOrderRow = {
  id: string;
  amount: number;
  paymentStatus: string;
  generationStatus: string;
  refundStatus: string;
  refundReason: string | null;
  disputeStatus: string;
  refundRequestedAt: string | null;
  user: { email: string; name: string | null };
};

type Props = {
  currentUser: CurrentUser;
  initialOrders: OrderRow[];
  initialAdminOrders: AdminOrderRow[] | null;
};

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  // green
  PAID: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  ELIGIBLE: "bg-green-100 text-green-800",
  WON: "bg-green-100 text-green-800",
  // blue
  REFUNDED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-blue-100 text-blue-800",
  // yellow
  PENDING: "bg-yellow-100 text-yellow-800",
  PROCESSING: "bg-yellow-100 text-yellow-800",
  MANUAL_REVIEW: "bg-yellow-100 text-yellow-800",
  REQUESTED: "bg-yellow-100 text-yellow-800",
  OPEN: "bg-yellow-100 text-yellow-800",
  UNDER_DISPUTE: "bg-yellow-100 text-yellow-800",
  // red
  FAILED: "bg-red-100 text-red-800",
  DENIED: "bg-red-100 text-red-800",
  LOST: "bg-red-100 text-red-800",
  // gray
  NONE: "bg-zinc-100 text-zinc-500",
  EXPIRED: "bg-zinc-100 text-zinc-500",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

function Badge({ value }: { value: string }) {
  const cls = STATUS_COLORS[value] ?? "bg-zinc-100 text-zinc-600";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cents(v: number) {
  return `R$ ${(v / 100).toFixed(2).replace(".", ",")}`;
}

function shortId(id: string) {
  return id.slice(0, 8) + "…";
}

// ── Main component ────────────────────────────────────────────────────────────

export function DevRefundsClient({ currentUser, initialOrders, initialAdminOrders }: Props) {
  const [orders] = useState(initialOrders);
  const [adminOrders] = useState(initialAdminOrders);

  // Refund request form state (per order)
  const [openRefundForm, setOpenRefundForm] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  // Admin decision form state (per order)
  const [openDecideForm, setOpenDecideForm] = useState<string | null>(null);
  const [decideReason, setDecideReason] = useState("");

  // Loading / message state
  const [loading, setLoading] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});

  function setMsg(key: string, ok: boolean, text: string) {
    setMessages((m) => ({ ...m, [key]: { ok, text } }));
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function requestRefund(orderId: string) {
    if (!refundReason.trim()) return;
    setLoading(orderId);
    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: refundReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(orderId, true, data.message ?? "Solicitação enviada.");
        setOpenRefundForm(null);
        setRefundReason("");
        window.location.reload();
      } else {
        setMsg(orderId, false, data.error ?? "Erro desconhecido.");
      }
    } catch {
      setMsg(orderId, false, "Erro de rede.");
    } finally {
      setLoading(null);
    }
  }

  async function decideRefund(orderId: string, decision: "APPROVED" | "DENIED") {
    if (!decideReason.trim()) return;
    setLoading(`decide-${orderId}`);
    try {
      const res = await fetch(`/api/admin/refunds/${orderId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason: decideReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`admin-${orderId}`, true, data.message ?? "Decisão registrada.");
        setOpenDecideForm(null);
        setDecideReason("");
        window.location.reload();
      } else {
        setMsg(`admin-${orderId}`, false, data.error ?? "Erro desconhecido.");
      }
    } catch {
      setMsg(`admin-${orderId}`, false, "Erro de rede.");
    } finally {
      setLoading(null);
    }
  }

  async function resolveDispute(orderId: string, resolution: "WON" | "LOST") {
    setLoading(`dispute-${orderId}`);
    try {
      const res = await fetch(`/api/admin/disputes/${orderId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`admin-${orderId}`, true, data.message ?? "Disputa encerrada.");
        window.location.reload();
      } else {
        setMsg(`admin-${orderId}`, false, data.error ?? "Erro desconhecido.");
      }
    } catch {
      setMsg(`admin-${orderId}`, false, "Erro de rede.");
    } finally {
      setLoading(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-mono text-sm">
      {/* Banner */}
      <div className="mb-6 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-amber-800">
        <strong>⚠ PÁGINA DE DESENVOLVIMENTO</strong> — visível apenas com{" "}
        <code>NODE_ENV=development</code>. Remover antes do deploy em produção.
      </div>

      {/* Sessão */}
      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-zinc-800">Sessão atual</h2>
        <table className="w-full text-left">
          <tbody className="divide-y divide-zinc-100">
            {[
              ["ID", currentUser.id],
              ["Name", currentUser.name ?? "(sem nome)"],
              ["Email", currentUser.email],
              ["Role", currentUser.role],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 pr-4 font-medium text-zinc-500 w-20">{k}</td>
                <td className="py-1.5 text-zinc-900">
                  {k === "Role" ? <Badge value={v} /> : v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Meus pedidos */}
      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-base font-bold text-zinc-800">
          Meus pedidos ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <p className="text-zinc-400">
            Nenhum pedido encontrado. Crie um pedido via AbacatePay para testar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-400">
                  <th className="pb-2 pr-3">ID</th>
                  <th className="pb-2 pr-3">Valor</th>
                  <th className="pb-2 pr-3">Método</th>
                  <th className="pb-2 pr-3">Payment</th>
                  <th className="pb-2 pr-3">Generation</th>
                  <th className="pb-2 pr-3">Refund</th>
                  <th className="pb-2 pr-3">Dispute</th>
                  <th className="pb-2">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <>
                    <tr key={order.id} className="align-top">
                      <td className="py-2 pr-3 text-zinc-400" title={order.id}>
                        {shortId(order.id)}
                      </td>
                      <td className="py-2 pr-3">{cents(order.amount)}</td>
                      <td className="py-2 pr-3">{order.paymentMethod}</td>
                      <td className="py-2 pr-3">
                        <Badge value={order.paymentStatus} />
                      </td>
                      <td className="py-2 pr-3">
                        <Badge value={order.generationStatus} />
                      </td>
                      <td className="py-2 pr-3">
                        <Badge value={order.refundStatus} />
                      </td>
                      <td className="py-2 pr-3">
                        <Badge value={order.disputeStatus} />
                      </td>
                      <td className="py-2">
                        {order.refundStatus === "NONE" &&
                          order.paymentStatus === "PAID" && (
                            <button
                              className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-50"
                              onClick={() => {
                                setOpenRefundForm(
                                  openRefundForm === order.id ? null : order.id
                                );
                                setRefundReason("");
                              }}
                            >
                              Solicitar reembolso
                            </button>
                          )}
                      </td>
                    </tr>

                    {/* Inline refund form */}
                    {openRefundForm === order.id && (
                      <tr key={`form-${order.id}`}>
                        <td colSpan={8} className="pb-3">
                          <div className="ml-0 mt-1 rounded border border-zinc-200 bg-zinc-50 p-3">
                            <label className="mb-1 block text-xs font-medium text-zinc-600">
                              Motivo do reembolso
                            </label>
                            <textarea
                              rows={2}
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="Descreva o motivo (mínimo 10 caracteres)"
                              className="mb-2 w-full resize-none rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={
                                  refundReason.trim().length < 10 ||
                                  loading === order.id
                                }
                                onClick={() => requestRefund(order.id)}
                                className="rounded bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-40"
                              >
                                {loading === order.id ? "Enviando…" : "Confirmar"}
                              </button>
                              <button
                                onClick={() => setOpenRefundForm(null)}
                                className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Message row */}
                    {messages[order.id] && (
                      <tr key={`msg-${order.id}`}>
                        <td colSpan={8} className="pb-2">
                          <span
                            className={`text-xs ${
                              messages[order.id].ok ? "text-green-700" : "text-red-600"
                            }`}
                          >
                            {messages[order.id].ok ? "✓" : "✗"} {messages[order.id].text}
                          </span>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin: pedidos pendentes de reembolso */}
      {adminOrders !== null && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-1 text-base font-bold text-zinc-800">
            Admin — reembolsos pendentes ({adminOrders.length})
          </h2>
          <p className="mb-3 text-xs text-zinc-400">
            Visível apenas para role ADMIN. Reembolso financeiro é executado
            manualmente no dashboard AbacatePay.
          </p>

          {adminOrders.length === 0 ? (
            <p className="text-zinc-400">Nenhum reembolso pendente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs text-zinc-400">
                    <th className="pb-2 pr-3">ID</th>
                    <th className="pb-2 pr-3">Usuário</th>
                    <th className="pb-2 pr-3">Valor</th>
                    <th className="pb-2 pr-3">Refund</th>
                    <th className="pb-2 pr-3">Dispute</th>
                    <th className="pb-2 pr-3">Motivo</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {adminOrders.map((order) => (
                    <>
                      <tr key={order.id} className="align-top">
                        <td className="py-2 pr-3 text-zinc-400" title={order.id}>
                          {shortId(order.id)}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <span className="block">{order.user.name ?? "—"}</span>
                          <span className="text-zinc-400">{order.user.email}</span>
                        </td>
                        <td className="py-2 pr-3">{cents(order.amount)}</td>
                        <td className="py-2 pr-3">
                          <Badge value={order.refundStatus} />
                        </td>
                        <td className="py-2 pr-3">
                          <Badge value={order.disputeStatus} />
                        </td>
                        <td className="py-2 pr-3 max-w-[160px] truncate text-xs text-zinc-500">
                          {order.refundReason ?? "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {["ELIGIBLE", "MANUAL_REVIEW", "REQUESTED"].includes(
                              order.refundStatus
                            ) && (
                              <button
                                onClick={() => {
                                  setOpenDecideForm(
                                    openDecideForm === order.id ? null : order.id
                                  );
                                  setDecideReason("");
                                }}
                                className="rounded bg-zinc-800 px-2 py-1 text-xs text-white hover:bg-zinc-700"
                              >
                                Decidir
                              </button>
                            )}
                            {order.disputeStatus === "OPEN" && (
                              <>
                                <button
                                  disabled={loading === `dispute-${order.id}`}
                                  onClick={() => resolveDispute(order.id, "WON")}
                                  className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600 disabled:opacity-40"
                                >
                                  WON
                                </button>
                                <button
                                  disabled={loading === `dispute-${order.id}`}
                                  onClick={() => resolveDispute(order.id, "LOST")}
                                  className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-40"
                                >
                                  LOST
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline decide form */}
                      {openDecideForm === order.id && (
                        <tr key={`decide-${order.id}`}>
                          <td colSpan={7} className="pb-3">
                            <div className="mt-1 rounded border border-zinc-200 bg-zinc-50 p-3">
                              <label className="mb-1 block text-xs font-medium text-zinc-600">
                                Motivo da decisão
                              </label>
                              <textarea
                                rows={2}
                                value={decideReason}
                                onChange={(e) => setDecideReason(e.target.value)}
                                placeholder="Descreva o motivo (mínimo 10 caracteres)"
                                className="mb-2 w-full resize-none rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                              />
                              <div className="flex gap-2">
                                <button
                                  disabled={
                                    decideReason.trim().length < 10 ||
                                    loading === `decide-${order.id}`
                                  }
                                  onClick={() => decideRefund(order.id, "APPROVED")}
                                  className="rounded bg-green-700 px-3 py-1 text-xs text-white hover:bg-green-600 disabled:opacity-40"
                                >
                                  {loading === `decide-${order.id}` ? "…" : "Aprovar"}
                                </button>
                                <button
                                  disabled={
                                    decideReason.trim().length < 10 ||
                                    loading === `decide-${order.id}`
                                  }
                                  onClick={() => decideRefund(order.id, "DENIED")}
                                  className="rounded bg-red-700 px-3 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-40"
                                >
                                  {loading === `decide-${order.id}` ? "…" : "Negar"}
                                </button>
                                <button
                                  onClick={() => setOpenDecideForm(null)}
                                  className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Message row */}
                      {messages[`admin-${order.id}`] && (
                        <tr key={`admin-msg-${order.id}`}>
                          <td colSpan={7} className="pb-2">
                            <span
                              className={`text-xs ${
                                messages[`admin-${order.id}`].ok
                                  ? "text-green-700"
                                  : "text-red-600"
                              }`}
                            >
                              {messages[`admin-${order.id}`].ok ? "✓" : "✗"}{" "}
                              {messages[`admin-${order.id}`].text}
                            </span>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
