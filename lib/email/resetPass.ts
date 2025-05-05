"use server";

import crypto from "crypto";
import nodemailer from "nodemailer";
import { connectToDB } from "../mongoose";
import User from "../models/user.model";
import { Store } from "@/constants/store";

export async function sendResetPasswordEmail({ email }: { email: string }) {
    try {
      await connectToDB();
  
      const user = await User.findOne({ email });
  
      if (!user) {
        throw new Error("No user with that email.");
      }
  
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiryDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
  
      user.forgotPasswordToken = resetToken;
      user.forgotPasswordTokenExpiry = expiryDate;
      await user.save();
  
    //   const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/resetPass/${resetToken}`;
  
      const resetLink = `${Store.domain}/new-pass?t=${resetToken}`;

      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",  // Brevo SMTP host
        port: 587,                     // Brevo SMTP port
        secure: false,                 // use TLS
        auth: {
            user: process.env.BREVO_LOGIN,
            pass: process.env.BREVO_PASSWORD
        }
      });

      await transporter.sendMail({
        from: `"${Store.name} Store" <${Store.email}>`,
        to: email,
        subject: "Reset your password",
        html: `
            <!DOCTYPE html>
            <html lang="uk">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Відновлення пароля | ${Store.name}</title>
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
                    
                    <!-- Content -->
                    <tr>
                        <td align="center" style="padding: 40px 30px 20px 30px;" class="mobile-padding">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                            <td>
                                <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">Відновлення пароля</h2>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0; text-align: center;">Вітаємо, ${user.name || "користувач"}!</p>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0; text-align: center;">Ми отримали запит на відновлення вашого пароля. Натисніть на кнопку нижче, щоб створити новий пароль:</p>
                            </td>
                            </tr>
                            <tr>
                            <td align="center" style="padding: 0 0 30px 0;">
                                <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="border-radius: 50px; background-color: #1a1a1a;">
                                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Відновити пароль</a>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                            <tr>
                            <td>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0; text-align: center;">Якщо ви не робили цього запиту, проігноруйте цей лист.</p>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 20px 0; text-align: center;">Посилання дійсне протягом 1(однієї) години.</p>
                                <p style="color: #4b5563; font-size: 14px; margin: 30px 0 0 0; text-align: center;">З питань безпеки не пересилайте цей лист іншим особам.</p>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    
                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f9f9f9; border-top: 1px solid #e5e7eb;" class="mobile-padding">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                            <td>
                                <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
                                Якщо ви не запитували відновлення пароля, будь ласка, негайно зв'яжіться з нашою службою підтримки.
                                </p>
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
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0; text-align: center;">${Store.name}</p>
                                <p style="color: #4b5563; font-size: 14px; margin: 0; text-align: center;">Інноваційні технології для повсякденного життя</p>
                            </td>
                            </tr>
                            <tr>
                            <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                    <p style="color: #4b5563; font-size: 14px; margin: 0 0 10px 0;">
                                        <a href="${Store.domain}/contacts" target="_blank" style="color: #4b5563; text-decoration: underline;">Контакти</a> | 
                                        <a href="${Store.domain}/support" target="_blank" style="color: #4b5563; text-decoration: underline;">Підтримка</a> | 
                                        <a href="${Store.domain}/faq" target="_blank" style="color: #4b5563; text-decoration: underline;">FAQ</a>
                                    </p>
                                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                                        © ${new Date().getFullYear()} ${Store.name}. Усі права захищені.
                                    </p>
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
                            Цей лист надіслано на адресу ${user.email}, оскільки ви зареєструвалися на сайті ${Store.name}.
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
  
      return { success: true };
    } catch (error: any) {
      console.error(error);
      return { success: false, message: error.message };
    }
  }