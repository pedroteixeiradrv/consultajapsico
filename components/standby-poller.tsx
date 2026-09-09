"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function StandbyPoller({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(`/api/requests/${requestId}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status: string };
        if (cancelled) return;
        setStatus(data.status);
        if (
          data.status === "accepted" ||
          data.status === "in_call" ||
          data.status === "completed"
        ) {
          router.push(`/call/${requestId}`);
        }
      } catch {
        /* ignore */
      }
    }
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [requestId, router]);

  return (
    <p className="mt-2 text-xs text-slate-400">
      Status: {status} · atualizando a cada 2s
    </p>
  );
}
