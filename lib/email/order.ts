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

export async function sendOrderEmail(orderId: string) {
  const order = await Order.findById(orderId).populate('products.product');

  if (!order) throw new Error('Order not found.');

  const orderDate = new Date(order.data).toLocaleDateString('uk-UA');
  
  const subtotal = order.products.reduce((acc: number, p: any) => acc + p.product.priceToShow * p.amount, 0);
  const discountAmount = order.discount ? (subtotal * order.discount) / 100 : 0;

  const emailHtml = `
        <!DOCTYPE html>
        <html lang="uk">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Підтвердження замовлення | ${Store.name}</title>
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
            .product-image {
                width: 80px !important;
                height: 80px !important;
            }
            .hide-mobile {
                display: none !important;
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
                
                <!-- Order Confirmation -->
                <tr>
                    <td align="center" style="padding: 40px 30px 20px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                        <td>
                            <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">Дякуємо за ваше замовлення!</h2>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0; text-align: center;">Ваше замовлення було успішно оформлено і зараз обробляється.</p>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Order Details -->
                <tr>
                    <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f7; border-radius: 8px;">
                        <tr>
                        <td style="padding: 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td>
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">Номер замовлення:</p>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 15px 0;">${order.id}</p>
                                
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">Дата замовлення:</p>
                                <p style="color: #4b5563; font-size: 16px; margin: 0 0 15px 0;">${orderDate}</p>
                                
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">Статус замовлення:</p>
                                <p style="color: #4b5563; font-size: 16px; margin: 0;">В обробці</p>
                                </td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Order Summary -->
                <tr>
                    <td style="padding: 0 30px 20px 30px;" class="mobile-padding">
                    <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Деталі замовлення</h3>
                    </td>
                </tr>
                
                <!-- Products -->
                <tr>
                    <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #e5e7eb;">
                        <tr>
                        <td style="padding: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Товар</td>
                        <td align="center" style="padding: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;" class="hide-mobile">Кількість</td>
                        <td align="right" style="padding: 0 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Ціна</td>
                        </tr>
                        
                        <!-- Product Row Template - Repeat for each product -->
                        ${order.products.map((product: { product: { images: any[]; name: any; priceToShow: number; }; amount: number; }) => `
                        <tr>
                        <td style="padding: 15px 0; border-top: 1px solid #e5e7eb;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td width="80" style="vertical-align: top;">
                                <div style="width: 80px; height: 80px; background-color: #f5f5f7; border-radius: 6px; overflow: hidden;" class="product-image">
                                    <img src="${product.product.images[0]}" alt="${product.product.name}" width="80" height="80" style="object-fit: contain; width: 100%; height: 100%;">
                                </div>
                                </td>
                                <td style="padding-left: 15px; vertical-align: top;">
                                <p style="color: #1a1a1a; font-size: 16px; font-weight: 500; margin: 0 0 5px 0;">${product.product.name}</p>
                                <p style="color: #6b7280; font-size: 14px; margin: 0 0 5px 0;">Кількість: ${product.amount}</p>
                                </td>
                            </tr>
                            </table>
                        </td>
                        <td align="center" style="padding: 15px 0; border-top: 1px solid #e5e7eb; color: #4b5563; font-size: 16px;" class="hide-mobile">${product.amount}</td>
                        <td align="right" style="padding: 15px 0; border-top: 1px solid #e5e7eb; color: #1a1a1a; font-size: 16px; font-weight: 500;">₴${(product.product.priceToShow * product.amount).toFixed(2)}</td>
                        </tr>
                        `).join('')}
                        
                    </table>
                    </td>
                </tr>
                
                <!-- Order Totals -->
                <tr>
                    <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                        <td align="right">
                            <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 16px; text-align: right;">Проміжна сума:</td>
                                <td style="padding: 5px 0 5px 20px; color: #4b5563; font-size: 16px; text-align: right;">₴${subtotal.toFixed(2)}</td>
                            </tr>
                            
                            ${order.discount ? `
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 16px; text-align: right;">Знижка (${order.discount}%):</td>
                                <td style="padding: 5px 0 5px 20px; color: #10b981; font-size: 16px; text-align: right;">-₴${discountAmount.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td style="padding: 15px 0 5px 0; color: #1a1a1a; font-size: 18px; font-weight: 600; text-align: right; border-top: 2px solid #e5e7eb;">Загальна сума:</td>
                                <td style="padding: 15px 0 5px 20px; color: #1a1a1a; font-size: 18px; font-weight: 600; text-align: right; border-top: 2px solid #e5e7eb;">₴${order.value.toFixed(2)}</td>
                            </tr>
                            </table>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Shipping Information -->
                <tr>
                    <td style="padding: 0 30px 30px 30px;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                        <td width="48%" valign="top">
                            <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Інформація про доставку</h3>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">${order.name} ${order.surname}</p>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">${order.adress}</p>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">${order.city}, ${order.postalCode}</p>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">${order.phoneNumber}</p>
                            <p style="color: #4b5563; font-size: 16px; margin: 0;">Спосіб доставки: ${order.deliveryMethod}</p>
                        </td>
                        <td width="4%">&nbsp;</td>
                        <td width="48%" valign="top">
                            <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Інформація про оплату</h3>
                            <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">Спосіб оплати: ${order.paymentType}</p>
                            <p style="color: #4b5563; font-size: 16px; margin: 0;">Статус оплати: ${order.paymentStatus === 'Pending' ? 'Очікує оплати' : order.paymentStatus === 'Success' ? 'Оплачено' : 'Відхилено'}</p>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Next Steps -->
                <tr>
                    <td style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #e5e7eb;" class="mobile-padding">
                    <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Що далі?</h3>
                    <p style="color: #4b5563; font-size: 16px; margin: 0 0 15px 0;">Ми обробляємо ваше замовлення і повідомимо вас, коли воно буде відправлено. Ви можете перевірити статус вашого замовлення в будь-який час, відвідавши розділ "Мої замовлення" у вашому обліковому записі.</p>
                    <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                        <td align="center" style="border-radius: 50px; background-color: #1a1a1a;">
                            <a href="${Store.domain}/myOrders/${order.id}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Переглянути замовлення</a>
                        </td>
                        </tr>
                    </table>
                    </td>
                </tr>
                
                <!-- Customer Support -->
                <tr>
                    <td style="padding: 30px;" class="mobile-padding">
                    <h3 style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Потрібна допомога?</h3>
                    <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">Якщо у вас виникли питання щодо вашого замовлення, будь ласка, зв'яжіться з нашою службою підтримки:</p>
                    <p style="color: #4b5563; font-size: 16px; margin: 0 0 5px 0;">Телефон: <a href="tel:${Store.phoneNumber}" style="color: #1a1a1a; text-decoration: none;">${Store.phoneNumber}</a></p>
                    <p style="color: #4b5563; font-size: 16px; margin: 0;">Email: <a href="mailto:${Store.email}" style="color: #1a1a1a; text-decoration: none;">${Store.email}</a></p>
                    </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                    <td style="padding: 30px; background-color: #f5f5f7; border-top: 1px solid #e5e7eb;" class="mobile-padding">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                        <td style="padding-bottom: 20px;">
                            <p style="color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 0 0 5px 0; text-align: center;">${Store.name}</p>
                            <p style="color: #4b5563; font-size: 14px; margin: 0; text-align: center;">Якісні технології для повсякденного життя</p>
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
                        Цей лист надіслано на адресу ${order.email}, оскільки ви зробили замовлення на сайті ${Store.name}.
                    </p>
                    </td>
                </tr>
                </table>
            </td>
            </tr>
        </table>
        </body>
        </html>
  `;

  const mailOptions = {
    from: `"${Store.name}" <${Store.email}>`, // Sender name and email
    to: order.email,
    subject: `Підтвердження замовлення | ${Store.name}`,
    html: emailHtml,
  };

  await transporter.sendMail(mailOptions);

  order.emails.confirmation = true

  await order.save()
}
