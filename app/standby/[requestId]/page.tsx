import Link from "next/link";
import { Shell, Card, StubNote } from "@/components/ui";

export default function StandbyPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { requestId } = params;

  return (
    <Shell title="Sala de espera" backHref="/">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />
          <p className="font-medium text-slate-800">
            Aguardando um psicólogo online aceitar…
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Pedido: <code className="rounded bg-slate-100 px-1">{requestId}</code>
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Você permanece aqui até o aceite. Sem reembolso automático se ninguém
          aceitar — abra o{" "}
          <Link href="/sac" className="text-teal-700 underline">
            SAC
          </Link>{" "}
          com comprovante se necessário.
        </p>
        <div className="mt-6">
          <Link
            href={`/call/${requestId}`}
            className="text-sm text-slate-400 underline"
          >
            (dev) ir para stub da chamada →
          </Link>
        </div>
        <StubNote>
          Standby room stub. Polling/realtime do status pending→accepted na
          próxima fase.
        </StubNote>
      </Card>
    </Shell>
  );
}
