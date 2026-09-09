import Link from "next/link";
import { Shell, Card, Btn, StubNote } from "@/components/ui";

export default function ClientDashboardPage() {
  return (
    <Shell title="Minha conta" backHref="/">
      <Card className="mb-4">
        <h2 className="mb-1 font-semibold">Créditos</h2>
        <p className="text-3xl font-bold text-teal-700">R$ 0,00</p>
        <p className="mt-2 text-sm text-slate-600">
          Cada sessão de 30 min custa R$50 (débito de créditos).
        </p>
        <div className="mt-4">
          <Btn>Comprar créditos (LivePix stub)</Btn>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Iniciar consulta</h2>
        <p className="mb-3 text-sm text-slate-600">
          Solicite e aguarde um psicólogo online aceitar a fila.
        </p>
        <Btn>Pedir consulta (stub)</Btn>
        <p className="mt-4 text-sm text-slate-500">
          Problemas?{" "}
          <Link href="/sac" className="text-teal-700 underline">
            Abrir SAC
          </Link>
        </p>
        <StubNote>
          Stub de saldo. Payout ao psicólogo só após completed — não no pedido.
        </StubNote>
      </Card>
    </Shell>
  );
}
