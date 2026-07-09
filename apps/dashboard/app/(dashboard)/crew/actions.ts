"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Role } from "@photog-bot/shared";
import { requireIC } from "@/lib/auth";
import { getDefaultDepartmentId } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

function generateInviteCode(): string {
  return randomBytes(9).toString("base64url");
}

export async function addPerson(formData: FormData): Promise<void> {
  await requireIC();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const telegramHandle = String(formData.get("telegramHandle") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "crew") as Role;
  if (!fullName) throw new Error("Name is required");

  const departmentId = await getDefaultDepartmentId();
  const { error } = await supabase.from("people").insert({
    department_id: departmentId,
    full_name: fullName,
    telegram_handle: telegramHandle,
    role,
    invite_code: generateInviteCode(),
  });
  if (error) throw error;

  revalidatePath("/crew");
}

export async function updatePerson(formData: FormData): Promise<void> {
  await requireIC();

  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const telegramHandle = String(formData.get("telegramHandle") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "crew") as Role;
  if (!id || !fullName) throw new Error("Missing required fields");

  const { error } = await supabase
    .from("people")
    .update({ full_name: fullName, telegram_handle: telegramHandle, role })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/crew");
}

export async function setPersonActive(formData: FormData): Promise<void> {
  await requireIC();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!id) throw new Error("Missing person id");

  const { error } = await supabase.from("people").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;

  revalidatePath("/crew");
}

export async function regenerateInviteCode(formData: FormData): Promise<void> {
  await requireIC();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing person id");

  const { error } = await supabase.from("people").update({ invite_code: generateInviteCode() }).eq("id", id);
  if (error) throw error;

  revalidatePath("/crew");
}
