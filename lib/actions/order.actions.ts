"use server";

import Order, { OrderType } from "../models/order.model";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import User from "../models/user.model";
import mongoose from 'mongoose';
import clearCache from "./cache";
import { generateLongPassword } from "../utils";
import { Store } from "@/constants/store";
import { DateTime } from 'luxon';
import { escapeRegExp } from "../catalog/text";
import { validatePromoCode } from "./promocode.actions";
import { invalidateCatalog } from "../catalog/server/service";
import { sendOrderEmail } from "../email/order";
import { sendAdminOrderNotification } from "../email/admin-order";
import { AccessDenied, getSessionIdentity, getSessionUser, isStaffRole, requireAdmin, requireUser } from "../auth/guards";
import { EMAIL_COLLATION, normalizeEmail } from "../auth/email";
import { getFreeDelivery } from "../content/server";
import { DeliveryNotReady, createWaybill, loadSettings as loadDeliverySettings, refreshStatuses, senderBranch, trackOne, type InvoiceSummary } from "../admin/novaposhta";

interface CreateOrderParams {
  products: {
    product: string,
    amount: number
  } [],
  userId: string;
  value: number;
  name: string;
  surname: string;
  phoneNumber: string;
  email: string;
  paymentType: string;
  deliveryMethod: string;
  city: string;
  adress: string;
  postalCode: string;
  comment: string | undefined;
  discount: number | undefined,
  promocode: string | undefined,
  promoResult: string | undefined;
  cityRef: string | undefined,
  warehouse: string,
  warehouseRef: string | undefined,
  warehouseIndex: string | undefined,
  streetRef: string | undefined,
  buildingNumber: string | undefined,
  apartment: string | undefined
}

function generateUniqueId() {
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString(); // Generates a random 4-digit number
    const timestampPart = Date.now().toString().slice(-4); // Gets the last 4 digits of the current timestamp
    return randomPart + timestampPart; // Concatenate both parts to form an 8-digit ID
}

/**
 * Creates the order under a free 8-digit number. The number is random, so it
 * is checked first (this works before the unique index exists) and a clash
 * reported by the unique index on `id` is retried as well.
 */
async function createWithFreshId(fields: Record<string, unknown>) {
    for (let attempt = 0; attempt < 6; attempt++) {
        const id = generateUniqueId();
        if (await Order.exists({ id })) continue;
        try {
            return await Order.create({ ...fields, id });
        } catch (error: any) {
            if (error?.code === 11000 && error?.keyPattern?.id) continue;
            throw error;
        }
    }
    throw new Error("Could not allocate an order number");
}

/** A problem the shopper can fix (sold-out item, empty cart); shown to them as is. */
class OrderProblem extends Error {}

const MAX_LINE_QUANTITY = 99;

/**
 * Creates an order.
 *
 * Nothing about money or stock is taken from the browser: prices are read
 * from the database, the promo code is re-validated here, and stock is
 * reserved with a conditional update so two shoppers cannot buy the last item.
 *
 * With `type === "json"` an expected problem is returned as
 * `{"error": "..."}` instead of thrown, because production builds hide the
 * message of a thrown error from the client.
 */
const ORDER_MAIL_WAIT_MS = 6000;

/** Loads the order the way the e-mail templates read it and sends both messages. */
async function notifyAboutOrder(orderId: string): Promise<void> {
  try {
      const order = await Order.findOne({ id: orderId })
          .populate({
              path: "products",
              populate: { path: "product", model: "Product", select: "_id id name images priceToShow params articleNumber" },
          })
          .lean();
      if (!order) return;
      const plain = JSON.parse(JSON.stringify(order));
      const results = await Promise.allSettled([sendOrderEmail(plain), sendAdminOrderNotification(plain)]);
      for (const result of results) {
          if (result.status === "rejected") console.error("[order] notification was not sent:", result.reason?.message ?? result.reason);
      }
  } catch (error: any) {
      console.error("[order] notifications failed:", error?.message ?? error);
  }
}

