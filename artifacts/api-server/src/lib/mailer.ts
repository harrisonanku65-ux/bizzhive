import { logger } from "./logger";

/**
 * Transactional email.
 *
 * Uses Resend's REST API over plain fetch — no SDK dependency, which keeps the
 * supply-chain surface small and avoids the workspace's minimum-release-age
 * install friction.
 *
 * When RESEND_API_KEY is unset (local dev, or before you've signed up) nothing
 * is sent: the message is logged instead, so you can see exactly what *would*
 * have gone out while developing. Sending is never allowed to break a request —
 * a failed email must not roll back a completed payment.
 *
 * To go live:
 *   1. Create a Resend account and verify your sending domain
 *   2. Set RESEND_API_KEY and MAIL_FROM (e.g. "BizzHive <noreply@bizzhivegh.com>")
 */

const RESEND_API_KEY = process.env["RESEND_API_KEY"] ?? "";
const MAIL_FROM = process.env["MAIL_FROM"] ?? "BizzHive <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env["ADMIN_NOTIFICATION_EMAIL"] ?? "";
const APP_URL = process.env["APP_URL"] ?? "";

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Plain-text body. Wrapped in the shared HTML shell automatically. */
  body: string;
  /** Optional call-to-action rendered as a button. */
  action?: { label: string; path: string };
}

/** Minimal escaping — all email content here is user-influenced somewhere. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(opts: SendEmailOptions): string {
  const paragraphs = opts.body
    .trim()
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46">${esc(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  const button = opts.action
    ? `<a href="${APP_URL}${opts.action.path}" style="display:inline-block;background:#C9A227;color:#1A1400;text-decoration:none;font-weight:600;font-size:15px;padding:12px 26px;border-radius:999px">${esc(opts.action.label)}</a>`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FAF9F5;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E8E5DC">
<tr><td style="background:#1A1A2E;padding:20px 28px;border-radius:12px 12px 0 0">
<span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:-0.3px">Bizz<span style="color:#C9A227">Hive</span></span>
</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 18px;font-size:19px;color:#1A1A2E">${esc(opts.subject)}</h1>
${paragraphs}
${button}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E8E5DC;font-size:12px;color:#8A8A85">
BizzHive — Ghana's trusted digital marketplace.<br>
You're receiving this because of activity on your BizzHive account.
</td></tr>
</table></body></html>`;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!opts.to) return false;

  if (!RESEND_API_KEY) {
    logger.info(
      { to: opts.to, subject: opts.subject },
      "email not sent (RESEND_API_KEY unset) — logging instead",
    );
    return false;
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: renderHtml(opts),
        text: opts.body,
      }),
    });

    if (!resp.ok) {
      logger.error(
        { status: resp.status, to: opts.to, subject: opts.subject },
        "email send failed",
      );
      return false;
    }
    return true;
  } catch (err) {
    // Swallowed deliberately: a mail outage must never fail the request that
    // triggered it. A buyer's payment is not undone by a missing receipt.
    logger.error({ err, to: opts.to }, "email send threw");
    return false;
  }
}

/** Notifies the operations inbox, if one is configured. */
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  if (!ADMIN_EMAIL) return;
  await sendEmail({ to: ADMIN_EMAIL, subject, body });
}
