import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <Shell title="Login admin" backHref="/">
      <Card>
        <form className="max-w-md">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Btn type="submit">Entrar</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Ainda não existe admin?{" "}
          <Link href="/admin/setup" className="text-teal-700 underline">
            Configurar primeiro acesso
          </Link>
        </p>
        <StubNote>Stub de autenticação — middleware real depois.</StubNote>
      </Card>
    </Shell>
  );
}
