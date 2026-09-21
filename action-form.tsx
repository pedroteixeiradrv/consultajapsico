"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ReactNode } from "react";
import { Btn, ErrorBox } from "@/components/ui";
import type { ActionResult } from "@/lib/actions/admin";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Btn type="submit" disabled={pending}>
      {pending ? "Aguarde…" : label}
    </Btn>
  );
}

export function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (
    prev: ActionResult | null,
    formData: FormData
  ) => Promise<ActionResult>;
  submitLabel: string;
  children: ReactNode;
}) {
  const [state, formAction] = useFormState(action, null);
  return (
    <form action={formAction} className="max-w-md">
      <ErrorBox message={state && !state.ok ? state.error : null} />
      {children}
      <Submit label={submitLabel} />
    </form>
  );
}
