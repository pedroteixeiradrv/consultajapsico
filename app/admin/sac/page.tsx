import { Shell, Card, StubNote } from "@/components/ui";

const PLACEHOLDER = [
  {
    id: "stub-1",
    subject: "Pedido de suporte geral",
    status: "open",
    created: "—",
  },
];

export default function AdminSacPage() {
  return (
    <Shell title="SAC — tickets (somente admin)" backHref="/admin">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          Tickets do formulário público. Reembolso não é automático: só via SAC
          com comprovante.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4">Assunto</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Criado</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{t.subject}</td>
                  <td className="py-3 pr-4">{t.status}</td>
                  <td className="py-3">{t.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <StubNote>
          Lista placeholder. Leitura real de <code>sac_tickets</code> + RLS
          admin-only na integração Supabase.
        </StubNote>
      </Card>
    </Shell>
  );
}
