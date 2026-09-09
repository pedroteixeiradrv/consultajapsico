export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { Shell, Card } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function AdminSacPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/admin/login");

  const db = await readStore();
  const tickets = [...db.sac_tickets].sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );

  return (
    <Shell title="SAC — tickets (somente admin)" backHref="/admin" right={<LogoutButton />}>
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Tickets do formulário público. Reembolso não é automático: só via SAC
          com comprovante.
        </p>
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum ticket ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Assunto</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Criado</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{t.subject}</div>
                      <div className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                        {t.body}
                      </div>
                      {t.proof_note && (
                        <div className="mt-1 text-xs text-amber-700">
                          Comprovante: {t.proof_note}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">{t.requester_email ?? "—"}</td>
                    <td className="py-3 pr-4">{t.status}</td>
                    <td className="py-3 text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
