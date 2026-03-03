/**
 * SMS provider – Twilio.
 * Normalizace na E.164 (CZ +420). Retry 2× (backoff 2s, 10s) volá volající (worker).
 */

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

const CZ_PREFIX = "+420";

/** Normalizuje české číslo na E.164 (+420...) */
export function normalizePhoneE164(phone: string, defaultCountry = CZ_PREFIX): string {
  let s = phone.replace(/\s+/g, "").replace(/^00/, "+");
  if (/^\+/.test(s)) return s;
  if (/^420/.test(s)) return "+" + s;
  if (/^0/.test(s)) return defaultCountry + s.slice(1).replace(/\D/g, "");
  s = s.replace(/\D/g, "");
  if (s.length === 9) return defaultCountry + s;
  return defaultCountry + s;
}

function createTwilioProvider(): SmsProvider | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();
  if (!accountSid || !authToken || !from) return null;
  try {
    return {
      async send(phone: string, message: string): Promise<void> {
        const twilio = await import("twilio");
        const client = twilio.default(accountSid, authToken);
        const to = normalizePhoneE164(phone);
        await client.messages.create({
          body: message,
          from,
          to,
        });
      },
    };
  } catch {
    return null;
  }
}

let cached: SmsProvider | null | undefined = undefined;

export function getSmsProvider(): SmsProvider | null {
  if (cached === undefined) {
    cached = createTwilioProvider();
  }
  return cached;
}

/** No-op provider když Twilio není nakonfigurováno */
export const noopSmsProvider: SmsProvider = {
  async send() {
    /* no-op */
  },
};
