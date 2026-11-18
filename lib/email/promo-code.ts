// Server-only module (not a server action): the recipient and the content come from our own code.
import nodemailer from "nodemailer"
import { Store } from "@/constants/store"
import { formatPromoDay } from "@/lib/promo/rules"
import { MailNotConfigured } from "./confirm-account"

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string)

export type PromoLetter = { code: string; percent: number; startDay: string | null; endDay: string | null; minOrder: number; uses: number }

/** The terms of the code in plain sentences, the same in the text and the HTML version. */
export function promoLetterTerms(promo: PromoLetter): string[] {
  const terms = [promo.uses > 1 ? `Знижка діє на ${promo.uses} замовлення.` : "Знижка діє на одне замовлення."]
  if (promo.minOrder > 0) terms.push(`Для замовлень від ${new Intl.NumberFormat("uk-UA").format(promo.minOrder)} ₴.`)
  if (promo.startDay) terms.push(`Код почне діяти ${formatPromoDay(promo.startDay)}.`)
  terms.push(promo.endDay ? `Останній день дії: ${formatPromoDay(promo.endDay)}.` : "Термін дії не обмежений.")
  return terms
}

/**
 * A personal promo code sent to its owner from the admin panel.
 * Throws when the letter cannot be sent, so the admin sees that it was not.
 */
export async function sendPromoCodeEmail(toEmail: string, promo: PromoLetter): Promise<void> {
  const base = (process.env.NEXTAUTH_URL || process.env.DOMAIN || Store.domain).replace(/\/+$/, "")
  const terms = promoLetterTerms(promo)

  if (!process.env.BREVO_LOGIN || !process.env.BREVO_PASSWORD) {
    if (process.env.NODE_ENV !== "production") {
      // No mail on a developer's machine: the letter goes to the server log instead.
      console.info(`[promo] letter for ${toEmail}: ${promo.code}, −${promo.percent}%. ${terms.join(" ")}`)
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
    subject: `Ваш промокод на знижку ${promo.percent}% | ${Store.name}`,
    text: [
      `Магазин ${Store.name} дарує вам знижку ${promo.percent}%.`,
      `Ваш промокод: ${promo.code}`,
      terms.join(" "),
      `Введіть код у полі «Промокод» під час оформлення замовлення. Він особистий: діє, коли ви увійшли у свій акаунт. Усі ваші коди: ${base}/promocodes`,
    ].join("\n\n"),
    html: `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Ваш промокод | ${name}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f7;">
    <tr><td align="center" style="padding:30px 12px;">
      <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td align="center" style="padding:28px 0;background-color:#0057b7;"><span style="color:#ffd700;font-size:26px;font-weight:600;">${name}</span></td></tr>
        <tr><td style="padding:36px 30px 8px 30px;">
          <h1 style="color:#1a1a1a;font-size:22px;font-weight:600;margin:0 0 14px 0;">Вам знижка ${promo.percent}%</h1>
          <p style="color:#4b5563;font-size:16px;margin:0 0 20px 0;">Введіть цей код у полі «Промокод» під час оформлення замовлення:</p>
        </td></tr>
        <tr><td align="center" style="padding:0 30px 24px 30px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:420px;background-color:#ffd700;border-radius:8px;border:2px solid #0057b7;">
            <tr><td align="center" style="padding:18px;"><span style="color:#1a1a1a;font-size:22px;font-weight:700;letter-spacing:2px;font-family:monospace;">${escape(promo.code)}</span></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 30px 12px 30px;">
          <p style="color:#4b5563;font-size:15px;margin:0 0 14px 0;">${terms.map(escape).join(" ")}</p>
          <p style="color:#4b5563;font-size:15px;margin:0 0 24px 0;">Код особистий: він діє, коли ви увійшли у свій акаунт. Усі ваші коди зібрані на сторінці <a href="${base}/promocodes" style="color:#0057b7;">«Мої промокоди»</a>.</p>
        </td></tr>
        <tr><td align="center" style="padding:0 30px 36px 30px;">
          <a href="${base}/catalog" style="display:inline-block;background-color:#0057b7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Перейти до каталогу</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
