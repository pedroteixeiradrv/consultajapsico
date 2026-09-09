"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeSessionUiAction,
  markInCallAction,
} from "@/lib/actions/session";

const SESSION_MS = 30 * 60 * 1000;

export function CallRoom({
  requestId,
  role,
  callStartedAt,
  status,
  sessionMinutes,
}: {
  requestId: string;
  role: "client" | "psych" | "admin";
  callStartedAt: string | null;
  status: string;
  sessionMinutes: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const started = useMemo(
    () => (callStartedAt ? new Date(callStartedAt).getTime() : Date.now()),
    [callStartedAt]
  );

  useEffect(() => {
    if (status === "accepted") {
      markInCallAction(requestId).then(() => router.refresh());
    }
  }, [status, requestId, router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - started);
  const remaining = Math.max(0, SESSION_MS - elapsed);
  const canComplete =
    role === "psych" || role === "admin" || remaining === 0;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  if (status === "completed") {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
        Sessão encerrada. Payout de R$40 creditado ao psicólogo (se aplicável).
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Sala voz / vídeo</p>
          <p className="mt-1 text-sm text-slate-300">LiveKit stub</p>
          <p className="mt-3 font-mono text-2xl">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            restante de {sessionMinutes} min · pedido {requestId.slice(0, 8)}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      {canComplete ? (
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await completeSessionUiAction(requestId);
              if (res && !res.ok) {
                setError(res.error);
                return;
              }
              router.refresh();
            })
          }
        >
          {remaining === 0 ? "Encerrar (30 min)" : "Encerrar sessão"}
        </button>
      ) : (
        <p className="text-sm text-slate-500">
          Aguarde o psicólogo encerrar, ou o timer de 30 min.
        </p>
      )}
    </div>
  );
}
