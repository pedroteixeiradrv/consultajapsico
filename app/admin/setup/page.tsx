export const dynamic = 'force-dynamic';

import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell, Card } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { adminSetupAction } from "@/lib/actions/admin";
import { readStore } from "@/lib/store";

export default async function AdminSetupPage() {
  const db = await readStore();
  if (db.admins.length > 0) {
    redirect("/admin/login");
  }

  return (
    <Shell title="Criar administrador" backHref="/">
      <Card>
        <p className="mb-4 text-sm text-slate-600">
          O primeiro acesso cria o usuário admin e a senha. Um segundo cadastro
          de admin retorna erro.
        </p>
        <ActionForm action={adminSetupAction} submitLabel="Criar admin">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Field
            label="Confirmar senha"
            name="passwordConfirm"
            type="password"
            required
          />
        </ActionForm>
        <p className="mt-4 text-sm text-slate-500">
          Já tem admin?{" "}
          <Link href="/admin/login" className="text-teal-700 underline">
            Entrar
          </Link>
        </p>
      </Card>
    </Shell>
  );
}
