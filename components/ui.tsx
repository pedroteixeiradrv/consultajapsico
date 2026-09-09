import Link from "next/link";
import { ReactNode } from "react";

export function Shell({
  title,
  children,
  backHref,
  right,
}: {
  title: string;
  children: ReactNode;
  backHref?: string;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-teal-700">
            ConsultaJáPsico
          </Link>
          <div className="flex items-center gap-3">
            {right}
            {backHref ? (
              <Link
                href={backHref}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Voltar
              </Link>
            ) : (
              <span className="text-xs text-slate-400">
                apoio psicológico rápido
              </span>
            )}
          </div>
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
    <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      {children}
    </p>
  );
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {message}
    </p>
  );
}

export function SuccessBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
      {message}
    </p>
  );
}

export function Btn({
  children,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
  formAction,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
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
    <button
      type={type}
      disabled={disabled}
      formAction={formAction}
      className={`${base} ${styles} ${className}`}
    >
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
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
      />
    </label>
  );
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
