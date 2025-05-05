"use server"

import nodemailer from "nodemailer";

export async function sendContact({ name, email, message, subject }: { name: string, email: string, message: string, subject: string }) {

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or use your SMTP
      auth: {
        user: process.env.EMAIL_USER,  // Your email
        pass: process.env.EMAIL_PASS,  // Your password or app password
      },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER, // <- your authenticated email
        to: process.env.CONTACT_RECEIVER_EMAIL,
        replyTo: email, // <- user email for easy reply
        subject: "Нове повідомлення з контактної форми",
        html: `
        <!DOCTYPE html>
        <html lang="uk">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Нове повідомлення з контактної форми</title>
        <style>
            /* Base styles for email clients */
            body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f7;
            }
            
            .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            }
            
            .email-header {
            background-color: #f8f8f8;
            padding: 20px 30px;
            border-bottom: 1px solid #e1e1e1;
            }
            
            .email-logo {
            max-height: 50px;
            }
            
            .email-content {
            padding: 30px;
            }
            
            .email-title {
            font-size: 22px;
            font-weight: 600;
            color: #1a1a1a;
            margin-top: 0;
            margin-bottom: 20px;
            }
            
            .contact-info {
            background-color: #f9f9f9;
            border-left: 4px solid #333333;
            padding: 15px 20px;
            margin-bottom: 25px;
            }
            
            .contact-row {
            margin-bottom: 10px;
            }
            
            .contact-label {
            font-weight: 600;
            color: #555555;
            display: inline-block;
            width: 80px;
            vertical-align: top;
            }
            
            .contact-value {
            display: inline-block;
            color: #333333;
            max-width: 400px;
            }
            
            .message-container {
            background-color: #ffffff;
            border: 1px solid #e1e1e1;
            border-radius: 4px;
            padding: 20px;
            margin-top: 20px;
            }
            
            .message-label {
            font-weight: 600;
            color: #555555;
            margin-bottom: 10px;
            }
            
            .message-content {
            white-space: pre-wrap;
            color: #333333;
            line-height: 1.5;
            }
            
            .email-footer {
            background-color: #f8f8f8;
            padding: 15px 30px;
            font-size: 12px;
            color: #777777;
            text-align: center;
            border-top: 1px solid #e1e1e1;
            }
            
            .timestamp {
            color: #999999;
            font-size: 12px;
            margin-top: 5px;
            }
            
            /* Responsive styles */
            @media screen and (max-width: 600px) {
            .email-content {
                padding: 20px;
            }
            
            .contact-label {
                display: block;
                width: 100%;
                margin-bottom: 5px;
            }
            
            .contact-value {
                display: block;
                width: 100%;
            }
            }
        </style>
        </head>
        <body>
        <div class="email-container">
            
            <div class="email-content">
            <h1 class="email-title">Нове повідомлення з контактної форми</h1>
            
            <p>Отримано нове повідомлення від відвідувача вашого сайту:</p>
            
            <div class="contact-info">
                <div class="contact-row">
                <span class="contact-label">Ім'я:</span>
                <span class="contact-value">${name}</span>
                </div>
                
                <div class="contact-row">
                <span class="contact-label">Email:</span>
                <span class="contact-value">${email}</span>
                </div>
                
                <div class="contact-row">
                <span class="contact-label">Тема:</span>
                <span class="contact-value">${subject || 'Не вказано'}</span>
                </div>
                
                <div class="timestamp">
                Надіслано: ${new Date().toLocaleString('uk-UA', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
                </div>
            </div>
            
            <div class="message-container">
                <div class="message-label">Повідомлення:</div>
                <div class="message-content">${message}</div>
            </div>
            </div>
            
            <div class="email-footer">
            <p>Це автоматичне повідомлення з вашого сайту. Будь ласка, не відповідайте на цей email.</p>
            <p>&copy; ${new Date().getFullYear()} Ваш Магазин. Всі права захищені.</p>
            </div>
        </div>
        </body>
        </html>
        `,
    });

  } catch (error: any) {
    console.error(error);
  }
}
