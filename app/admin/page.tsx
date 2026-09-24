export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, Card, formatBRL } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { AdminPanel } from "@/components/admin-panel";
import { getSession } from "@/lib/auth";
import { readStore, storeBackendLabel } from "@/lib/store";
import { listOwedByPsych } from "@/lib/payout";
import { adminCompleteFormAction } from "@/lib/actions/admin-complete";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");

  const db = await readStore();
  const openSac = db.sac_tickets.filter((t) => t.status === "open").length;
  const pending = db.consultation_requests.filter(
    (r) => r.status === "pending" && r.paid_at
  ).length;
  const inCall = db.consultation_requests.filter(
    (r) => r.status === "accepted" || r.status === "in_call"
  );

  const reviewQueue = db.consultation_requests
    .filter(
      (r) =>
        r.status === "completed" &&
        (r.payout_release_status === "needs_admin_review" ||
          r.payout_withheld ||
          (Boolean(r.sac_linked_at) && !r.payout_credited))
    )
    .map((r) => {
      const psych = db.psychologists.find((p) => p.id === r.psychologist_id);
      const client = db.clients.find((c) => c.id === r.client_id);
      return {
        id: r.id,
        status: r.status,
        payout_release_status: r.payout_release_status,
        psych_name: psych?.full_name ?? "—",
        client_name: client?.full_name ?? "—",
        psych_cut_cents: r.psych_cut_cents,
        sac_linked_at: r.sac_linked_at,
        attendance_confirmed_by_client: r.attendance_confirmed_by_client,
        completed_at: r.completed_at,
      };
    });

  const ratings = db.consultation_requests
    .filter(
      (r) =>
        r.client_rating_of_psych != null || r.psych_rating_of_client != null
    )
    .map((r) => {
      const psych = db.psychologists.find((p) => p.id === r.psychologist_id);
      const client = db.clients.find((c) => c.id === r.client_id);
      return {
        id: r.id,
        completed_at: r.completed_at,
        psych_name: psych?.full_name ?? "—",
        client_name: client?.full_name ?? "—",
        client_rating_of_psych: r.client_rating_of_psych,
        client_rating_comment: r.client_rating_comment,
        psych_rating_of_client: r.psych_rating_of_client,
        psych_rating_comment: r.psych_rating_comment,
      };
    });

  const transactions = db.consultation_requests
    .filter((r) => Boolean(r.paid_at))
    .slice()
    .sort((a, b) => {
      const ta = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const tb = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return tb - ta;
    })
    .map((r) => {
      const psych = db.psychologists.find((p) => p.id === r.psychologist_id);
      const client = db.clients.find((c) => c.id === r.client_id);
      const platformCut = Math.max(0, r.price_cents - r.psych_cut_cents);
      return {
        id: r.id,
        created_at: r.created_at,
        paid_at: r.paid_at as string,
        completed_at: r.completed_at,
        client_name: client?.full_name ?? "—",
        professional_name: psych?.full_name ?? "—",
        professional_doc: psych?.crp ?? null,
        price_cents: r.price_cents,
        professional_cut_cents: r.psych_cut_cents,
        platform_cut_cents: platformCut,
        status: r.status,
        payout_release_status: r.payout_release_status,
        attendance_confirmed: r.attendance_confirmed_by_client,
        sac_linked: Boolean(r.sac_linked_at),
        payout_credited: r.payout_credited,
        payment_mismatch_cents: r.payment_mismatch_cents ?? null,
      };
    });

  const owed = await listOwedByPsych();

  return (
    <Shell title="Painel admin" backHref="/" right={<LogoutButton />}>
      <p className="mb-4 text-xs text-slate-400">
        Store: {storeBackendLabel()} · {session.email}
      </p>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">SAC</h2>
          <p className="mb-3 text-sm text-slate-600">
            {openSac} ticket(s) aberto(s). Somente admin lê.
          </p>
          <Link
            href="/admin/sac"
            className="text-sm font-medium text-teal-700 underline"
          >
            Ver tickets SAC →
          </Link>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold">Plataforma</h2>
          <ul className="list-inside list-disc text-sm text-slate-600">
            <li>
              Mensalidade: {formatBRL(db.platform_settings.monthly_fee_cents)}
            </li>
            <li>
              Preço: {formatBRL(db.platform_settings.price_id_cents)} /{" "}{db.platform_settings.session_duration_minutes} min
            </li>
            <li>
              Corte psicólogo:{" "}
              {formatBRL(db.platform_settings.psych_cut_id_cents)} após
              confirmação do cliente
            </li>
            <li>Fila paga pendente: {pending}</li>
            <li>Psicólogos: {db.psychologists.length}</li>
            <li>Clientes: {db.clients.length}</li>
            <li>Em revisão payout: {reviewQueue.length}</li>
          </ul>
        </Card>
      </div>

      {inCall.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-3 font-semibold">Sessões ativas — encerrar</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {inCall.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <span>
                  <code className="rounded bg-slate-100 px-1">
                    {r.id.slice(0, 8)}
                  </code>{" "}
                  · {r.status}
                </span>
                <form action={adminCompleteFormAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Encerrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AdminPanel
        psychologists={db.psychologists.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          crp: p.crp,
          whatsapp: p.whatsapp,
          verification_status: p.verification_status,
          subscription_status: p.subscription_status,
          subscription_expires_at: p.subscription_expires_at,
          online: p.online,
          payout_balance_cents: p.payout_balance_cents,
        }))}
        clients={db.clients.map((c) => ({
          id: c.id,
          full_name: c.full_name,
          email: c.email,
          credits_cents: c.credits_cents,
          created_at: c.created_at,
        }))}
        reviewQueue={reviewQueue}
        ratings={ratings}
        owed={owed}
        transactions={transactions}
        subscriptionCouponCode={db.platform_settings.subscription_coupon_code}
        adminEmail={session.email}
        priceIdCents={db.platform_settings.price_id_cents}
        psychCutIdCents={db.platform_settings.psych_cut_id_cents}
        monthlyFeeCents={db.platform_settings.monthly_fee_cents}
        sessionMinutes={db.platform_settings.session_duration_minutes}
      />
    </Shell>
  );
}