export async function createOrder(params: CreateOrderParams, type?: "json") {
  const reserved: { id: string; amount: number }[] = [];

  try {
      await connectToDB();

      // 1. Cart lines: merge duplicates, reject nonsense.
      const amounts = new Map<string, number>();
      for (const line of params.products ?? []) {
          const id = String(line?.product ?? "");
          const amount = Math.floor(Number(line?.amount));
          if (!mongoose.isValidObjectId(id) || !Number.isFinite(amount) || amount < 1) {
              throw new OrderProblem("У кошику є позиція, яку не вдалося розпізнати. Оновіть сторінку і спробуйте ще раз.");
          }
          amounts.set(id, Math.min(MAX_LINE_QUANTITY, (amounts.get(id) ?? 0) + amount));
      }
      if (amounts.size === 0) throw new OrderProblem("Кошик порожній.");

      const dbProducts = await Product.find({ _id: { $in: Array.from(amounts.keys()) } })
          .select("_id name priceToShow isAvailable quantity")
          .lean<{ _id: mongoose.Types.ObjectId; name: string; priceToShow: number; isAvailable: boolean; quantity: number }[]>();
      const byId = new Map(dbProducts.map((product) => [String(product._id), product]));

      let subtotal = 0;
      for (const [id, amount] of Array.from(amounts.entries())) {
          const product = byId.get(id);
          if (!product || !product.isAvailable || (product.quantity ?? 0) < 1) {
              throw new OrderProblem(`«${product?.name ?? "Один із товарів"}» щойно закінчився. Приберіть його з кошика, щоб продовжити.`);
          }
          if (product.quantity < amount) {
              throw new OrderProblem(`«${product.name}»: у наявності лише ${product.quantity} шт. Зменште кількість у кошику.`);
          }
          subtotal += product.priceToShow * amount;
      }

      // 2. Customer. Who is ordering is decided here, never by an id sent from the browser:
      //    a signed-in customer orders for their own account, a guest is matched by e-mail.
      let user = null;
      const signedIn = await getSessionUser();
      const orderEmail = normalizeEmail(params.email);

      if (signedIn) {
          user = await User.findById(signedIn.id);
          if (!user) throw new OrderProblem("Ваш обліковий запис не знайдено. Увійдіть ще раз і повторіть замовлення.");
      } else {
          if (!orderEmail) throw new OrderProblem("Вкажіть e-mail, щоб ми могли надіслати підтвердження замовлення.");
          user = await User.findOne({ email: orderEmail }).collation(EMAIL_COLLATION);

          if (!user) {
              user = await User.create({
                  name: params.name,
                  surname: params.surname,
                  phoneNumber: params.phoneNumber,
                  email: orderEmail,
                  totalOrders: 0,
                  orders: [],
                  password: generateLongPassword(),
                  selfCreated: true
              });
          }
      }
      params.userId = String(user._id);
      // A guest who types somebody's e-mail must not rewrite that person's profile.
      const mayUpdateProfile = Boolean(signedIn) || user.selfCreated === true;

      // 3. Promo code: only a code this customer owns counts, and its value is read here.
      let discount = 0;
      let storedPromo: string | undefined;
      let nextPromo: string | undefined;
      if (params.promocode) {
          const wanted = params.promocode.trim().toUpperCase();
          storedPromo = (user.discounts ?? []).find((code: string) => String(code).toUpperCase() === wanted);
          if (storedPromo) {
              const validated = await validatePromoCode({ promoCode: storedPromo, email: user.email });
              const body = validated === "UNVALID" ? "" : validated.split("-")[1] ?? "";
              const percent = Number.parseInt(body.slice(0, body.length - (4 + 3 + 8 + 1)));
              if (Number.isFinite(percent) && percent >= 1 && percent <= 99) {
                  discount = percent;
                  nextPromo = validated;
              }
          }
          if (discount === 0) throw new OrderProblem("Промокод більше не діє. Приберіть його і спробуйте ще раз.");
      }

      const value = Math.round(subtotal * (1 - discount / 100));
      const freeFrom = await getFreeDelivery();

      // 4. Reserve stock: each update succeeds only while enough is left.
      for (const [id, amount] of Array.from(amounts.entries())) {
          const result = await Product.updateOne({ _id: id, isAvailable: true, quantity: { $gte: amount } }, { $inc: { quantity: -amount } });
          if (result.modifiedCount !== 1) {
              throw new OrderProblem(`«${byId.get(id)?.name}» щойно розкупили. Оновіть кошик, щоб продовжити.`);
          }
          reserved.push({ id, amount });
      }

      // 5. The order itself.
      if (mayUpdateProfile) {
          await user.updateOne({
              name: params.name,
              surname: params.surname,
              phoneNumber: params.phoneNumber,
          });
      }

      const createdOrder = await createWithFreshId({
          products: Array.from(amounts.entries()).map(([product, amount]) => ({ product, amount })),
          user: params.userId,
          value,
          name: params.name,
          surname: params.surname,
          phoneNumber: params.phoneNumber,
          email: params.email,
          paymentType: params.paymentType,
          deliveryMethod: params.deliveryMethod,
          city: params.city,
          adress: params.adress,
          postalCode: params.postalCode,
          comment: params.comment || "",
          paymentStatus: "Pending",
          deliveryStatus: "Proceeding",
          discount: discount || undefined,
          promocode: discount ? params.promocode : undefined,
          buildingNumber: params.buildingNumber,
          apartment: params.apartment,
          cityRef: params.cityRef,
          warehouse: params.warehouse,
          warehouseRef: params.warehouseRef,
          warehouseIndex: params.warehouseIndex,
          streetRef: params.streetRef,
          isFreeDelivery: freeFrom > 0 && value >= freeFrom
      });

      // From here the order stands; nothing below may undo the reservation.
      reserved.length = 0;

      user.orders.push({
          order: createdOrder._id,
          createdAt: DateTime.now().setZone('Europe/Kiev'),
      });
      user.totalOrders += 1;
      if (storedPromo && nextPromo) {
          user.discounts = user.discounts.map((code: string) => (code === storedPromo ? nextPromo : code));
      }
      await user.save();

      const orderedIds = Array.from(amounts.keys());
      await Product.updateMany({ _id: { $in: orderedIds } }, { $push: { orderedBy: createdOrder._id } });

      await clearCache("createOrder", undefined);
      // The catalog only changes when something sold out: a size that is gone must
      // leave the shop. An order that leaves stock behind does not need a rebuild.
      const soldOut = await Product.exists({ _id: { $in: orderedIds }, quantity: { $lte: 0 } });
      if (soldOut) await invalidateCatalog();

      // Confirmation to the customer and a notice to the shop. Sent from the server,
      // so they do not depend on the customer keeping the page open; a mail problem
      // never fails an order that already exists.
      await Promise.race([
          notifyAboutOrder(String(createdOrder.id)),
          new Promise((resolve) => setTimeout(resolve, ORDER_MAIL_WAIT_MS)),
      ]);

      return type === "json" ? JSON.stringify(createdOrder) : createdOrder;
  } catch (error: any) {
      // Give back whatever was reserved for an order that did not happen.
      for (const line of reserved) {
          await Product.updateOne({ _id: line.id }, { $inc: { quantity: line.amount } }).catch(() => undefined);
      }
      if (error instanceof OrderProblem && type === "json") {
          return JSON.stringify({ error: error.message });
      }
      throw new Error(`Error creating order: ${error.message}`);
  }
}

