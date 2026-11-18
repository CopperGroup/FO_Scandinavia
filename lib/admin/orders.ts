import mongoose from "mongoose";
import { escapeRegExp } from "@/lib/catalog/text";
import Order from "@/lib/models/order.model";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { pageWindow } from "./list";

/**
 * Admin order data. Server-only: imported by server components; the admin
 * layout has already checked the role. Client components reach orders only
 * through the guarded actions in lib/actions/order.actions.ts.
 */

export const ORDER_TABS = [
  { key: "all", label: "Усі", filter: {} },
  { key: "new", label: "Нові", filter: { deliveryStatus: "Proceeding" } },
  { key: "shipping", label: "У дорозі", filter: { deliveryStatus: "Indelivery" } },
  { key: "done", label: "Виконані", filter: { deliveryStatus: "Fulfilled" } },
  { key: "canceled", label: "Скасовані", filter: { deliveryStatus: "Canceled" } },
] as const;

export type OrderTabKey = (typeof ORDER_TABS)[number]["key"];
export const ORDER_TAB_KEYS = ORDER_TABS.map((tab) => tab.key) as OrderTabKey[];

export const ORDERS_PAGE_SIZE = 25;

const TAB_STATUS: Record<OrderTabKey, string | null> = {
  all: null,
  new: "Proceeding",
  shipping: "Indelivery",
  done: "Fulfilled",
  canceled: "Canceled",
};

export type OrderRow = {
  id: string;
  date: string | null;
  customer: string;
  phone: string;
  city: string;
  value: number;
  paymentStatus: string;
  paymentType: string;
  deliveryStatus: string;
  units: number;
  images: string[];
};

export type OrderList = {
  rows: OrderRow[];
  total: number;
  page: number;
  pageCount: number;
  counts: Record<OrderTabKey, number>;
};

export { thumbnailUrl } from "./thumb";

function searchFilterFor(query: string) {
  const search = query.trim();
  if (!search) return {};
  const pattern = new RegExp(escapeRegExp(search), "i");
  return { $or: [{ id: pattern }, { name: pattern }, { surname: pattern }, { phoneNumber: pattern }, { email: pattern }] };
}

function findPage(filter: object, skip: number, size: number) {
  return Order.find(filter)
    .sort({ data: -1 })
    .skip(skip)
    .limit(size)
    .select("id data name surname phoneNumber city value paymentStatus paymentType deliveryStatus products")
    // Only the first picture of each product: the whole gallery is not needed for a 36px thumbnail.
    .populate({ path: "products.product", model: Product, select: { images: { $slice: 1 } } })
    .lean<any[]>();
}

/** One page of orders for the admin index, newest first, with a count per tab. */
export async function listOrders({ tab, query, page, pageSize = ORDERS_PAGE_SIZE }: { tab: OrderTabKey; query: string; page: number; pageSize?: number }): Promise<OrderList> {
  await connectToDB();

  const searchFilter = searchFilterFor(query);
  const status = TAB_STATUS[tab];
  const filter = status ? { ...searchFilter, deliveryStatus: status } : searchFilter;

  // The counts and the requested page in parallel; the page is re-read only if it was past the end.
  const requested = Math.max(1, Math.floor(page) || 1);
  let [grouped, orders] = await Promise.all([
    Order.aggregate<{ _id: string; count: number }>([{ $match: searchFilter }, { $group: { _id: "$deliveryStatus", count: { $sum: 1 } } }]),
    findPage(filter, (requested - 1) * pageSize, pageSize),
  ]);

  const byStatus = new Map(grouped.map((entry) => [entry._id, entry.count]));
  const counts: Record<OrderTabKey, number> = {
    all: grouped.reduce((sum, entry) => sum + entry.count, 0),
    new: byStatus.get("Proceeding") ?? 0,
    shipping: byStatus.get("Indelivery") ?? 0,
    done: byStatus.get("Fulfilled") ?? 0,
    canceled: byStatus.get("Canceled") ?? 0,
  };

  const total = counts[tab];
  const window = pageWindow(total, requested, pageSize);
  if (window.page !== requested) orders = await findPage(filter, window.skip, pageSize);

  const rows: OrderRow[] = orders.map((order) => {
    const lines: any[] = order.products ?? [];
    return {
      id: String(order.id),
      date: order.data ? new Date(order.data).toISOString() : null,
      customer: [order.name, order.surname].filter(Boolean).join(" "),
      phone: order.phoneNumber ?? "",
      city: order.city ?? "",
      value: order.value ?? 0,
      paymentStatus: order.paymentStatus ?? "",
      paymentType: order.paymentType ?? "",
      deliveryStatus: order.deliveryStatus ?? "",
      units: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
      images: lines.map((line) => line.product?.images?.[0]).filter(Boolean).slice(0, 3),
    };
  });

  return { rows, total, page: window.page, pageCount: window.pageCount, counts };
}

/* ------------------------------------------------------------------ */
/* One order                                                           */
/* ------------------------------------------------------------------ */

export type OrderLine = {
  productId: string;
  /** The shop's own product number (shown as "ID"). */
  code: string;
  name: string;
  image: string;
  articleNumber: string;
  size: string;
  price: number;
  amount: number;
  /** False when the product was deleted after the order. */
  exists: boolean;
};

