import Link from "next/link";
import { ReactNode } from "react";

export function Shell({
  title,
  children,
  backHref,
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-teal-700">
            ConsultaJáPsico
          </Link>
          {backHref ? (
            <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">
              Voltar
            </Link>
          ) : (
            <span className="text-xs text-slate-400">apoio psicológico rápido</span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StubNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 border border-amber-100">
      {children}
    </p>
  );
}

export function Btn({
  children,
  type = "button",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-700"
        : "bg-slate-100 text-slate-800 hover:bg-slate-200";
  return (
    <button type={type} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}
