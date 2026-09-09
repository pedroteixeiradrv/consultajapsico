import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function ClientLoginPage() {
  return (
    <Shell title="Login cliente" backHref="/">
      <Card>
        <form className="max-w-md">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Btn type="submit">Entrar</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Novo?{" "}
          <Link href="/client/register" className="text-teal-700 underline">
            Criar conta
          </Link>
        </p>
        <StubNote>Auth stub.</StubNote>
      </Card>
    </Shell>
  );
}
