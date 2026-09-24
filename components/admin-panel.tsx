"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, formatBRL } from "@/components/ui";

import {
  setPsychVerificationAction,
  releasePayoutAction,
  denyPayoutAction,
  markPayoutBatchPaidAction,
  saveSubscriptionCouponAction,
  savePlatformPricesAction,
  sendTestEmailAction,
} from "@/lib/actions/admin";

type PsychRow = {
  id: string;
  full_name: string;
  email: string;
  crp: string | null;
  whatsapp: string | null;
  verification_status: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  online: boolean;
  payout_balance_cents: number;
};

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  credits_cents: number;
  created_at: string;
};

type ReviewRow = {
  id: string;
  status: string;
  payout_release_status: string;
  psych_name: string;
  client_name: string;
  psych_cut_cents: number;
  sac_linked_at: string | null;
  attendance_confirmed_by_client: boolean;
  completed_at: string | null;
};

type RatingRow = {
  id: string;
  completed_at: string | null;
  psych_name: string;
  client_name: string;
  client_rating_of_psych: number | null;
  client_rating_comment: string | null;
  psych_rating_of_client: number | null;
  psych_rating_comment: string | null;
};

type OwedRow = {
  psychologistId: string;
  fullName: string;
  pixKey: string | null;
  owedCents: number;
  pendingPayoutIds?: string[];
};

type TxRow = {
  id: string;
  created_at: string;
  paid_at: string;
  completed_at: string | null;
  client_name: string;
  professional_name: string;
  professional_doc: string | null;
  price_cents: number;
  professional_cut_cents: number;
  platform_cut_cents: number;
  status: string;
  payout_release_status: string;
  attendance_confirmed: boolean;
  sac_linked: boolean;
  payout_credited: boolean;
  payment_mismatch_cents: number | null;
};

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

