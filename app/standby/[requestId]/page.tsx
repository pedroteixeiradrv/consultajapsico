export const dynamic = 'force-dynamic';

import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, Card } from "@/components/ui";
import { StandbyPoller } from "@/components/standby-poller";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function StandbyPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { requestId } = params;
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/client/login");

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req || req.client_id !== session.sub) {
    redirect("/client/dashboard");
  }
  if (!req.paid_at) {
    redirect(`/client/dashboard?pay=${requestId}`);
  }
  if (
    req.status === "accepted" ||
    req.status === "in_call" ||
    req.status === "completed"
  ) {
    redirect(`/call/${requestId}`);
  }

  return (
    <Shell title="Sala de espera" backHref="/client/dashboard">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />
          <p className="font-medium text-slate-800">
            Aguardando um psicólogo online aceitar…
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Pedido:{" "}
          <code className="rounded bg-slate-100 px-1">{requestId}</code>
        </p>
        <StandbyPoller requestId={requestId} />
        <p className="mt-3 text-sm text-slate-600">
          Você permanece aqui até o aceite. Sem reembolso automático se ninguém
          aceitar — abra o{" "}
          <Link href="/sac" className="text-teal-700 underline">
            SAC
          </Link>{" "}
          com comprovante se necessário.
        </p>
      </Card>
    </Shell>
  );
}
