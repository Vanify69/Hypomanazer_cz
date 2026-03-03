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
