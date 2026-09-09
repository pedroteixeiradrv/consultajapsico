import Link from "next/link";
import { Shell, Card, Field, Btn, StubNote } from "@/components/ui";

export default function PsychLoginPage() {
  return (
    <Shell title="Login psicólogo" backHref="/">
      <Card>
        <form className="max-w-md">
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Senha" name="password" type="password" required />
          <Btn type="submit">Entrar</Btn>
        </form>
        <p className="mt-4 text-sm text-slate-500">
          Novo aqui?{" "}
          <Link href="/psych/register" className="text-teal-700 underline">
            Criar conta
          </Link>
        </p>
        <StubNote>Auth stub — sessão real depois.</StubNote>
      </Card>
    </Shell>
  );
}
