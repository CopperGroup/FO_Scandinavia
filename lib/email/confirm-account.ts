// Server-only module (not a server action): the recipient and the link come from our own code.
import nodemailer from "nodemailer"
import { Store } from "@/constants/store"

export class MailNotConfigured extends Error {}

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string)

/** Where the confirmation link points: this deployment's own address. */
export function confirmationLink(token: string): string {
  const base = (process.env.NEXTAUTH_URL || process.env.DOMAIN || Store.domain).replace(/\/+$/, "")
  return `${base}/verifyemail?token=${token}`
}

/**
 * The letter that proves a mailbox belongs to whoever is registering on it.
 * Sent when the address already has orders made without an account: the
 * account, with those orders in it, opens only from this link.
 * Throws when the letter cannot be sent; the caller then cancels the request.
 */
export async function sendAccountConfirmationEmail(toEmail: string, token: string): Promise<void> {
  const link = confirmationLink(token)

  if (!process.env.BREVO_LOGIN || !process.env.BREVO_PASSWORD) {
    if (process.env.NODE_ENV !== "production") {
      // No mail on a developer's machine: the link goes to the server log instead.
      console.info(`[signup] confirmation link for ${toEmail}: ${link}`)
      return
    }
    throw new MailNotConfigured("Mail credentials are not set")
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: process.env.BREVO_LOGIN, pass: process.env.BREVO_PASSWORD },
  })

  const name = escape(Store.name)
  await transporter.sendMail({
    from: `${Store.name} <${Store.email}>`,
    to: toEmail,
    subject: `Підтвердьте e-mail | ${Store.name}`,
    text: [
      `Хтось реєструється в магазині ${Store.name} з цією адресою.`,
      `Якщо це ви, відкрийте посилання, щоб завершити реєстрацію: ${link}`,
      "Посилання діє 24 години. У вашому обліковому записі будуть замовлення, які ви вже робили з цієї адреси.",
      "Якщо це не ви, нічого не робіть: без цього посилання обліковий запис не відкриється.",
    ].join("\n\n"),
    html: `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Підтвердьте e-mail | ${name}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f7;">
    <tr><td align="center" style="padding:30px 12px;">
      <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:28px 0;background-color:#0057b7;"><span style="color:#ffd700;font-size:26px;font-weight:600;">${name}</span></td></tr>
        <tr><td style="padding:36px 30px 8px 30px;">
          <h1 style="color:#1a1a1a;font-size:22px;font-weight:600;margin:0 0 14px 0;">Підтвердьте свій e-mail</h1>
          <p style="color:#4b5563;font-size:16px;margin:0 0 14px 0;">Хтось реєструється в магазині ${name} з цією адресою. Якщо це ви, натисніть кнопку, щоб завершити реєстрацію.</p>
          <p style="color:#4b5563;font-size:16px;margin:0;">У вашому обліковому записі будуть замовлення, які ви вже робили з цієї адреси.</p>
        </td></tr>
        <tr><td align="center" style="padding:26px 30px;">
          <a href="${link}" target="_blank" style="display:inline-block;padding:15px 34px;border-radius:50px;background-color:#0057b7;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Підтвердити e-mail</a>
        </td></tr>
        <tr><td style="padding:0 30px 34px 30px;">
          <p style="color:#6b7280;font-size:14px;margin:0 0 10px 0;">Посилання діє 24 години. Якщо кнопка не працює, скопіюйте адресу в браузер:<br><span style="word-break:break-all;color:#0057b7;">${link}</span></p>
          <p style="color:#6b7280;font-size:14px;margin:0;">Якщо це не ви, нічого не робіть: без цього посилання обліковий запис не відкриється.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
