import crypto from "node:crypto";

export interface TelegramAuthPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Verifies a Telegram Login Widget payload per
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramAuth(payload: TelegramAuthPayload, botToken: string): boolean {
  const { hash, ...rest } = payload;
  if (!hash) return false;

  const checkString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");

  const computedBuffer = Buffer.from(computedHash, "hex");
  const providedBuffer = Buffer.from(hash, "hex");
  if (computedBuffer.length !== providedBuffer.length) return false;
  if (!crypto.timingSafeEqual(computedBuffer, providedBuffer)) return false;

  const ageSeconds = Date.now() / 1000 - payload.auth_date;
  return ageSeconds >= 0 && ageSeconds < MAX_AUTH_AGE_SECONDS;
}
