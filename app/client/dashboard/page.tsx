export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { Shell } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { ClientDashboardClient } from "@/components/client-dashboard";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: { pay?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== "client") redirect("/client/login");

  const db = await readStore();
  const client = db.clients.find((c) => c.id === session.sub);
  if (!client) redirect("/client/login");

  const payId = searchParams.pay;
  const payReq = payId
    ? db.consultation_requests.find(
        (r) => r.id === payId && r.client_id === client.id && !r.paid_at
      )
    : undefined;

  const recent = db.consultation_requests
    .filter((r) => r.client_id === client.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      status: r.status,
      paid: Boolean(r.paid_at),
    }));

  return (
    <Shell
      title={`Olá, ${client.full_name}`}
      backHref="/"
      right={<LogoutButton />}
    >
      <ClientDashboardClient
        creditsCents={client.credits_cents}
        payRequestId={payReq?.id}
        payAmountCents={payReq?.price_cents}
        recent={recent}
      />
    </Shell>
  );
}
