import mongoose from "mongoose";
import { escapeRegExp } from "@/lib/catalog/text";
import Order, { REAL_ORDER } from "@/lib/models/order.model";
import Product from "@/lib/models/product.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { pageWindow } from "./list";
import { listCustomerPromos } from "../promo/server";
import type { CustomerPromo } from "../promo/rules";

/**
 * Admin client data. Server-only, used by server components behind the admin
 * layout check. Never selects passwords or reset/verification tokens.
 */

export const CLIENT_TABS = [
  { key: "all", label: "Усі", roles: null },
  { key: "customers", label: "Клієнти", roles: ["User"] },
  { key: "staff", label: "Адміністратори", roles: ["Admin", "Owner"] },
] as const;

export type ClientTabKey = (typeof CLIENT_TABS)[number]["key"];
export const CLIENT_TAB_KEYS = CLIENT_TABS.map((tab) => tab.key) as ClientTabKey[];

export const CLIENT_SORTS = ["new", "old", "orders", "name"] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

const SORT_SPEC: Record<ClientSort, Record<string, 1 | -1>> = {
  new: { _id: -1 },
  old: { _id: 1 },
  orders: { totalOrders: -1, _id: -1 },
  name: { name: 1, _id: -1 },
};

export const CLIENTS_PAGE_SIZE = 25;

/** Orders that brought money: paid and not canceled. */
const PAID = { $and: [{ $eq: ["$paymentStatus", "Success"] }, { $ne: ["$deliveryStatus", "Canceled"] }] };

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  guest: boolean;
  joined: string;
  orders: number;
  paid: number;
  lastOrder: string | null;
};

export type ClientList = { rows: ClientRow[]; total: number; page: number; pageCount: number; counts: Record<ClientTabKey, number> };

function displayName(user: { name?: string; surname?: string; username?: string }): string {
  return [user.name, user.surname].filter(Boolean).join(" ").trim() || String(user.username ?? "").trim();
}

