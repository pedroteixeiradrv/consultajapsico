"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, formatBRL, StubNote } from "@/components/ui";
import {
  acceptRequestAction,
  toggleOnlineAction,
  startSubscriptionCheckoutAction,
  redeemSubscriptionCouponAction,
} from "@/lib/actions/psych";

type QueueItem = {
  id: string;
  created_at: string;
  price_cents: number;
};

export function PsychDashboardClient({
  initialOnline,
  subscriptionStatus,
  subscriptionExpiresAt,
  verificationStatus,
  payoutBalanceCents,
  queue,
}: {
  initialOnline: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  verificationStatus: string;
  payoutBalanceCents: number;
  queue: QueueItem[];
}) {
  const router = useRouter();
  const [online, setOnline] = useState(initialOnline);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function refresh() {
    router.refresh();
  }

  return (
    <>
      {verificationStatus !== "approved" && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            {verificationStatus === "rejected"
              ? "Seu CRP foi rejeitado pelo admin. Você não pode aceitar filas."
              : "Seu cadastro aguarda aprovação do CRP pelo admin. Você pode ficar online, mas não pode Aceitar pedidos até ser aprovado."}
          </p>
        </Card>
      )}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Status online</h2>
            <p className="text-sm text-slate-600">
              Online (mesmo sem mensalidade) pode Aceitar a fila. Mensalidade
              active = recebe e-mail de novas solicitações.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await toggleOnlineAction();
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setOnline((v) => !v);
                refresh();
              })
            }
            className={`inline-flex min-w-[140px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
              online
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {online ? "Ficar offline" : "Ficar online"}
          </button>
        </div>
        <p className="mt-3 text-sm">
          Agora:{" "}
          <span
            className={
              online ? "font-semibold text-teal-700" : "text-slate-500"
            }
          >
            {online ? "ONLINE" : "offline"}
          </span>
          {" · "}
          Mensalidade:{" "}
          <span className="font-medium">{subscriptionStatus}{subscriptionExpiresAt ? ` até ${new Date(subscriptionExpiresAt).toLocaleDateString("pt-BR")}` : ""}</span>
          {" · "}
          Saldo payout:{" "}
          <span className="font-semibold text-teal-700">
            {formatBRL(payoutBalanceCents)}
          </span>
        </p>
        {subscriptionStatus !== "active" && (
          <button
            type="button"
            className="mt-3 text-sm text-teal-700 underline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await startSubscriptionCheckoutAction();
                if (r && typeof r === "object" && "checkoutUrl" in r && r.checkoutUrl) {
                  window.location.href = String(r.checkoutUrl);
                  return;
                }
                refresh();
              })
            }
          >
            Assinar 30 dias (alertas por e-mail) — LivePix
          </button>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Cupom de assinatura
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Código do cupom"
              className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || !couponCode.trim()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              onClick={() =>
                start(async () => {
                  setError(null);
                  setCouponMsg(null);
                  const fd = new FormData();
                  fd.set("couponCode", couponCode);
                  const r = await redeemSubscriptionCouponAction(fd);
                  if (!r.ok) {
                    setError(r.error);
                    return;
                  }
                  setCouponMsg("Cupom resgatado — 30 dias ativos.");
                  setCouponCode("");
                  refresh();
                })
              }
            >
              Redeem
            </button>
          </div>
          {couponMsg && (
            <p className="mt-2 text-sm text-teal-700">{couponMsg}</p>
          )}
        </div>

      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Fila pendente (paga)</h2>
        {error && (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
        {queue.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pedido pago aguardando.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {queue.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span>
                  Pedido{" "}
                  <code className="rounded bg-slate-100 px-1">
                    {r.id.slice(0, 8)}
                  </code>{" "}
                  · identified · {formatBRL(r.price_cents)} ·{" "}
                  {new Date(r.created_at).toLocaleTimeString("pt-BR")}
                </span>
                <button
                  type="button"
                  disabled={pending || !online}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const res = await acceptRequestAction(r.id);
                      if (res && !res.ok) setError(res.error);
                    })
                  }
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  Aceitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <StubNote>
          First-wins: só o primeiro Aceitar grava o lock. Payout Pix só após
          Encerrar / completed (+R$40).
        </StubNote>
      </Card>
    </>
  );
}