function parseDraftReais(raw: string): number | null {
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function AdminPanel({
  psychologists,
  clients,
  reviewQueue,
  ratings,
  owed,
  transactions,
  subscriptionCouponCode,
  adminEmail,
  priceIdCents,
  psychCutIdCents,
  monthlyFeeCents,
  sessionMinutes,
}: {
  psychologists: PsychRow[];
  clients: ClientRow[];
  reviewQueue: ReviewRow[];
  ratings: RatingRow[];
  owed: OwedRow[];
  transactions: TxRow[];
  subscriptionCouponCode: string | null;
  adminEmail: string;
  priceIdCents: number;
  psychCutIdCents: number;
  monthlyFeeCents: number;
  sessionMinutes: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "psychs" | "clients" | "review" | "ratings" | "payouts" | "transactions" | "settings"
  >("psychs");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [couponDraft, setCouponDraft] = useState(subscriptionCouponCode ?? "");
  const [priceDraft, setPriceDraft] = useState(centsToReaisInput(priceIdCents));
  const [psychCutDraft, setPsychCutDraft] = useState(
    centsToReaisInput(psychCutIdCents)
  );
  const [monthlyDraft, setMonthlyDraft] = useState(
    centsToReaisInput(monthlyFeeCents)
  );
  const previewPrice = parseDraftReais(priceDraft);
  const previewCut = parseDraftReais(psychCutDraft);
  const previewPlatform =
    previewPrice != null && previewCut != null
      ? Math.max(0, previewPrice - previewCut)
      : null;

  const tabs = [
    ["psychs", "Profissionais"],
    ["clients", "Clientes"],
    ["review", `Revisão (${reviewQueue.length})`],
    ["ratings", "Avaliações"],
    ["payouts", "Repasses"],
    ["transactions", `Transações (${transactions.length})`],
    ["settings", "Config"],
  ] as const;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === id
                ? "bg-teal-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {okMsg && (
        <p className="mb-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {okMsg}
        </p>
      )}

      {tab === "psychs" && (
        <Card>
          <h2 className="mb-3 font-semibold">Psicólogos — CRP</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {psychologists.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-medium">
                    {p.full_name}{" "}
                    <span className="text-slate-500">· {p.crp ?? "sem CRP"}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.email} · WhatsApp {p.whatsapp ?? "—"} ·{" "}
                    {p.online ? "online" : "offline"} · sub {p.subscription_status}
                    {p.subscription_expires_at
                      ? ` até ${new Date(p.subscription_expires_at).toLocaleDateString("pt-BR")}`
                      : ""}{" "}
                    · saldo {formatBRL(p.payout_balance_cents)}
                  </p>
                  <p className="text-xs">
                    Verificação:{" "}
                    <span className="font-semibold">{p.verification_status}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending || p.verification_status === "approved"}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    onClick={() =>
                      start(async () => {
                        setError(null);
                        const r = await setPsychVerificationAction(
                          p.id,
                          "approved"
                        );
                        if (!r.ok) setError(r.error);
                        router.refresh();
                      })
                    }
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={pending || p.verification_status === "rejected"}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    onClick={() =>
                      start(async () => {
                        setError(null);
                        const r = await setPsychVerificationAction(
                          p.id,
                          "rejected"
                        );
                        if (!r.ok) setError(r.error);
                        router.refresh();
                      })
                    }
                  >
                    Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "clients" && (
        <Card>
          <h2 className="mb-3 font-semibold">Clientes cadastrados</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {clients.map((c) => (
              <li key={c.id} className="py-2">
                <span className="font-medium">{c.full_name}</span> · {c.email} ·
                créditos {formatBRL(c.credits_cents)} · desde{" "}
                {new Date(c.created_at).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "review" && (
        <Card>
          <h2 className="mb-3 font-semibold">
            Sessões em HOLD / needs_admin_review
          </h2>
          {reviewQueue.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma sessão em revisão.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {reviewQueue.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <code className="rounded bg-slate-100 px-1">
                      {r.id.slice(0, 8)}
                    </code>{" "}
                    · {r.psych_name} ← {r.client_name} ·{" "}
                    {formatBRL(r.psych_cut_cents)}
                    <p className="text-xs text-slate-500">
                      release={r.payout_release_status}
                      {r.sac_linked_at ? " · SAC aberto" : ""}
                      {r.attendance_confirmed_by_client
                        ? " · cliente confirmou"
                        : " · sem confirmação"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white"
                      onClick={() =>
                        start(async () => {
                          setError(null);
                          const res = await releasePayoutAction(r.id);
                          if (!res.ok) setError(res.error);
                          router.refresh();
                        })
                      }
                    >
                      Liberar payout
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white"
                      onClick={() =>
                        start(async () => {
                          setError(null);
                          const res = await denyPayoutAction(
                            r.id,
                            "Negado após análise"
                          );
                          if (!res.ok) setError(res.error);
                          router.refresh();
                        })
                      }
                    >
                      Negar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "ratings" && (
        <Card>
          <h2 className="mb-3 font-semibold">Avaliações mútuas</h2>
          {ratings.length === 0 ? (
            <p className="text-sm text-slate-500">Sem avaliações ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {ratings.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="font-medium">
                    {r.psych_name} ↔ {r.client_name}{" "}
                    <code className="rounded bg-slate-100 px-1 text-xs">
                      {r.id.slice(0, 8)}
                    </code>
                  </p>
                  <p className="text-xs text-slate-600">
                    Cliente→Psic:{" "}
                    {r.client_rating_of_psych
                      ? `${r.client_rating_of_psych}★`
                      : "—"}
                    {r.client_rating_comment
                      ? ` “${r.client_rating_comment}”`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Psic→Cliente:{" "}
                    {r.psych_rating_of_client
                      ? `${r.psych_rating_of_client}★`
                      : "—"}
                    {r.psych_rating_comment
                      ? ` “${r.psych_rating_comment}”`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "payouts" && (
        <Card>
          <h2 className="mb-3 font-semibold">
            Repasses owed (lotes manuais dias 10 e 28)
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Sem transferência automática LivePix. Marque o lote como pago após
            Pix manual.
          </p>
          {owed.length === 0 ? (
            <p className="text-sm text-slate-500">Nada a pagar no momento.</p>
          ) : (
            <ul className="mb-4 divide-y divide-slate-100 text-sm">
              {owed.map((o) => (
                <li key={o.psychologistId} className="py-2">
                  <span className="font-medium">{o.fullName}</span> · Pix{" "}
                  {o.pixKey ?? "—"} ·{" "}
                  <span className="font-semibold text-teal-700">
                    {formatBRL(o.owedCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                setError(null);
                const r = await markPayoutBatchPaidAction(fd);
                if (!r.ok) setError(r.error);
                router.refresh();
              });
            }}
          >
            <input
              name="label"
              placeholder="Rótulo (ex: Lote dia 10 — 2026-09)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              name="notes"
              placeholder="Notas opcionais"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={pending || owed.length === 0}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Marcar lote como pago
            </button>
          </form>
        </Card>
      )}

      {tab === "transactions" && (
        <Card>
          <h2 className="mb-3 font-semibold">
            Transações pagas (para decidir repasses)
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            Todas as consultas com paid_at, mais recentes primeiro.
          </p>
          {transactions.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma transação paga.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {transactions.map((tx) => (
                <li key={tx.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">
                      <code className="rounded bg-slate-100 px-1">
                        {tx.id.slice(0, 8)}
                      </code>{" "}
                      · {tx.client_name} → {tx.professional_name}
                      {tx.professional_doc
                        ? ` (${tx.professional_doc})`
                        : ""}
                    </p>
                    <p className="font-semibold text-teal-800">
                      {formatBRL(tx.price_cents)}
                    </p>
                  </div>
                  <p className="text-xs text-slate-600">
                    corte prof. {formatBRL(tx.professional_cut_cents)} ·
                    plataforma {formatBRL(tx.platform_cut_cents)} · status{" "}
                    {tx.status} · release {tx.payout_release_status}
                  </p>
                  <p className="text-xs text-slate-500">
                    criada{" "}
                    {new Date(tx.created_at).toLocaleString("pt-BR")} · paga{" "}
                    {new Date(tx.paid_at).toLocaleString("pt-BR")}
                    {tx.completed_at
                      ? ` · concluída ${new Date(tx.completed_at).toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    presença {tx.attendance_confirmed ? "sim" : "não"} · SAC{" "}
                    {tx.sac_linked ? "sim" : "não"} · payout creditado{" "}
                    {tx.payout_credited ? "sim" : "não"}
                    {tx.payment_mismatch_cents != null
                      ? ` · mismatch ${formatBRL(tx.payment_mismatch_cents)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "settings" && (
        <Card>
          <h2 className="mb-3 font-semibold">Preços da consulta</h2>
          <p className="mb-3 text-xs text-slate-500">
            Valores em reais (R$). Sessão atual: {sessionMinutes} min.
          </p>
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Cobrado do cliente</span>
              <input
                type="text"
                inputMode="decimal"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Repasse ao psicólogo</span>
              <input
                type="text"
                inputMode="decimal"
                value={psychCutDraft}
                onChange={(e) => setPsychCutDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Mensalidade</span>
              <input
                type="text"
                inputMode="decimal"
                value={monthlyDraft}
                onChange={(e) => setMonthlyDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <ul className="mb-3 list-inside list-disc text-xs text-slate-600">
            <li>
              Cobrado:{" "}
              {previewPrice != null ? formatBRL(previewPrice) : "—"}
            </li>
            <li>
              Repasse profissional:{" "}
              {previewCut != null ? formatBRL(previewCut) : "—"}
            </li>
            <li>
              Taxa plataforma:{" "}
              {previewPlatform != null ? formatBRL(previewPlatform) : "—"}
              {" "}(= cobrado − repasse)
            </li>
          </ul>
          <p className="mb-3 text-xs text-slate-500">
            Ao salvar, a página principal e novos pedidos usam estes valores.
            Pedidos já criados mantêm o preço antigo.
          </p>
          <button
            type="button"
            disabled={pending}
            className="mb-6 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={() =>
              start(async () => {
                setError(null);
                setOkMsg(null);
                const fd = new FormData();
                fd.set("priceReais", priceDraft);
                fd.set("psychCutReais", psychCutDraft);
                fd.set("monthlyFeeReais", monthlyDraft);
                const r = await savePlatformPricesAction(fd);
                if (!r.ok) setError(r.error);
                else {
                  setOkMsg("Preços salvos.");
                  router.refresh();
                }
              })
            }
          >
            Salvar preços
          </button>

          <h2 className="mb-3 font-semibold">Cupom de assinatura (30 dias grátis)</h2>
          <p className="mb-3 text-xs text-slate-500">
            Defina uma palavra-chave. Psicólogos podem resgatar no painel (sem LivePix).
            Deixe vazio e salve para desativar.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={couponDraft}
              onChange={(e) => setCouponDraft(e.target.value)}
              placeholder="Ex: BEMVINDO30"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              onClick={() =>
                start(async () => {
                  setError(null);
                  setOkMsg(null);
                  const fd = new FormData();
                  fd.set("couponCode", couponDraft);
                  const r = await saveSubscriptionCouponAction(fd);
                  if (!r.ok) setError(r.error);
                  else {
                    setOkMsg(
                      couponDraft.trim()
                        ? "Cupom salvo."
                        : "Cupom desativado (vazio)."
                    );
                    router.refresh();
                  }
                })
              }
            >
              Salvar cupom
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-500">
            Atual:{" "}
            {subscriptionCouponCode
              ? `"${subscriptionCouponCode}"`
              : "(desativado)"}
          </p>

          <h2 className="mb-3 font-semibold">E-mail de teste (Resend)</h2>
          <p className="mb-3 text-xs text-slate-500">
            Envia para o e-mail da sessão admin ({adminEmail}) com assunto
            &quot;ConsultaJá teste&quot;.
          </p>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={() =>
              start(async () => {
                setError(null);
                setOkMsg(null);
                const r = await sendTestEmailAction();
                if (!r.ok) setError(r.error);
                else setOkMsg(`E-mail de teste enviado para ${adminEmail}.`);
              })
            }
          >
            Enviar e-mail de teste
          </button>
        </Card>
      )}

    </div>
  );
}
