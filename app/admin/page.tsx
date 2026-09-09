export const dynamic = 'force-dynamic';

import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, Card, formatBRL } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { readStore, storeBackendLabel } from "@/lib/store";
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

  return (
    <Shell
      title="Painel admin"
      backHref="/"
      right={<LogoutButton />}
    >
      <p className="mb-4 text-xs text-slate-400">
        Store: {storeBackendLabel()} · {session.email}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
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
              Mensalidade:{" "}
              {formatBRL(db.platform_settings.monthly_fee_cents)}
            </li>
            <li>
              Preço identificado:{" "}
              {formatBRL(db.platform_settings.price_id_cents)} / 30 min
            </li>
            <li>
              Corte psicólogo:{" "}
              {formatBRL(db.platform_settings.psych_cut_id_cents)} após
              completed
            </li>
            <li>Fila paga pendente: {pending}</li>
            <li>Psicólogos: {db.psychologists.length}</li>
            <li>Clientes: {db.clients.length}</li>
          </ul>
        </Card>
      </div>

      {inCall.length > 0 && (
        <Card className="mt-4">
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
    </Shell>
  );
}
