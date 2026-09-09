export const dynamic = 'force-dynamic';

import Link from "next/link";
import { Shell, Card, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { adminLoginAction } from "@/lib/actions/admin";
import { readStore } from "@/lib/store";

export default async function AdminLoginPage() {
  const db = await readStore();
  const hasAdmin = db.admins.length > 0;

  return (
    <Shell title="Login admin" backHref="/">
      <Card>
        <ActionForm action={adminLoginAction} submitLabel="Entrar">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
        </ActionForm>
        {!hasAdmin ? (
          <p className="mt-4 text-sm text-slate-500">
            Ainda não existe admin?{" "}
            <Link href="/admin/setup" className="text-teal-700 underline">
              Configurar primeiro acesso
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            Bootstrap já feito — segundo admin é bloqueado.
          </p>
        )}
      </Card>
    </Shell>
  );
}
