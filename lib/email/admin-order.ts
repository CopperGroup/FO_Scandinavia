"use server"

import nodemailer from "nodemailer"
import Order, { OrderType } from "../models/order.model"
import { Store } from "@/constants/store"

const transporter = nodemailer.createTransport({
  service: "gmail", // Using Gmail as in the contact email
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your password or app password
  },
})

export async function sendAdminOrderNotification(order: any) {
  try {

    if (!order) throw new Error("Order not found.")

    const orderDate = new Date(order.data).toLocaleDateString("uk-UA")
    const orderTime = new Date(order.data).toLocaleTimeString("uk-UA")

    const subtotal = order.products.reduce((acc: number, p: any) => acc + p.product.priceToShow * p.amount, 0)
    const discountAmount = order.discount ? (subtotal * order.discount) / 100 : 0

    const emailHtml = `
        <!DOCTYPE html>
        <html lang="uk">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Нове замовлення | ${Store.name}</title>
        <style>
            /* Base styles for email clients */
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #1a365d;
                background-color: #f0f4fa;
            }
            
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
            }
            
            .email-header {
                background-color: #2b6cb0;
                padding: 20px 30px;
                text-align: center;
                border-bottom: 1px solid #4299e1;
            }
            
            .email-header h1 {
                color: #ffffff;
                font-size: 24px;
                font-weight: 600;
                margin: 0;
            }
            
            .email-content {
                padding: 30px;
            }
            
            .email-title {
                font-size: 22px;
                font-weight: 600;
                color: #2c5282;
                margin-top: 0;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .order-info {
                background-color: #ebf8ff;
                border-left: 4px solid #3182ce;
                padding: 15px 20px;
                margin-bottom: 25px;
            }
            
            .order-row {
                margin-bottom: 10px;
            }
            
            .order-label {
                font-weight: 600;
                color: #2b6cb0;
                display: inline-block;
                width: 150px;
                vertical-align: top;
            }
            
            .order-value {
                display: inline-block;
                color: #2a4365;
                max-width: 400px;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                margin-bottom: 20px;
            }
            
            .products-table th {
                background-color: #e6f0fb;
                color: #2c5282;
                text-align: left;
                padding: 10px;
                font-weight: 600;
                border-bottom: 2px solid #cbd5e0;
            }
            
            .products-table td {
                padding: 10px;
                border-bottom: 1px solid #e2e8f0;
                color: #2d3748;
            }
            
            .products-table tr:last-child td {
                border-bottom: none;
            }
            
            .product-image {
                width: 60px;
                height: 60px;
                background-color: #f7fafc;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .product-image img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            
            .totals-table {
                width: 100%;
                max-width: 300px;
                margin-left: auto;
                margin-top: 20px;
            }
            
            .totals-table td {
                padding: 5px 0;
            }
            
            .totals-table .total-label {
                text-align: left;
                color: #4a5568;
            }
            
            .totals-table .total-value {
                text-align: right;
                color: #2a4365;
                font-weight: 500;
            }
            
            .totals-table .grand-total {
                font-weight: 600;
                color: #2c5282;
                font-size: 18px;
                border-top: 2px solid #e2e8f0;
                padding-top: 10px;
            }
            
            .customer-info {
                display: flex;
                justify-content: space-between;
                margin-top: 30px;
                margin-bottom: 30px;
            }
            
            .shipping-info, .payment-info {
                width: 48%;
            }
            
            .info-title {
                font-size: 18px;
                font-weight: 600;
                color: #2c5282;
                margin-top: 0;
                margin-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
            }
            
            .action-button {
                display: block;
                background-color: #2b6cb0;
                color: #ffffff !important;
                text-decoration: none;
                text-align: center;
                padding: 12px 20px;
                border-radius: 4px;
                font-weight: 600;
                margin: 30px auto 0;
                width: 200px;
            }
            
            .email-footer {
                background-color: #2b6cb0;
                padding: 15px 30px;
                font-size: 12px;
                color: #e2e8f0;
                text-align: center;
                border-top: 1px solid #4299e1;
            }
            
            .timestamp {
                color: #4a5568;
                font-size: 12px;
                margin-top: 5px;
            }
            
            /* Responsive styles */
            @media screen and (max-width: 600px) {
                .email-content {
                    padding: 20px;
                }
                
                .order-label {
                    display: block;
                    width: 100%;
                    margin-bottom: 5px;
                }
                
                .order-value {
                    display: block;
                    width: 100%;
                }
                
                .customer-info {
                    flex-direction: column;
                }
                
                .shipping-info, .payment-info {
                    width: 100%;
                    margin-bottom: 20px;
                }
            }
        </style>
        </head>
        <body>
        <div class="email-container">
            <div class="email-header">
                <h1>Нове замовлення на сайті ${Store.name}</h1>
            </div>
            
            <div class="email-content">
                <h2 class="email-title">Отримано нове замовлення!</h2>
                
                <p>Клієнт оформив нове замовлення на вашому сайті. Нижче наведено деталі замовлення:</p>
                
                <div class="order-info">
                    <div class="order-row">
                        <span class="order-label">Номер замовлення:</span>
                        <span class="order-value">${order.id}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Дата замовлення:</span>
                        <span class="order-value">${orderDate} ${orderTime}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Клієнт:</span>
                        <span class="order-value">${order.name} ${order.surname}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Email:</span>
                        <span class="order-value">${order.email}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Телефон:</span>
                        <span class="order-value">${order.phoneNumber}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Загальна сума:</span>
                        <span class="order-value">₴${order.value.toFixed(2)}</span>
                    </div>
                    
                    <div class="order-row">
                        <span class="order-label">Статус оплати:</span>
                        <span class="order-value">${
                          order.paymentStatus === "Pending"
                            ? "Очікує оплати"
                            : order.paymentStatus === "Success"
                              ? "Оплачено"
                              : "Відхилено"
                        }</span>
                    </div>
                    
                    <div class="timestamp">
                        Отримано: ${new Date().toLocaleString("uk-UA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </div>
                </div>
                
                <h3 class="info-title">Замовлені товари</h3>
                
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;"></th>
                            <th>Товар</th>
                            <th style="width: 80px; text-align: center;">Кількість</th>
                            <th style="width: 100px; text-align: right;">Ціна</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.products
                          .map(
                            (product: {
                              product: { images: any[]; name: any; priceToShow: number }
                              amount: number
                            }) => `
                        <tr>
                            <td>
                                <div class="product-image">
                                    <img src="${product.product.images[0]}" alt="${product.product.name}">
                                </div>
                            </td>
                            <td>${product.product.name}</td>
                            <td style="text-align: center;">${product.amount}</td>
                            <td style="text-align: right;">₴${(product.product.priceToShow * product.amount).toFixed(
                              2,
                            )}</td>
                        </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
                
                <table class="totals-table">
                    <tr>
                        <td class="total-label">Проміжна сума:</td>
                        <td class="total-value">₴${subtotal.toFixed(2)}</td>
                    </tr>
                    ${
                      order.discount
                        ? `
                    <tr>
                        <td class="total-label">Знижка (${order.discount}%):</td>
                        <td class="total-value" style="color: #10b981;">-₴${discountAmount.toFixed(2)}</td>
                    </tr>
                    `
                        : ""
                    }
                    <tr>
                        <td class="total-label grand-total">Загальна сума:</td>
                        <td class="total-value grand-total">₴${order.value.toFixed(2)}</td>
                    </tr>
                </table>
                
                <div class="customer-info">
                    <div class="shipping-info">
                        <h3 class="info-title">Інформація про доставку</h3>
                        <p>${order.name} ${order.surname}</p>
                        <p>${order.adress}</p>
                        <p>${order.city}, ${order.postalCode}</p>
                        <p>Спосіб доставки: ${order.deliveryMethod}</p>
                    </div>
                    
                    <div class="payment-info">
                        <h3 class="info-title">Інформація про оплату</h3>
                        <p>Спосіб оплати: ${order.paymentType}</p>
                        <p>Статус оплати: ${
                          order.paymentStatus === "Pending"
                            ? "Очікує оплати"
                            : order.paymentStatus === "Success"
                              ? "Оплачено"
                              : "Відхилено"
                        }</p>
                    </div>
                </div>
                
                <a href="${Store.domain}/admin/orders/${
                  order.id
                }" class="action-button" target="_blank">Переглянути замовлення</a>
            </div>
            
            <div class="email-footer">
                <p>Це автоматичне повідомлення з вашого сайту. Не відповідайте на цей email.</p>
                <p>&copy; ${new Date().getFullYear()} ${Store.name}. Всі права захищені.</p>
            </div>
        </div>
        </body>
        </html>
    `

    await transporter.sendMail({
      from: process.env.EMAIL_USER, // <- your authenticated email
      to: process.env.CONTACT_RECEIVER_EMAIL,
      subject: `Нове замовлення #${order.id} | ${Store.name}`,
      html: emailHtml,
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error sending admin order notification:", error)
    return { success: false, error: error.message }
  }
}
1