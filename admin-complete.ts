"use server";

import { revalidatePath } from "next/cache";
import { adminCompleteSessionAction } from "@/lib/actions/admin";

export async function adminCompleteFormAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;
  await adminCompleteSessionAction(requestId);
  revalidatePath("/admin");
}
