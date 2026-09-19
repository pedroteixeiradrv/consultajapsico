export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Shell, Card, StubNote } from "@/components/ui";
import { CallRoom } from "@/components/call-room";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { whatsappMeUrl } from "@/lib/whatsapp";

export default async function CallPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { requestId } = params;
  const session = await getSession();
  if (!session) redirect("/");

  const db = await readStore();
  const req = db.consultation_requests.find((r) => r.id === requestId);
  if (!req) redirect("/");

  const allowed =
    (session.role === "client" && req.client_id === session.sub) ||
    (session.role === "psych" && req.psychologist_id === session.sub) ||
    session.role === "admin";
  if (!allowed) redirect("/");

  if (req.status === "pending") {
    redirect(
      session.role === "client"
        ? `/standby/${requestId}`
        : "/psych/dashboard"
    );
  }

  const psych = req.psychologist_id
    ? db.psychologists.find((p) => p.id === req.psychologist_id)
    : null;
  const wa = whatsappMeUrl(psych?.whatsapp ?? null);

  return (
    <Shell
      title="Consulta em andamento"
      backHref={
        session.role === "psych"
          ? "/psych/dashboard"
          : session.role === "admin"
            ? "/admin"
            : "/client/dashboard"
      }
    >
      <Card>
        <CallRoom
          requestId={requestId}
          role={session.role === "admin" ? "admin" : session.role}
          callStartedAt={req.call_started_at ?? req.accepted_at}
          status={req.status}
          sessionMinutes={db.platform_settings.session_duration_minutes}
          whatsappUrl={wa}
          psychName={psych?.full_name ?? null}
          psychCrp={psych?.crp ?? null}
        />
        <StubNote>
          Repasse ao psicólogo só após o cliente confirmar o atendimento. SAC
          nesta sessão coloca o valor em HOLD para o admin.
        </StubNote>
      </Card>
    </Shell>
  );
}
