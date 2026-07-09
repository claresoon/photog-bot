import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  personId?: string;
  telegramId?: number;
  fullName?: string;
  role?: "ic";
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "photog_bot_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