/* ------------------------------------------------------------------------ */
/* Everything below is a public endpoint too: each function checks access.  */
/* ------------------------------------------------------------------------ */

const PRODUCT_FIELDS = "_id id name images priceToShow params articleNumber";
const ORDER_USER_FIELDS = "_id email name surname username phoneNumber";

const PAYMENT_STATUSES = ["Pending", "Success", "Declined"] as const;
const DELIVERY_STATUSES = ["Proceeding", "Indelivery", "Fulfilled", "Canceled"] as const;

function maskPhoneForPublic(phone: unknown): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length < 4 ? "" : `••••••${digits.slice(-4)}`;
}

function maskEmailForPublic(email: unknown): string {
  const [name, domain] = String(email ?? "").split("@");
  return name && domain ? `${name.slice(0, 1)}•••@${domain}` : "";
}

/**
 * One order by its number.
 *
 * Staff and the customer get the whole order. Anyone else (the link in the
 * confirmation e-mail works without signing in) gets the status and the
 * items: the surname is cut to its initial, the phone and e-mail are masked,
 * and the address, comment, invoice and promo code are left out.
 */
export async function fetchOrder({ orderId }: { orderId: string }): Promise<OrderType>;
export async function fetchOrder({ orderId }: { orderId: string }, type: 'json'): Promise<string>;

