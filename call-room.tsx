"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  completeSessionUiAction,
  markInCallAction,
  confirmAttendanceAction,
  rateClientAction,
  openSessionSacAction,
} from "@/lib/actions/session";

const SESSION_MS = 30 * 60 * 1000;

export function CallRoom({
  requestId,
  role,
  callStartedAt,
  status,
  sessionMinutes,
  whatsappUrl,
  psychName,
  psychCrp,
}: {
  requestId: string;
  role: "client" | "psych" | "admin";
  callStartedAt: string | null;
  status: string;
  sessionMinutes: number;
  whatsappUrl: string | null;
  psychName?: string | null;
  psychCrp?: string | null;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [clientRatingByPsych, setClientRatingByPsych] = useState<number>(0);
  const [clientCommentByPsych, setClientCommentByPsych] = useState("");
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

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
    if (role === "client") {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
            Sessão encerrada. Confirme o atendimento para liberar o repasse ao
            profissional (lote dias 10/28). Se abrir SAC, o valor fica em análise.
          </div>
          {psychName && (
            <p className="text-sm text-slate-700">
              Profissional: <strong>{psychName}</strong>
              {psychCrp ? ` · CRP ${psychCrp}` : ""}
            </p>
          )}
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
          {doneMsg && (
            <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
              {doneMsg}
            </p>
          )}
          <label className="flex items-start gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>Confirmo que o atendimento foi realizado</span>
          </label>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              Avaliação do profissional (opcional)
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 w-9 rounded-lg border text-sm ${
                    rating >= n
                      ? "border-amber-400 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                  onClick={() => setRating(n)}
                >
                  {n}★
                </button>
              ))}
            </div>
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm"
              rows={2}
              placeholder="Comentário opcional"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !confirmed}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await confirmAttendanceAction(requestId, {
                    confirmed: true,
                    rating: rating || null,
                    comment: comment || null,
                  });
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setDoneMsg(
                    "Confirmado. Repasse elegível para o próximo lote (dias 10/28)."
                  );
                  router.refresh();
                })
              }
            >
              Confirmar atendimento
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await openSessionSacAction(requestId, {});
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setDoneMsg(
                    "SAC aberto. Repasse em HOLD até análise do admin."
                  );
                  router.refresh();
                })
              }
            >
              Abrir SAC deste atendimento
            </button>
          </div>
        </div>
      );
    }

    // psych / admin post-session
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Sessão encerrada. O repasse só entra no lote após o cliente confirmar o
          atendimento (sem confirmação ou com SAC → análise admin).
        </div>
        {role === "psych" && (
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              Avaliar cliente (opcional)
            </p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`h-9 w-9 rounded-lg border text-sm ${
                    clientRatingByPsych >= n
                      ? "border-amber-400 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                  onClick={() => setClientRatingByPsych(n)}
                >
                  {n}★
                </button>
              ))}
            </div>
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-sm"
              rows={2}
              placeholder="Comentário opcional sobre o cliente"
              value={clientCommentByPsych}
              onChange={(e) => setClientCommentByPsych(e.target.value)}
            />
            <button
              type="button"
              disabled={pending}
              className="mt-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await rateClientAction(requestId, {
                    rating: clientRatingByPsych || null,
                    comment: clientCommentByPsych || null,
                  });
                  if (!res.ok) setError(res.error);
                  else {
                    setDoneMsg("Avaliação do cliente salva.");
                    router.refresh();
                  }
                })
              }
            >
              Salvar avaliação do cliente
            </button>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        )}
        {doneMsg && (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            {doneMsg}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800"
          onClick={() =>
            start(async () => {
              const res = await openSessionSacAction(requestId, {});
              if (!res.ok) setError(res.error);
              else {
                setDoneMsg("SAC aberto — payout em HOLD.");
                router.refresh();
              }
            })
          }
        >
          Abrir SAC deste atendimento
        </button>
      </div>
    );
  }

  return (
    <div>
      {(psychName || psychCrp) && (
        <p className="mb-3 text-sm text-slate-700">
          Psicólogo: <strong>{psychName}</strong>
          {psychCrp ? ` · CRP ${psychCrp}` : ""}
        </p>
      )}

      <div className="mb-6 flex aspect-video flex-col items-center justify-center rounded-xl bg-slate-900 p-6 text-center text-white">
        <p className="text-lg font-semibold">Atendimento via WhatsApp</p>
        <p className="mt-1 text-sm text-slate-300">
          Timer {sessionMinutes} min (orientação) · pedido {requestId.slice(0, 8)}
        </p>
        <p className="mt-3 font-mono text-2xl">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </p>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Abrir WhatsApp da consulta
          </a>
        ) : (
          <p className="mt-4 text-sm text-amber-300">
            WhatsApp do profissional indisponível.
          </p>
        )}
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
          {remaining === 0 ? "Finalizar (30 min)" : "Finalizar sessão"}
        </button>
      ) : (
        <p className="text-sm text-slate-500">
          Aguarde o psicólogo finalizar, ou o timer de 30 min.
        </p>
      )}
    </div>
  );
}
