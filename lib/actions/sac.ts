"use server";

import { redirect } from "next/navigation";
import { mutateStore, newId, nowIso } from "@/lib/store";
import type { ActionResult } from "@/lib/actions/admin";

export async function submitSacAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const proof_note = String(formData.get("proofNote") ?? "").trim() || null;

  if (!subject || !body) {
    return { ok: false, error: "Assunto e mensagem são obrigatórios." };
  }

  const now = nowIso();
  await mutateStore((db) => {
    db.sac_tickets.push({
      id: newId(),
      requester_email: email,
      subject,
      body,
      consultation_request_id: null,
      proof_note,
      status: "open",
      admin_notes: null,
      created_at: now,
      updated_at: now,
    });
  });

  redirect("/sac?sent=1");
}