export async function fetchOrder({ orderId }: { orderId: string }, type?: 'json') {
   try {
    await connectToDB();

    const order: any = typeof orderId === "string" && /^\d{1,12}$/.test(orderId)
      ? await Order.findOne({ id: orderId })
          .populate({ path: "products.product", model: Product, select: PRODUCT_FIELDS })
          .populate({ path: "user", model: User, select: ORDER_USER_FIELDS })
          .lean()
      : null;

    let result: any = order;
    if (order) {
      const identity = await getSessionIdentity();
      const ownerId = String(order.user?._id ?? order.user ?? "");
      const isOwner = Boolean(identity && ((identity.id && identity.id === ownerId) || (identity.email && identity.email === String(order.email ?? "").toLowerCase())));
      const full = isOwner || isStaffRole((await getSessionUser())?.role);

      if (!full) {
        result = {
          _id: order._id,
          id: order.id,
          products: order.products,
          value: order.value,
          name: order.name,
          surname: String(order.surname ?? "").slice(0, 1),
          phoneNumber: maskPhoneForPublic(order.phoneNumber),
          email: maskEmailForPublic(order.email),
          paymentType: order.paymentType,
          deliveryMethod: order.deliveryMethod,
          city: order.city,
          paymentStatus: order.paymentStatus,
          deliveryStatus: order.deliveryStatus,
          discount: order.discount,
          isFreeDelivery: order.isFreeDelivery,
          data: order.data,
        };
      }
    }

    return type === 'json' ? JSON.stringify(result) : result;
   } catch (error: any) {
     throw new Error(`Error fetching order: ${error.message}`)
   }
}

/** A customer's orders, newest first: for the customer and for staff. */
export async function fetchUsersOrders({ userId }: { userId: string }){
    try {
        const current = await requireUser();
        if (current.id !== String(userId) && !isStaffRole(current.role)) throw new AccessDenied();
        if (!mongoose.isValidObjectId(userId)) return [];

        await connectToDB();
        return await Order.find({ user: userId })
          .sort({ data: -1 })
          .limit(200)
          .select("id products value paymentStatus deliveryStatus data user")
          .populate({ path: "products.product", model: Product, select: "id name images priceToShow params" })
          .lean();
    } catch (error:any) {
        throw new Error(`Error fetching user's orders: ${error.message}`)
    }
}

/** Removes an order and its links from the customer and the products. Stock is not returned. */
async function removeOrder(filter: { _id: string } | { id: string }) {
  await requireAdmin();
  await connectToDB();

  const order = await Order.findOne(filter).select("_id user").lean<{ _id: mongoose.Types.ObjectId; user?: mongoose.Types.ObjectId }>();
  if (!order) return false;

  await Order.deleteOne({ _id: order._id });
  await Promise.all([
    order.user ? User.updateOne({ _id: order.user, "orders.order": order._id }, { $pull: { orders: { order: order._id } }, $inc: { totalOrders: -1 } }) : null,
    Product.updateMany({ orderedBy: order._id }, { $pull: { orderedBy: order._id } }),
  ]);
  await clearCache("updateOrder", undefined);
  return true;
}

export async function delOrder(id: string) {
    try {
        if (!mongoose.isValidObjectId(id)) throw new Error("Invalid order id");
        return await removeOrder({ _id: id });
    } catch (error: any) {
        throw new Error(`Error deleting order: ${error.message}`)
    }
}

/** Deletes an order by its number. `path` is unused, kept for older callers. */
export async function deleteOrder(id: string, path?: string) {
    try {
        return await removeOrder({ id: String(id) });
    } catch (error: any) {
        throw new Error(`Error deleting order: ${error.message}`)
    }
}

export async function changePaymentStatus(id: string, status: string, path?: string) {
    try {
        await requireAdmin();
        if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) throw new Error(`Unknown payment status "${status}"`);
        await connectToDB();

        const result = await Order.updateOne({ id: String(id) }, { $set: { paymentStatus: status } });
        if (result.matchedCount === 0) throw new Error("Order not found");

        await clearCache("updateOrder", undefined);
        return status;
    } catch (error: any) {
        throw new Error(`Error changing order's payment status: ${error.message}`)
    }
}

