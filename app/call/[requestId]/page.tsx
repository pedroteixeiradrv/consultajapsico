export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { Shell, Card, StubNote } from "@/components/ui";
import { CallRoom } from "@/components/call-room";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { createRoomToken } from "@/lib/livekit";

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

  const token = await createRoomToken({
    requestId,
    identity: session.sub,
    name: session.email,
  });

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
        />
        <p className="mt-4 text-xs text-slate-400">
          LiveKit room: {token.roomName} (token stub)
        </p>
        <StubNote>
          Encerrar → status completed → payout R$40 no saldo do psicólogo.
        </StubNote>
      </Card>
    </Shell>
  );
}
