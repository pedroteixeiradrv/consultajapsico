export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Shell } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { PsychDashboardClient } from "@/components/psych-dashboard";
import { getSession } from "@/lib/auth";
import { readStore } from "@/lib/store";

export default async function PsychDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "psych") redirect("/psych/login");

  const db = await readStore();
  const psych = db.psychologists.find((p) => p.id === session.sub);
  if (!psych) redirect("/psych/login");

  const queue = db.consultation_requests
    .filter((r) => r.status === "pending" && r.paid_at && !r.psychologist_id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({
      id: r.id,
      created_at: r.created_at,
      price_cents: r.price_cents,
    }));

  return (
    <Shell
      title={`Painel — ${psych.full_name}`}
      backHref="/"
      right={<LogoutButton />}
    >
      <PsychDashboardClient
        initialOnline={psych.online}
        subscriptionStatus={psych.subscription_status}
        subscriptionExpiresAt={psych.subscription_expires_at}
        verificationStatus={psych.verification_status}
        payoutBalanceCents={psych.payout_balance_cents}
        queue={queue}
      />
    </Shell>
  );
}