export async function changedeliveryStatus(id: string, status: string, path?: string) {
    try {
        await requireAdmin();
        if (!(DELIVERY_STATUSES as readonly string[]).includes(status)) throw new Error(`Unknown delivery status "${status}"`);
        await connectToDB();

        const result = await Order.updateOne({ id: String(id) }, { $set: { deliveryStatus: status } });
        if (result.matchedCount === 0) throw new Error("Order not found");

        await clearCache("updateOrder", undefined);
        return status;
    } catch (error: any) {
        throw new Error(`Error changing order's delivery status: ${error.message}`)
    }
}

/* ------------------------------------------------------------------------ */
/* Nova Poshta (the API calls live in lib/admin/novaposhta.ts)               */
/* ------------------------------------------------------------------------ */

type InvoiceResult = { ok: true; invoice: InvoiceSummary } | { ok: false; error: string; notReady?: boolean };

function invoiceError(error: any): { ok: false; error: string; notReady?: boolean } {
  // Returned, not thrown: production builds hide thrown messages, and the text is what the manager needs.
  console.error("[waybill]", error?.message ?? error);
  return { ok: false, error: String(error?.message ?? "Не вдалося створити накладну."), notReady: error instanceof DeliveryNotReady };
}

/** Creates the waybill for one order from a sender branch (the default one unless `branchId` is given). */
export async function createOrderInvoice({ orderId, branchId }: { orderId: string; branchId?: string | null }): Promise<InvoiceResult> {
  await requireAdmin();
  if (!mongoose.isValidObjectId(orderId)) return { ok: false, error: "Замовлення не знайдено." };
  try {
    const settings = await loadDeliverySettings();
    const invoice = await createWaybill(orderId, senderBranch(settings, branchId), settings);
    await clearCache("updateOrder", undefined);
    return { ok: true, invoice };
  } catch (error: any) {
    return invoiceError(error);
  }
}

/**
 * Waybills for several orders, one after another (each takes four API calls).
 * At most 20 per run; every order gets its own result.
 */
export async function createInvoicesForOrders({ orderIds, branchId }: { orderIds: string[]; branchId?: string | null }) {
  await requireAdmin();
  const ids = Array.from(new Set((orderIds ?? []).map(String).filter((id) => mongoose.isValidObjectId(id)))).slice(0, 20);
  const results: { orderId: string; ok: boolean; number?: string; error?: string }[] = [];
  let settings;
  let branch;
  try {
    settings = await loadDeliverySettings();
    branch = senderBranch(settings, branchId);
  } catch (error: any) {
    return { ok: false as const, error: invoiceError(error).error, results };
  }
  for (const orderId of ids) {
    try {
      const invoice = await createWaybill(orderId, branch, settings);
      results.push({ orderId, ok: true, number: invoice.IntDocNumber });
    } catch (error: any) {
      results.push({ orderId, ok: false, error: invoiceError(error).error });
      // Without the API nothing else will work either.
      if (error instanceof DeliveryNotReady) break;
    }
  }
  if (results.some((result) => result.ok)) await clearCache("updateOrder", undefined);
  return { ok: true as const, results };
}

/** Reads the current tracking status of up to 100 waybills and stores it on the orders. */
export async function refreshWaybillStatuses(numbers: string[]): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const updated = await refreshStatuses((numbers ?? []).map((number) => String(number).replace(/\s/g, "")));
    return { ok: true, updated };
  } catch (error: any) {
    return invoiceError(error);
  }
}

/** Tracking data of one waybill. Staff only (it carries the recipient's name and phone). */
export async function getInvoiceDetails(documentNumber: string): Promise<{ ok: true; tracking: Record<string, unknown> } | { ok: false; error: string }> {
  await requireAdmin();
  const number = String(documentNumber ?? "").replace(/\s/g, "")
  if (!/^\d{6,20}$/.test(number)) return { ok: false, error: "Невірний номер накладної." }
  try {
    const tracking = await trackOne(number);
    await Order.updateOne({ invoiceString: number }, { $set: { invoiceStatus: String(tracking.Status ?? ""), invoiceStatusCode: String(tracking.StatusCode ?? ""), invoiceCheckedAt: new Date() } });
    return { ok: true, tracking };
  } catch (error: any) {
    return invoiceError(error);
  }
}

