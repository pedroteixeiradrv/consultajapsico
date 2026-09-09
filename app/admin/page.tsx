import Link from "next/link";
import { Shell, Card, StubNote } from "@/components/ui";

export default function AdminDashboardPage() {
  return (
    <Shell title="Painel admin" backHref="/">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">SAC</h2>
          <p className="mb-3 text-sm text-slate-600">
            Somente admin pode ler tickets do formulário público.
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
            <li>Mensalidade psicólogo (LivePix depois)</li>
            <li>Preço identificado: R$50 / 30 min</li>
            <li>Corte psicólogo: R$40 após completed</li>
          </ul>
        </Card>
      </div>
      <StubNote>
        Dashboard stub. Métricas, payouts e moderação virão nas próximas fases.
      </StubNote>
    </Shell>
  );
}
