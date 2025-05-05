"use server"

import nodemailer from 'nodemailer';
import Order from '../models/order.model';
import { Store } from '@/constants/store';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_LOGIN, // Your Brevo SMTP login
    pass: process.env.BREVO_PASSWORD, // Your Brevo SMTP password
  },
});

export async function sendAskForReviewEmail(orderId: string) {
  const order = await Order.findById(orderId).populate('products.product');

  if (!order) throw new Error('Order not found.');
  if(order.email.askForReview) return

  const emailHtml = `
    <!DOCTYPE html>
        <html lang="uk">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Як вам ваша покупка?</title>
        <style type="text/css">
            /* Base styles */
            body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            }
            body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            table {
            border-spacing: 0;
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
            }
            img {
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
            }
            /* Client-specific resets */
            .ReadMsgBody { width: 100%; }
            .ExternalClass { width: 100%; }
            .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
            line-height: 100%;
            }
            /* iOS blue links */
            a[x-apple-data-detectors] {
            color: inherit !important;
            text-decoration: none !important;
            font-size: inherit !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
            }
            /* Gmail blue links */
            u + #body a {
            color: inherit;
            text-decoration: none;
            font-size: inherit;
            font-family: inherit;
            font-weight: inherit;
            line-height: inherit;
            }
            /* Responsive styles */
            @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            .mobile-padding {
                padding-left: 20px !important;
                padding-right: 20px !important;
            }
            .mobile-stack {
                display: block !important;
                width: 100% !important;
            }
            .mobile-center {
                text-align: center !important;
            }
            .mobile-img {
                height: auto !important;
                max-width: 100% !important;
                width: 100% !important;
            }
            .mobile-height {
                height: 15px !important;
            }
            .mobile-font {
                font-size: 16px !important;
            }
            }
        </style>
        </head>
        <body id="body" style="margin: 0; padding: 0; background-color: #f7f7f7; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <!-- Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f7f7f7;">
            <tr>
            <td align="center" valign="top">
                <!-- Email Content -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                    <td align="center" style="padding: 30px 0; background-color: #1a1a1a;">
                    <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0;">${Store.name}</h1>
                    </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                    <td align="center" valign="top" style="padding: 40px 30px 20px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <!-- Greeting -->
                        <tr>
                        <td align="left" valign="top" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 22px; font-weight: 600; color: #333333; padding-bottom: 15px;">
                            Привіт, ${order.name}!
                        </td>
                        </tr>
                        
                        <!-- Message -->
                        <tr>
                        <td align="left" valign="top" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; line-height: 24px; color: #555555; padding-bottom: 20px;">
                            Сподіваємось, що ви вже отримали та встигли оцінити ваше нове придбання. Як вам ваші нові девайси? Ми дуже цінуємо вашу думку і будемо вдячні, якщо ви поділитесь своїми враженнями.
                        </td>
                        </tr>
                        
                        <!-- Discount Offer -->
                        <tr>
                        <td align="center" valign="top" style="padding-bottom: 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                            <tr>
                                <td align="center" valign="top" style="padding: 25px 20px;">
                        <!-- Discount Offer -->
                        <tr>
                        <td align="center" valign="top" style="padding-bottom: 30px;">
                            <!--[if mso]>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-radius: 10px; border: 1px solid #333333;">
                            <tr>
                                <td bgcolor="#1a1a1a" style="padding: 25px 20px;">
                            <![endif]-->
                            
                            <div style="background: #1a1a1a; border-radius: 10px; border: 1px solid #333333; padding: 25px 20px; max-width: 100%;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="color-scheme: light dark;">
                                <tr>
                                <td align="center" valign="top">
                                    <img src="https://cdn-icons-png.flaticon.com/512/2331/2331966.png" alt="Discount" width="50" style="display: block; border: 0; height: auto; margin-bottom: 15px;">
                                </td>
                                </tr>
                                <tr>
                                <td align="center" valign="top" style="font-family: Arial, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 20px; font-weight: 600; color: #ffffff; padding-bottom: 10px; mso-line-height-rule: exactly; line-height: 24px;">
                                    <span style="color: #ffffff; mso-color-alt: #ffffff;">Отримайте знижку 5% на наступне замовлення!</span>
                                </td>
                                </tr>
                                <tr>
                                <td align="center" valign="top" style="font-family: Arial, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 15px; font-weight: normal; color: #e2e2e2; padding-bottom: 15px; mso-line-height-rule: exactly; line-height: 22px;">
                                    <span style="color: #e2e2e2; mso-color-alt: #e2e2e2;">Залиште відгук про ваше придбання і отримайте персональний промокод на знижку 5%, який буде дійсний протягом 30 днів.</span>
                                </td>
                                </tr>
                            </table>
                            </div>
                            
                            <!--[if mso]>
                                </td>
                            </tr>
                            </table>
                            <![endif]-->
                        </td>
                        </tr>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                        
                        <!-- CTA Button -->
                        <tr>
                        <td align="center" valign="top" style="padding-bottom: 30px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" valign="top" style="background-color: #1a1a1a; border-radius: 50px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                                <a href="${Store.domain}/catalog/${order.products[0].product._id}/review?name=${order.products[0].product.name}&u=${order.email}" target="_blank" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 15px 35px; border-radius: 50px;">
                                    Залишити відгук
                                </a>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                        
                        <!-- Additional Message -->
                        <tr>
                        <td align="left" valign="top" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; line-height: 24px; color: #555555; padding-bottom: 30px;">
                            Ваш відгук допоможе іншим покупцям зробити правильний вибір, а нам — покращити наші товари та сервіс. Дякуємо, що обрали нас!
                        </td>
                        </tr>
                        
                        <!-- Signature -->
                        <tr>
                        <td align="left" valign="top" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 16px; line-height: 24px; color: #555555;">
                            З повагою,<br>
                            Команда ${Store.name}
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                    <td align="center" valign="top" bgcolor="#f2f2f2" style="padding: 30px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <!-- Social Media -->
                        <tr>
                        <td align="center" valign="top" style="padding-bottom: 20px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.instagram}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.facebook}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" alt="Facebook" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                                <td align="center" valign="top" style="padding: 0 10px;">
                                <a href="${Store.social_media.tik_tok}" target="_blank">
                                    <img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" alt="TikTok" width="24" style="display: block; border: 0;">
                                </a>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                        
                        <!-- Contact Info -->
                        <tr>
                        <td align="center" valign="top" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 20px; color: #777777; padding-bottom: 10px;">
                            ${Store.phoneNumber} | <a href="mailto:${Store.email}" style="color: #777777; text-decoration: underline;">${Store.email}</a>
                        </td>
                        </tr>
                        
                    </table>
                    </td>
                </tr>
                </table>
                <!-- Spacer -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td height="40">&nbsp;</td>
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
    to: order.email,
    subject: `Важлива інформація | ${Store.name}`,
    html: emailHtml,
  };

  await transporter.sendMail(mailOptions);

  order.emails.askForReview = true

  await order.save()
}
