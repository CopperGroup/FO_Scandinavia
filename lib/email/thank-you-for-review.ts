"use server"

import nodemailer from 'nodemailer';
import Order from '../models/order.model';
import { Store } from '@/constants/store';
import { getTop3ProductsBySales } from '../actions/product.actions';
import { socials, year_and_rights } from '@/constants/emails';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_LOGIN,
    pass: process.env.BREVO_PASSWORD,
  },
});

export async function sendThankYouForReviewEmail(toEmail: string, promoCode: string, productName: string, name: string, topProductsStringified: string) {

  const topProducts = JSON.parse(topProductsStringified)

  const emailHtml = `
  <!DOCTYPE html>
    <html lang="uk">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Дякуємо що допомагаєте нам ставати краще!</title>
    <!--[if mso]>
    <style type="text/css">
        table, td, div, h1, p {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f7; color: #333333; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
        <tr>
        <td align="center" style="padding: 20px 0;">
            <!-- Email Container -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            
            <!-- Header -->
                <tr>
                    <td align="center" style="padding: 30px 0; background-color: #1a1a1a;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0;">${Store.name}</h1>
                    </td>
                </tr>
            
            <!-- Main Content -->
            <tr>
                <td style="padding: 40px 30px 30px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <!-- Greeting -->
                    <tr>
                    <td style="padding-bottom: 20px;">
                        <h1 style="margin: 0; font-size: 24px; line-height: 32px; font-weight: 600; color: #1a1a1a;">Дякуємо за ваш відгук, ${name}!</h1>
                    </td>
                    </tr>
                    
                    <!-- Thank You Message -->
                    <tr>
                    <td style="padding-bottom: 30px;">
                        <p style="margin: 0; font-size: 16px; line-height: 24px; color: #4a4a4a;">
                        Ми вдячні за ваш відгук про <strong>${productName}</strong>. Ваша думка допомагає іншим покупцям зробити правильний вибір та дозволяє нам покращувати наші товари та сервіс.
                        </p>
                    </td>
                    </tr>
                    
                    <!-- Promo Code Section -->
                    <tr>
                    <td style="padding-bottom: 30px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #1a1a1a; border-radius: 8px; overflow: hidden;">
                        <tr>
                            <td style="padding: 25px 20px; text-align: center;">
                            <p style="margin: 0 0 15px; font-size: 16px; line-height: 24px; color: #ffffff; font-weight: 500;">
                                Ваш промокод на знижку 5%
                            </p>
                            <div style="background-color: #2a2a2a; border-radius: 6px; padding: 12px 15px; display: inline-block; margin-bottom: 15px;">
                                <p style="margin: 0; font-size: 20px; line-height: 24px; color: #e5e5e5; font-family: monospace; font-weight: 600; letter-spacing: 1px;">
                                ${promoCode}
                                </p>
                            </div>
                            <p style="margin: 0; font-size: 14px; line-height: 20px; color: #a3a3a3;">
                                Діє до ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "")}. Застосовується при наступній покупці.
                            </p>
                            </td>
                        </tr>
                        </table>
                    </td>
                    </tr>
                    
                    <!-- Suggested Products Heading -->
                    <tr>
                    <td style="padding-bottom: 20px;">
                        <h2 style="margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; color: #1a1a1a;">Вам також може сподобатися</h2>
                    </td>
                    </tr>
                    
                    <!-- Suggested Products -->
                    <tr>
                    <td style="padding-bottom: 30px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                        <tr>
                            <!-- Product 1 -->
                            <td width="33.33%" style="padding: 0 5px; vertical-align: top;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                <td style="padding-bottom: 10px; text-align: center; background-color: #f5f5f7; border-radius: 6px;">
                                    <a href="${Store.domain}/catalog/${topProducts[0]._id}" style="text-decoration: none; color: inherit;">
                                    <img src="${topProducts[0].images[0]}" alt="${topProducts[0].name.split(" ").slice(0, 3).join(" ")}" width="120" style="max-width: 120px; height: auto; border: 0; display: inline-block; padding: 15px 0;">
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td style="padding: 5px 0;">
                                    <a href="${Store.domain}/catalog/${topProducts[0]._id}" style="text-decoration: none; color: inherit;">
                                    <p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: 500; color: #1a1a1a; height: 40px; overflow: hidden;">${topProducts[0].name.split(" ").slice(0, 3).join(" ")}</p>
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td>
                                    <p style="margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #1a1a1a;">${topProducts[0].priceToShow}</p>
                                </td>
                                </tr>
                            </table>
                            </td>
                            
                            <!-- Product 2 -->
                            <td width="33.33%" style="padding: 0 5px; vertical-align: top;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                <td style="padding-bottom: 10px; text-align: center; background-color: #f5f5f7; border-radius: 6px;">
                                    <a href="${Store.domain}/catalog/${topProducts[1]._id}" style="text-decoration: none; color: inherit;">
                                    <img src="${topProducts[1].images[0]}" alt="${topProducts[1].name.split(" ").slice(0, 3).join(" ")}" width="120" style="max-width: 120px; height: auto; border: 0; display: inline-block; padding: 15px 0;">
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td style="padding: 5px 0;">
                                    <a href="${Store.domain}/catalog/${topProducts[1]._id}" style="text-decoration: none; color: inherit;">
                                    <p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: 500; color: #1a1a1a; height: 40px; overflow: hidden;">${topProducts[1].name.split(" ").slice(0, 3).join(" ")}</p>
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td>
                                    <p style="margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #1a1a1a;">${topProducts[1].priceToShow}</p>
                                </td>
                                </tr>
                            </table>
                            </td>
                            
                            <!-- Product 3 -->
                            <td width="33.33%" style="padding: 0 5px; vertical-align: top;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                <td style="padding-bottom: 10px; text-align: center; background-color: #f5f5f7; border-radius: 6px;">
                                    <a href="${Store.domain}/catalog/${topProducts[2]._id}" style="text-decoration: none; color: inherit;">
                                    <img src="${topProducts[2].images[0]}" alt="${topProducts[2].name.split(" ").slice(0, 3).join(" ")}" width="120" style="max-width: 120px; height: auto; border: 0; display: inline-block; padding: 15px 0;">
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td style="padding: 5px 0;">
                                    <a href="${Store.domain}/catalog/${topProducts[2]._id}" style="text-decoration: none; color: inherit;">
                                    <p style="margin: 0; font-size: 14px; line-height: 20px; font-weight: 500; color: #1a1a1a; height: 40px; overflow: hidden;">${topProducts[2].name.split(" ").slice(0, 3).join(" ")}</p>
                                    </a>
                                </td>
                                </tr>
                                <tr>
                                <td>
                                    <p style="margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; color: #1a1a1a;">${topProducts[2].priceToShow}</p>
                                </td>
                                </tr>
                            </table>
                            </td>
                        </tr>
                        </table>
                    </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                    <td style="padding-bottom: 30px; text-align: center;">
                        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 auto;">
                        <tr>
                            <td style="background-color: #1a1a1a; border-radius: 30px; padding: 0;">
                            <a href="${Store.domain}" style="display: inline-block; padding: 14px 30px; font-size: 16px; line-height: 24px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 30px;">Перейти до магазину</a>
                            </td>
                        </tr>
                        </table>
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            
            <!-- Footer -->
            <tr>
                <td style="padding: 30px; background-color: #f5f5f7; text-align: center;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <!-- Social Media -->
                    ${socials}
                    
                    <!-- Contact Info -->
                    <tr>
                    <td style="padding-bottom: 20px;">
                        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666666;">
                        Якщо у вас виникли питання, зв'яжіться з нами: <a href="mailto:${Store.email}" style="color: #1a1a1a; text-decoration: underline;">${Store.email}</a>
                        </p>
                    </td>
                    </tr>
                    
                    <!-- Unsubscribe -->
                    <tr>
                    <td>
                    ${year_and_rights}
                    </td>
                    </tr>
                </table>
                </td>
            </tr>
            </table>
        </td>
        </tr>
    </table>
    </body>
    </html>

  `

  const mailOptions = {
    from: `"${Store.name}" <${Store.additional_emails.thank_you}>`, // Sender name and email
    to: toEmail,
    subject: `Дякуємо вам за ваш відгук | ${Store.name}`,
    html: emailHtml,
  };

  await transporter.sendMail(mailOptions);
}