export type OrderDetail = {
  _id: string;
  id: string;
  date: string | null;
  name: string;
  surname: string;
  phoneNumber: string;
  email: string;
  customerId: string | null;
  city: string;
  warehouse: string;
  adress: string;
  postalCode: string;
  deliveryMethod: string;
  paymentType: string;
  comment: string;
  paymentStatus: string;
  deliveryStatus: string;
  value: number;
  discount: number;
  promocode: string;
  isFreeDelivery: boolean;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceCheckedAt: string | null;
  hasNovaPoshtaAddress: boolean;
  lines: OrderLine[];
};

const SIZE_PARAM = /^(розмір|size)$/i;

function sizeOf(params: { name?: string; value?: string }[] | undefined): string {
  return String(params?.find((param) => SIZE_PARAM.test(String(param?.name ?? "").trim()))?.value ?? "");
}

/** Everything the order page shows, as plain data. Null when there is no such order. */
export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  if (!/^\d{1,12}$/.test(orderId)) return null;
  await connectToDB();

  const order = await Order.findOne({ id: orderId })
    .select("-emails -streetRef -buildingNumber -apartment")
    .populate({ path: "products.product", model: Product, select: { _id: 1, id: 1, name: 1, priceToShow: 1, articleNumber: 1, params: 1, images: { $slice: 1 } } })
    .lean<any>();
  if (!order) return null;

  let invoiceNumber = String(order.invoiceString ?? "");
  if (!invoiceNumber && order.invoice) {
    try {
      invoiceNumber = String(JSON.parse(order.invoice)?.IntDocNumber ?? "");
    } catch {
      invoiceNumber = "";
    }
  }

  return {
    _id: String(order._id),
    id: String(order.id),
    date: order.data ? new Date(order.data).toISOString() : null,
    name: order.name ?? "",
    surname: order.surname ?? "",
    phoneNumber: order.phoneNumber ?? "",
    email: order.email ?? "",
    customerId: order.user ? String(order.user) : null,
    city: order.city ?? "",
    warehouse: order.warehouse ?? "",
    adress: order.adress ?? "",
    postalCode: order.postalCode ?? "",
    deliveryMethod: order.deliveryMethod ?? "",
    paymentType: order.paymentType ?? "",
    comment: order.comment ?? "",
    paymentStatus: order.paymentStatus ?? "Pending",
    deliveryStatus: order.deliveryStatus ?? "Proceeding",
    value: order.value ?? 0,
    discount: Number(order.discount) > 0 ? Number(order.discount) : 0,
    promocode: order.promocode ?? "",
    isFreeDelivery: Boolean(order.isFreeDelivery),
    invoiceNumber,
    invoiceStatus: order.invoiceStatus ?? "",
    invoiceCheckedAt: order.invoiceCheckedAt ? new Date(order.invoiceCheckedAt).toISOString() : null,
    hasNovaPoshtaAddress: Boolean(order.cityRef && order.warehouseRef),
    lines: (order.products ?? []).map((line: any) => {
      const product = line.product;
      return {
        productId: product?._id ? String(product._id) : String(line.product ?? ""),
        code: String(product?.id ?? ""),
        name: product?.name ?? "Товар видалено",
        image: product?.images?.[0] ?? "",
        articleNumber: product?.articleNumber ?? "",
        size: sizeOf(product?.params),
        price: product?.priceToShow ?? 0,
        amount: line.amount ?? 0,
        exists: Boolean(product?._id),
      };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Product search for "add to order"                                   */
/* ------------------------------------------------------------------ */

export type ProductHit = { productId: string; code: string; name: string; image: string; articleNumber: string; size: string; price: number; quantity: number; available: boolean };

export const PRODUCT_SEARCH_LIMIT = 20;

/**
 * Up to 20 products matching a name, article or product number. Exact
 * article and number matches come first. (The old modal downloaded the whole
 * catalogue when it opened.)
 */
export async function searchProductsForOrder(query: string): Promise<ProductHit[]> {
  const search = query.trim().slice(0, 80);
  if (search.length < 2) return [];
  await connectToDB();

  const pattern = new RegExp(escapeRegExp(search), "i");
  const or: object[] = [{ name: pattern }, { articleNumber: pattern }, { id: search }];
  if (mongoose.isValidObjectId(search)) or.push({ _id: search });

  const products = await Product.find({ $or: or })
    .select({ _id: 1, id: 1, name: 1, priceToShow: 1, articleNumber: 1, params: 1, quantity: 1, isAvailable: 1, images: { $slice: 1 } })
    .limit(PRODUCT_SEARCH_LIMIT * 3)
    .lean<any[]>();

  const lower = search.toLowerCase();
  const rank = (product: any) =>
    String(product.articleNumber ?? "").toLowerCase() === lower || String(product.id ?? "") === search ? 0 : String(product.name ?? "").toLowerCase().startsWith(lower) ? 1 : 2;

  return products
    .sort((a, b) => rank(a) - rank(b) || Number(Boolean(b.isAvailable)) - Number(Boolean(a.isAvailable)))
    .slice(0, PRODUCT_SEARCH_LIMIT)
    .map((product) => ({
      productId: String(product._id),
      code: String(product.id ?? ""),
      name: product.name ?? "",
      image: product.images?.[0] ?? "",
      articleNumber: product.articleNumber ?? "",
      size: sizeOf(product.params),
      price: product.priceToShow ?? 0,
      quantity: Number(product.quantity ?? 0),
      available: Boolean(product.isAvailable) && Number(product.quantity ?? 0) > 0,
    }));
}
