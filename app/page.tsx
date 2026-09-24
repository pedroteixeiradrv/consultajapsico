export const dynamic = "force-dynamic";

import Link from "next/link";
import { formatBRL } from "@/components/ui";
import { readStore } from "@/lib/store";

export default async function HomePage() {
  const db = await readStore();
  const price = formatBRL(db.platform_settings.price_id_cents);
  const minutes = db.platform_settings.session_duration_minutes;

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-xl font-bold text-teal-800">ConsultaJáPsico</span>
        <nav className="flex gap-3 text-sm">
          <Link href="/sac" className="text-slate-600 hover:text-teal-700">
            SAC
          </Link>
          <Link href="/psych/login" className="text-slate-600 hover:text-teal-700">
            Psicólogos
          </Link>
          <Link href="/admin/login" className="text-slate-600 hover:text-teal-700">
            Admin
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-teal-700">
            Apoio psicológico rápido
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Converse com um psicólogo online em minutos
          </h1>
          <p className="mb-8 text-lg text-slate-600">
            Sessões de {minutes} minutos com conta identificada. Psicólogos ficam
            online e aceitam a fila em tempo real.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/client/register"
              className="rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Sou cliente
            </Link>
            <Link
              href="/psych/register"
              className="rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Sou psicólogo
            </Link>
          </div>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Clientes</h2>
            <p className="text-sm text-slate-600">
              Conta identificada. Sessão de {minutes} minutos por {price}. Sem
              fluxo anônimo.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-slate-900">Psicólogos</h2>
            <p className="text-sm text-slate-600">
              Cadastro, status online e aceite da fila. Mensalidade libera
              e-mail; online sem mensalidade ainda pode Aceitar. Pix só após
              sessão concluída.
            </p>
          </div>
        </section>

        <p className="mt-10 text-xs text-slate-400">
          ConsultaJáPsico
        </p>
      </main>
    </div>
  );
}
