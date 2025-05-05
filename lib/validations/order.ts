import * as z from "zod"

export const OrderValidation = z.object({
  name: z.string().min(2, { message: "Ім'я повинно містити щонайменше 2 символи" }),
  surname: z.string().min(2, { message: "Прізвище повинно містити щонайменше 2 символи" }),
  phoneNumber: z.string().min(10, { message: "Введіть коректний номер телефону" }),
  email: z.string().email({ message: "Введіть коректний email" }),
  paymentType: z.string().min(1, { message: "Виберіть спосіб оплати" }),
  deliveryMethod: z.string().min(1, { message: "Виберіть спосіб доставки" }),
  city: z.string().min(1, { message: "Виберіть місто" }),
  adress: z.string().optional(), // Made optional
  postalCode: z.string().optional(), // Made optional
  comment: z.string().optional(),
  buildingNumber: z.string().optional(),
  apartment: z.string().optional(),

  // Nova Poshta specific fields
  cityRef: z.string().min(1, { message: "Виберіть місто" }),
  warehouseRef: z.string().optional(),
  warehouseIndex: z.string().optional(),
  streetRef: z.string().optional(),
})
