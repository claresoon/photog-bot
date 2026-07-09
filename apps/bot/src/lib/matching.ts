import type { Person } from "@photog-bot/shared";
import { supabase } from "./supabase.js";

/**
 * Resolves a Telegram user to a `people` row, matching on (in order of
 * preference): already-linked telegram_id, invite code (from a /start
 * deep link), then @handle. Once matched, telegram_id is persisted as
 * the source of truth — see SPEC.md §5.
 */
export async function matchTelegramUser(params: {
  telegramId: number;
  handle?: string;
  inviteCode?: string;
}): Promise<Person | null> {
  const { data: existing, error: existingError } = await supabase
    .from("people")
    .select("*")
    .eq("telegram_id", params.telegramId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  if (params.inviteCode) {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("invite_code", params.inviteCode)
      .is("telegram_id", null)
      .maybeSingle();
    if (error) throw error;
    if (data) return linkTelegramId(data.id, params.telegramId);
  }

  if (params.handle) {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .ilike("telegram_handle", params.handle)
      .is("telegram_id", null)
      .maybeSingle();
    if (error) throw error;
    if (data) return linkTelegramId(data.id, params.telegramId);
  }

  return null;
}

export async function getPersonByTelegramId(telegramId: number): Promise<Person | null> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function linkTelegramId(personId: string, telegramId: number): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .update({ telegram_id: telegramId })
    .eq("id", personId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