/** Saves a waybill number typed in by hand (an empty value removes it). */
export async function addInvoiceString({ orderId, invoiceString}: { orderId: string, invoiceString: string}) {
  try {
    await requireAdmin();
    if (!mongoose.isValidObjectId(orderId)) throw new Error("Invalid order id");
    const value = String(invoiceString ?? "").replace(/\s/g, "").slice(0, 40);
    if (value && !/^\d{6,20}$/.test(value)) throw new Error("Номер накладної складається з цифр.");

    await connectToDB();
    await Order.updateOne(
      { _id: orderId },
      value
        ? { $set: { invoiceString: value, invoiceCreatedAt: new Date() }, $unset: { invoiceStatus: "", invoiceStatusCode: "", invoiceCheckedAt: "" } }
        : { $unset: { invoiceString: "", invoice: "", invoiceCreatedAt: "", invoiceStatus: "", invoiceStatusCode: "", invoiceCheckedAt: "" } },
    );
    await clearCache("updateOrder", undefined);
    return value;
  } catch (error: any) {
    throw new Error(`Error adding invoice stringto order: ${error.message}`)
  }
}

interface ProductDataForBackend {
  product: string; // This is the _id string of the product
  amount: number;
}

interface UserDataForBackend {
  name: string;
  surname: string;
  phoneNumber: string;
  email: string;
  city: string;
  adress: string;
  comment: string;
  warehouse: string;
}

/**
 * Saves an edited order: contact and delivery data and the line items.
 * The total is recalculated from current prices and keeps the order's promo
 * discount (it used to be dropped on every edit). Stock is not touched.
 */
export async function updateOrder({
  orderId,
  userData,
  productsData,
}: {
  orderId: string;
  userData: UserDataForBackend;
  productsData: ProductDataForBackend[];
}): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    if (!mongoose.isValidObjectId(orderId)) throw new Error("Замовлення не знайдено.");
    await connectToDB();

    const amounts = new Map<string, number>();
    for (const line of productsData ?? []) {
      const id = String(line?.product ?? "");
      const amount = Math.floor(Number(line?.amount));
      if (!mongoose.isValidObjectId(id) || !Number.isFinite(amount) || amount < 1 || amount > MAX_LINE_QUANTITY) {
        throw new Error("Кількість кожного товару має бути від 1 до 99.");
      }
      amounts.set(id, Math.min(MAX_LINE_QUANTITY, (amounts.get(id) ?? 0) + amount));
    }
    if (amounts.size === 0) throw new Error("У замовленні має лишитися хоча б один товар.");

    const [order, dbProducts] = await Promise.all([
      Order.findById(orderId).select("_id discount").lean<{ _id: unknown; discount?: number }>(),
      Product.find({ _id: { $in: Array.from(amounts.keys()) } }).select("_id priceToShow").lean<{ _id: unknown; priceToShow: number }[]>(),
    ]);
    if (!order) throw new Error("Замовлення не знайдено.");

    const prices = new Map(dbProducts.map((product) => [String(product._id), product.priceToShow ?? 0]));
    let subtotal = 0;
    for (const [id, amount] of Array.from(amounts.entries())) {
      const price = prices.get(id);
      if (price === undefined) throw new Error("Один із товарів більше не існує. Приберіть його із замовлення.");
      subtotal += price * amount;
    }
    const discount = Number(order.discount) > 0 && Number(order.discount) < 100 ? Number(order.discount) : 0;
    const value = Math.round(subtotal * (1 - discount / 100));

    const text = (input: unknown, max = 300) => String(input ?? "").trim().slice(0, max);
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          name: text(userData?.name, 100),
          surname: text(userData?.surname, 100),
          phoneNumber: text(userData?.phoneNumber, 40),
          email: text(userData?.email, 254).toLowerCase(),
          city: text(userData?.city, 200),
          adress: text(userData?.adress),
          comment: text(userData?.comment, 2000),
          warehouse: text(userData?.warehouse),
          products: Array.from(amounts.entries()).map(([product, amount]) => ({ product: new mongoose.Types.ObjectId(product), amount })),
          value,
        },
      },
      { runValidators: true },
    );

    await clearCache("updateOrder", undefined);
    return { ok: true, value };
  } catch (error: any) {
    console.error("Error in updateOrder:", error?.message ?? error);
    return { ok: false, error: String(error?.message ?? "Не вдалося зберегти замовлення.") };
  }
}
