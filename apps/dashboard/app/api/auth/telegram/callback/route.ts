import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { verifyTelegramAuth, type TelegramAuthPayload } from "@/lib/telegram-auth";

export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const payload: TelegramAuthPayload = {
    id: Number(params.get("id")),
    first_name: params.get("first_name") ?? undefined,
    last_name: params.get("last_name") ?? undefined,
    username: params.get("username") ?? undefined,
    photo_url: params.get("photo_url") ?? undefined,
    auth_date: Number(params.get("auth_date")),
    hash: params.get("hash") ?? "",
  };

  if (!payload.id || !payload.auth_date || !verifyTelegramAuth(payload, botToken)) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  let { data: person, error } = await supabase
    .from("people")
    .select("*")
    .eq("telegram_id", payload.id)
    .maybeSingle();
  if (error) throw error;

  // First-time login for an IC seeded by handle only (see README "Setup" step 4):
  // link telegram_id the same way the bot's /start handler does.
  if (!person && payload.username) {
    const { data: byHandle, error: handleError } = await supabase
      .from("people")
      .select("*")
      .ilike("telegram_handle", payload.username)
      .is("telegram_id", null)
      .maybeSingle();
    if (handleError) throw handleError;

    if (byHandle) {
      const { data: linked, error: linkError } = await supabase
        .from("people")
        .update({ telegram_id: payload.id })
        .eq("id", byHandle.id)
        .select("*")
        .single();
      if (linkError) throw linkError;
      person = linked;
    }
  }

  if (!person || person.role !== "ic" || !person.is_active) {
    return NextResponse.redirect(new URL("/login?error=not_authorized", request.url));
  }

  const session = await getSession();
  session.personId = person.id;
  session.telegramId = payload.id;
  session.fullName = person.full_name;
  session.role = "ic";
  await session.save();

  return NextResponse.redirect(new URL("/availability", request.url));
}