/** Order count, paid total and last order date for a set of customers: one aggregation over their orders. */
async function orderStats(userIds: mongoose.Types.ObjectId[]) {
  if (userIds.length === 0) return new Map<string, { orders: number; paid: number; last: Date | null }>();
  const rows = await Order.aggregate<{ _id: mongoose.Types.ObjectId; orders: number; paid: number; last: Date | null }>([
    { $match: { user: { $in: userIds }, ...REAL_ORDER } },
    { $group: { _id: "$user", orders: { $sum: 1 }, paid: { $sum: { $cond: [PAID, { $ifNull: ["$value", 0] }, 0] } }, last: { $max: "$data" } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

export async function listClients({ tab, query, sort, page, pageSize = CLIENTS_PAGE_SIZE }: { tab: ClientTabKey; query: string; sort: ClientSort; page: number; pageSize?: number }): Promise<ClientList> {
  await connectToDB();

  const search = query.trim();
  const pattern = search ? new RegExp(escapeRegExp(search), "i") : null;
  const searchFilter = pattern
    ? { $or: [{ name: pattern }, { surname: pattern }, { username: pattern }, { email: pattern }, { phoneNumber: pattern }] }
    : {};
  const roles = CLIENT_TABS.find((entry) => entry.key === tab)?.roles ?? null;
  // Records without a role are customers (the schema default).
  const roleFilter = roles ? (roles.includes("User" as never) ? { role: { $nin: ["Admin", "Owner"] } } : { role: { $in: [...roles] } }) : {};
  const filter = { ...searchFilter, ...roleFilter };

  const requested = Math.max(1, Math.floor(page) || 1);
  const findPage = (skip: number) =>
    User.find(filter)
      .sort(SORT_SPEC[sort])
      .skip(skip)
      .limit(pageSize)
      .select("_id name surname username email phoneNumber role selfCreated")
      .lean<any[]>();

  let [grouped, users] = await Promise.all([
    User.aggregate<{ _id: string | null; count: number }>([{ $match: searchFilter }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
    findPage((requested - 1) * pageSize),
  ]);

  const staff = grouped.filter((row) => row._id === "Admin" || row._id === "Owner").reduce((sum, row) => sum + row.count, 0);
  const all = grouped.reduce((sum, row) => sum + row.count, 0);
  const counts: Record<ClientTabKey, number> = { all, customers: all - staff, staff };

  const window = pageWindow(counts[tab], requested, pageSize);
  if (window.page !== requested) users = await findPage(window.skip);

  const stats = await orderStats(users.map((user) => user._id));

  const rows: ClientRow[] = users.map((user) => {
    const stat = stats.get(String(user._id));
    return {
      id: String(user._id),
      name: displayName(user),
      email: user.email ?? "",
      phone: user.phoneNumber ?? "",
      role: user.role ?? "User",
      guest: Boolean(user.selfCreated),
      joined: (user._id as mongoose.Types.ObjectId).getTimestamp().toISOString(),
      orders: stat?.orders ?? 0,
      paid: stat?.paid ?? 0,
      lastOrder: stat?.last ? new Date(stat.last).toISOString() : null,
    };
  });

  return { rows, total: counts[tab], page: window.page, pageCount: window.pageCount, counts };
}

/* ------------------------------------------------------------------ */
/* One client                                                          */
/* ------------------------------------------------------------------ */

export type ClientOrder = {
  id: string;
  date: string | null;
  value: number;
  paymentStatus: string;
  deliveryStatus: string;
  units: number;
  images: string[];
};

export type ClientDetail = {
  id: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
  guest: boolean;
  joined: string;
  address: string;
  /** The customer's personal promo codes, the ones that work first. */
  promoCodes: CustomerPromo[];
  likes: number;
  stats: { orders: number; paidOrders: number; paid: number; canceled: number; average: number; firstOrder: string | null; lastOrder: string | null };
  orders: ClientOrder[];
};

export const CLIENT_ORDERS_PAGE_SIZE = 10;

export async function getClientDetail(userId: string, ordersPage = 1): Promise<ClientDetail | null> {
  if (!mongoose.isValidObjectId(userId)) return null;
  await connectToDB();
  const objectId = new mongoose.Types.ObjectId(userId);

  // Profile, recent orders and totals at once (they used to run one after another).
  const [user, orders, totals, promoCodes] = await Promise.all([
    User.findById(objectId)
      .select("_id name surname username email phoneNumber role selfCreated discounts region city postalCode street likes")
      .lean<any>(),
    Order.find({ user: objectId, ...REAL_ORDER })
      .sort({ data: -1 })
      .skip((Math.max(1, Math.floor(ordersPage) || 1) - 1) * CLIENT_ORDERS_PAGE_SIZE)
      .limit(CLIENT_ORDERS_PAGE_SIZE)
      .select("id data value paymentStatus deliveryStatus products")
      .populate({ path: "products.product", model: Product, select: { images: { $slice: 1 } } })
      .lean<any[]>(),
    Order.aggregate<{ orders: number; paidOrders: number; paid: number; canceled: number; first: Date | null; last: Date | null }>([
      { $match: { user: objectId, ...REAL_ORDER } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          paidOrders: { $sum: { $cond: [PAID, 1, 0] } },
          paid: { $sum: { $cond: [PAID, { $ifNull: ["$value", 0] }, 0] } },
          canceled: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "Canceled"] }, 1, 0] } },
          first: { $min: "$data" },
          last: { $max: "$data" },
        },
      },
    ]),
    listCustomerPromos(userId),
  ]);
  if (!user) return null;

  const total = totals[0];
  return {
    id: String(user._id),
    name: user.name ?? "",
    surname: user.surname ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    phoneNumber: user.phoneNumber ?? "",
    role: user.role ?? "User",
    guest: Boolean(user.selfCreated),
    joined: objectId.getTimestamp().toISOString(),
    address: [user.region, user.city, user.street, user.postalCode].filter(Boolean).join(", "),
    promoCodes,
    likes: Array.isArray(user.likes) ? user.likes.length : 0,
    stats: {
      orders: total?.orders ?? 0,
      paidOrders: total?.paidOrders ?? 0,
      paid: total?.paid ?? 0,
      canceled: total?.canceled ?? 0,
      average: total?.paidOrders ? total.paid / total.paidOrders : 0,
      firstOrder: total?.first ? new Date(total.first).toISOString() : null,
      lastOrder: total?.last ? new Date(total.last).toISOString() : null,
    },
    orders: orders.map((order) => {
      const lines: any[] = order.products ?? [];
      return {
        id: String(order.id),
        date: order.data ? new Date(order.data).toISOString() : null,
        value: order.value ?? 0,
        paymentStatus: order.paymentStatus ?? "",
        deliveryStatus: order.deliveryStatus ?? "",
        units: lines.reduce((sum, line) => sum + (line.amount ?? 0), 0),
        images: lines.map((line) => line.product?.images?.[0]).filter(Boolean).slice(0, 3),
      };
    }),
  };
}
