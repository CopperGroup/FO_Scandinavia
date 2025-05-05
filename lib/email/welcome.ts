"use server"

import { Store } from '@/constants/store';
import nodemailer from 'nodemailer';
import { getTop3ProductsBySales } from '../actions/product.actions';
import { year_and_rights } from '@/constants/emails';

export async function sendWelcomeEmail(toEmail: string, promoCode: string) {
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_PASSWORD
      }
    });
  
    const topProducts = await getTop3ProductsBySales();

    try {
        
        await transporter.sendMail({
          from: '"Dev1ce Store" <coppergroupstudio@gmail.com>',
          to: toEmail,
          subject: 'Ласкаво просимо до Dev1ce Store! 🎮',
          html: `
            <!DOCTYPE html>
            <html lang="uk">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ваш промокод на знижку 10% | Tech Store</title>
            <style type="text/css">
                /* Reset styles */
                body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
                }
                body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.5;
                }
                table {
                border-spacing: 0;
                border-collapse: collapse;
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
                }
                table td {
                border-collapse: collapse;
                }
                img {
                -ms-interpolation-mode: bicubic;
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                display: block;
                }
                /* Client-specific styles */
                .ReadMsgBody { width: 100%; }
                .ExternalClass { width: 100%; }
                .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
                /* Responsive styles */
                @media screen and (max-width: 600px) {
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
                }
            </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f7;">
            <!-- Main Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f7;">
                <tr>
                <td align="center" style="padding: 30px 0;">
                    <!-- Email Container -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px 0; background-color: #1a1a1a;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0;">${Store.name}</h1>
                        </td>
                    </tr>
                    
                    <!-- Welcome Message -->
                    <tr>
                        <td align="center" style="padding: 40px 30px 20px 30px;" class="mobile-padding">
                        <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 15px 0;">Дякуємо за реєстрацію!</h2>
                        <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">Ми раді вітати вас у нашому магазині. Як обіцяли, ось ваш промокод на знижку 10% на перше замовлення:</p>
                        </td>
                    </tr>
                    
                    <!-- Discount Code -->
                    <tr>
                        <td align="center" style="padding: 0 30px 30px 30px;" class="mobile-padding">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 400px; background-color: #f5f5f7; border-radius: 8px;">
                            <tr>
                            <td align="center" style="padding: 20px;">
                                <p style="color: #1a1a1a; font-size: 14px; font-weight: 500; margin: 0 0 10px 0;">ВАШ ПРОМОКОД:</p>
                                <p style="color: #1a1a1a; font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 0; font-family: monospace;">${promoCode}</p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    
                    <!-- Instructions -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                        <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">Як використати промокод:</p>
                        <ol style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0; padding-left: 20px;">
                            <li style="margin-bottom: 10px;">Додайте товари до кошика</li>
                            <li style="margin-bottom: 10px;">На сторінці оформлення замовлення введіть промокод у відповідне поле</li>
                            <li style="margin-bottom: 10px;">Знижка буде автоматично застосована до вашого замовлення</li>
                        </ol>
                        <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0;">Промокод дійсний протягом 30 (${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "")}) днів і може бути використаний лише один раз.</p>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 0 30px 40px 30px;" class="mobile-padding">
                        <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                            <td align="center" style="border-radius: 50px; background-color: #1a1a1a;">
                                <a href="${Store.domain}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Перейти до покупок</a>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    
                    <!-- Featured Products -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                        <p style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">Популярні товари:</p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                            <!-- Product 1 -->
                            <td width="33.33%" valign="top" class="mobile-stack" style="padding-right: 10px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 10px;">
                                    <a href="${Store.domain}/catalog/${topProducts[0]._id}">
                                        <img src="${topProducts[0].images[0]}" alt="Смартфон" width="96" style="border-radius: 8px;">
                                    </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                    <p style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${topProducts[0].name.split(" ").slice(0, 3).join(" ")}</p>
                                    <p style="color: #4b5563; font-size: 14px; margin: 0;">від ${topProducts[0].priceToShow}₴</p>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            
                            <!-- Product 2 -->
                            <td width="33.33%" valign="top" class="mobile-stack" style="padding: 0 5px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 10px;">
                                    <a href="${Store.domain}/catalog/${topProducts[1]._id}">
                                        <img src="${topProducts[1].images[0]}" alt="Ноутбук" width="96" style="border-radius: 8px;">
                                    </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                    <p style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${topProducts[1].name.split(" ").slice(0, 3).join(" ")}</p>
                                    <p style="color: #4b5563; font-size: 14px; margin: 0;">від ${topProducts[1].priceToShow}₴</p>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            
                            <!-- Product 3 -->
                            <td width="33.33%" valign="top" class="mobile-stack" style="padding-left: 10px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 10px;">
                                    <a href="${Store.domain}/catalog/${topProducts[2]._id}">
                                        <img src="${topProducts[2].images[0]}" alt="Навушники" width="96" style="border-radius: 8px;">
                                    </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                    <p style="color: #1a1a1a; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${topProducts[2].name.split(" ").slice(0, 3).join(" ")}</p>
                                    <p style="color: #4b5563; font-size: 14px; margin: 0;">від ${topProducts[2].priceToShow}₴</p>
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
                        <td style="padding: 30px; background-color: #f5f5f7; border-top: 1px solid #e5e7eb;" class="mobile-padding">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                            <td style="padding-bottom: 20px;">
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">${Store.name}</p>
                                <p style="color: #4b5563; font-size: 14px; margin: 0;">Інноваційні технології для повсякденного життя</p>
                            </td>
                            </tr>
                            <tr>
                            <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                    <p style="color: #4b5563; font-size: 14px; margin: 0 0 10px 0;">
                                        <a href="${Store.domain}/contacts" target="_blank" style="color: #4b5563; text-decoration: underline;">Контакти</a> | 
                                        <a href="${Store.domain}/support" target="_blank" style="color: #4b5563; text-decoration: underline;">Підтримка</a> | 
                                        <a href="${Store.domain}/faq" target="_blank" style="color: #4b5563; text-decoration: underline;">FAQ</a>
                                    </p>
                                    ${year_and_rights}
                                    </td>
                                    <td align="right">
                                    <table border="0" cellpadding="0" cellspacing="0">
                                        <tr>
                                        <!-- Facebook Icon -->
                                        <td style="padding-left: 10px;">
                                            <a href="${Store.social_media.facebook}" target="_blank">
                                            <img src="https://cdn4.iconfinder.com/data/icons/social-media-icons-the-circle-set/48/facebook_circle-512.png" alt="Facebook" width="32" height="32" style="border-radius: 4px;">
                                            </a>
                                        </td>
                                        <!-- Instagram Icon -->
                                        <td style="padding-left: 10px;">
                                            <a href="${Store.social_media.instagram}" target="_blank">
                                            <img src="https://cdn4.iconfinder.com/data/icons/social-media-2146/512/25_social-512.png" alt="Instagram" width="32" height="32" style="border-radius: 4px;">
                                            </a>
                                        </td>
                                        <!-- TikTok Icon -->
                                        <td style="padding-left: 10px;">
                                            <a href="${Store.social_media.tik_tok}" target="_blank">
                                            <img src="https://cdn4.iconfinder.com/data/icons/social-media-flat-7/64/Social-media_Tiktok-512.png" alt="TikTok" width="32" height="32" style="border-radius: 4px;">
                                            </a>
                                        </td>
                                        </tr>
                                    </table>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                    
                    <!-- Email Preferences -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                    <tr>
                        <td align="center" style="padding: 20px 30px;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">
                            Цей лист надіслано на адресу ${toEmail}, оскільки ви зареєструвалися на сайті ${Store.name}.
                        </p>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>
            </table>
            </body>
            </html>
          `,
        });
    } catch(error: any) {
        throw new Error(error.message)
    }
  }
  
  