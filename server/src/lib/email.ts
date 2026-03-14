/**
 * E-mail provider – Resend.
 * Šablona pro intake link. Retry 2× volá volající (worker).
 */

export interface EmailProvider {
  send(to: string, subject: string, bodyHtml: string): Promise<void>;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM = process.env.RESEND_FROM?.trim();

export function getEmailProvider(): EmailProvider | null {
  if (!RESEND_API_KEY || !RESEND_FROM) return null;
  return {
    async send(to: string, subject: string, bodyHtml: string): Promise<void> {
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: RESEND_FROM,
        to: [to],
        subject,
        html: bodyHtml,
      });
      if (error) throw new Error(error.message);
    },
  };
}

export function buildIntakeLinkEmailBody(intakeLink: string): { subject: string; html: string } {
  const subject = "Bezpečný odkaz pro nahrání podkladů";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 560px;">
  <p>Dobrý den,</p>
  <p>Váš poradce vás žádá o nahrání podkladů k hypoteční žádosti.</p>
  <p>Klikněte na odkaz níže (platnost odkazu je omezena):</p>
  <p style="margin: 1.5em 0;"><a href="${intakeLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px;">Otevřít formulář pro nahrání podkladů</a></p>
  <p style="font-size: 0.9em; color: #666;">Odkaz: ${intakeLink}</p>
  <p style="font-size: 0.85em; color: #666;">Vaše údaje jsou zpracovávány v souladu s ochranou osobních údajů (GDPR).</p>
  <p>S pozdravem,<br>HypoManager</p>
</body>
</html>`.trim();
  return { subject, html };
}

export function buildReferrerLinkEmailBody(referrerLink: string, displayName: string): { subject: string; html: string } {
  const subject = "Váš odkaz pro zadávání leadů";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>Dobrý den${displayName ? `, ${displayName}` : ""},</p>
  <p>Zde je váš odkaz pro zadávání leadů:</p>
  <p><a href="${referrerLink}" style="color: #2563eb;">${referrerLink}</a></p>
  <p>Přes tento odkaz můžete zadávat nové leady a sledovat stav obchodů.</p>
  <p>S pozdravem,<br>HypoManager</p>
</body>
</html>`.trim();
  return { subject, html };
}

export const noopEmailProvider: EmailProvider = {
  async send() {
    /* no-op */
  },
};

// --- Kalendářové šablony ---

const TYPE_LABELS: Record<string, string> = {
  meeting: "Schůzka",
  task: "Úkol",
  call: "Telefonát",
  reminder: "Připomínka",
};

const TYPE_EMOJI: Record<string, string> = {
  meeting: "📅",
  task: "✅",
  call: "📞",
  reminder: "🔔",
};

function formatDateCz(d: Date, allDay: boolean): string {
  const opts: Intl.DateTimeFormatOptions = allDay
    ? { weekday: "short", day: "numeric", month: "long", year: "numeric" }
    : { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
  return d.toLocaleDateString("cs-CZ", opts);
}

export interface CalendarEmailEventData {
  title: string;
  type: string;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
  caseName?: string | null;
  eventUrl?: string;
}

export function buildCalendarReminderEmailBody(event: CalendarEmailEventData): { subject: string; html: string } {
  const emoji = TYPE_EMOJI[event.type] ?? "📅";
  const typeLabel = TYPE_LABELS[event.type] ?? "Událost";
  const subject = `${emoji} Připomínka: ${event.title}`;
  const dateStr = formatDateCz(event.startAt, !!event.allDay);

  const locationRow = event.location
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top;">Místo:</td><td style="padding:4px 0;">${event.location}</td></tr>`
    : "";
  const caseRow = event.caseName
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top;">Případ:</td><td style="padding:4px 0;">${event.caseName}</td></tr>`
    : "";
  const descRow = event.description
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top;">Poznámka:</td><td style="padding:4px 0;">${event.description}</td></tr>`
    : "";
  const endRow = event.endAt
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top;">Konec:</td><td style="padding:4px 0;">${formatDateCz(event.endAt, !!event.allDay)}</td></tr>`
    : "";
  const btnRow = event.eventUrl
    ? `<p style="margin:1.5em 0;"><a href="${event.eventUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;">Otevřít v kalendáři</a></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;line-height:1.6;color:#333;max-width:560px;">
  <p style="font-size:18px;font-weight:600;margin-bottom:4px;">${emoji} ${typeLabel}: ${event.title}</p>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="color:#888;padding:4px 12px 4px 0;vertical-align:top;">Kdy:</td><td style="padding:4px 0;font-weight:500;">${dateStr}</td></tr>
    ${endRow}${locationRow}${caseRow}${descRow}
  </table>
  ${btnRow}
  <p style="font-size:13px;color:#888;margin-top:2em;">Tento email byl odeslán automaticky z HypoManažeru.</p>
</body>
</html>`.trim();

  return { subject, html };
}

export function buildEventCreatedEmailBody(
  event: CalendarEmailEventData,
  creatorName: string,
): { subject: string; html: string } {
  const emoji = TYPE_EMOJI[event.type] ?? "📅";
  const typeLabel = TYPE_LABELS[event.type] ?? "Událost";
  const subject = `${emoji} Nová událost: ${event.title}`;
  const dateStr = formatDateCz(event.startAt, !!event.allDay);

  const locationRow = event.location
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;">Místo:</td><td style="padding:4px 0;">${event.location}</td></tr>`
    : "";
  const caseRow = event.caseName
    ? `<tr><td style="color:#888;padding:4px 12px 4px 0;">Případ:</td><td style="padding:4px 0;">${event.caseName}</td></tr>`
    : "";
  const btnRow = event.eventUrl
    ? `<p style="margin:1.5em 0;"><a href="${event.eventUrl}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;">Zobrazit událost</a></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;line-height:1.6;color:#333;max-width:560px;">
  <p>Dobrý den,</p>
  <p>${creatorName} vytvořil(a) novou událost:</p>
  <p style="font-size:18px;font-weight:600;margin-bottom:4px;">${emoji} ${typeLabel}: ${event.title}</p>
  <table style="font-size:14px;border-collapse:collapse;">
    <tr><td style="color:#888;padding:4px 12px 4px 0;">Kdy:</td><td style="padding:4px 0;font-weight:500;">${dateStr}</td></tr>
    ${locationRow}${caseRow}
  </table>
  ${btnRow}
  <p style="font-size:13px;color:#888;margin-top:2em;">Tento email byl odeslán automaticky z HypoManažeru.</p>
</body>
</html>`.trim();

  return { subject, html };
}
