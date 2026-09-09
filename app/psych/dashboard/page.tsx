"use client";

import { useState } from "react";
import { Shell, Card, StubNote } from "@/components/ui";

const PENDING = [
  { id: "req-stub-1", kind: "identified", since: "agora" },
  { id: "req-stub-2", kind: "identified", since: "2 min" },
];

export default function PsychDashboardPage() {
  const [online, setOnline] = useState(false);

  return (
    <Shell title="Painel do psicólogo" backHref="/">
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Status online</h2>
            <p className="text-sm text-slate-600">
              Você precisa estar online e aceitar a fila pendente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOnline((v) => !v)}
            className={`inline-flex min-w-[140px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white ${
              online
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {online ? "Ficar offline" : "Ficar online"}
          </button>
        </div>
        <p className="mt-3 text-sm">
          Agora:{" "}
          <span
            className={
              online ? "font-semibold text-teal-700" : "text-slate-500"
            }
          >
            {online ? "ONLINE" : "offline"}
          </span>
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Fila pendente</h2>
        <ul className="divide-y divide-slate-100">
          {PENDING.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span>
                Pedido <code>{r.id}</code> · {r.kind} · {r.since}
              </span>
              <button
                type="button"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Aceitar
              </button>
            </li>
          ))}
        </ul>
        <StubNote>
          Stub de fila (somente clientes identificados). Aceitar → status
          accepted → sala LiveKit. Payout Pix só depois de completed / timer 30
          min (lib/payout.ts).
        </StubNote>
      </Card>
    </Shell>
  );
}
