import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeEmail, looksLikeEmail } from "../../auth/email";
import { fillSeries, rankTopProducts } from "../../dashboard/series";
import { listHref, pageWindow, parseChoice, parsePage, parsePageSize, parseQuery } from "../list";
import { describePromoCode } from "../promo";
import { thumbnailUrl } from "../thumb";

describe("admin list URLs", () => {
  it("parses page numbers defensively", () => {
    assert.equal(parsePage(undefined), 1);
    assert.equal(parsePage("3"), 3);
    assert.equal(parsePage("-2"), 1);
    assert.equal(parsePage("abc"), 1);
    assert.equal(parsePage(["4", "5"]), 4);
  });

  it("keeps page sizes to the offered choices", () => {
    assert.equal(parsePageSize("50"), 50);
    assert.equal(parsePageSize("37"), 25);
    assert.equal(parsePageSize(undefined, 10), 10);
  });

  it("trims queries and limits choices", () => {
    assert.equal(parseQuery("  Олена  "), "Олена");
    assert.equal(parseQuery("x".repeat(200)).length, 80);
    assert.equal(parseChoice("paid", ["all", "paid"] as const, "all"), "paid");
    assert.equal(parseChoice("hack", ["all", "paid"] as const, "all"), "all");
  });

  it("builds short canonical links", () => {
    const current = { tab: "paid", q: "", size: "25", page: "3" };
    assert.equal(listHref("/admin/payments", current, { page: "1" }, { tab: "all", size: "25" }), "/admin/payments?tab=paid");
    assert.equal(listHref("/admin/payments", current, { tab: "all", q: "a b" }, { tab: "all", size: "25" }), "/admin/payments?q=a+b&page=3");
  });

  it("clamps the page window", () => {
    assert.deepEqual(pageWindow(0, 5, 25), { page: 1, pageCount: 1, skip: 0 });
    assert.deepEqual(pageWindow(51, 3, 25), { page: 3, pageCount: 3, skip: 50 });
    assert.deepEqual(pageWindow(51, 9, 25), { page: 3, pageCount: 3, skip: 50 });
  });
});

describe("e-mail helpers", () => {
  it("normalises for case-insensitive lookups", () => {
    assert.equal(normalizeEmail("  Olena.K+shop@Gmail.COM "), "olena.k+shop@gmail.com");
    assert.equal(normalizeEmail(undefined), "");
  });
  it("rejects obvious garbage", () => {
    assert.equal(looksLikeEmail("a@b.ua"), true);
    assert.equal(looksLikeEmail("a b@c.ua"), false);
    assert.equal(looksLikeEmail("^.*$"), false);
  });
});

describe("promo codes", () => {
  it("reads percent, validity and uses", () => {
    const info = describePromoCode("DV-104567KEP202612141", new Date("2026-11-16T10:00:00Z"));
    assert.equal(info.percent, 10);
    assert.equal(info.validUntil, "2026-12-14");
    assert.equal(info.usesLeft, 1);
    assert.equal(info.expired, false);
  });
  it("marks used up and past codes", () => {
    assert.equal(describePromoCode("DV-104567KEP202612140", new Date("2026-11-16T10:00:00Z")).expired, true);
    assert.equal(describePromoCode("DV-54567KEP202501011", new Date("2026-11-16T10:00:00Z")).expired, true);
  });
  it("survives garbage", () => {
    assert.equal(describePromoCode("hello").percent, null);
  });
});

describe("dashboard helpers", () => {
  it("fills every bucket of the window, in the shop's time zone", () => {
    const from = new Date("2026-11-09T21:30:00Z"); // 9 Nov 23:30 in Kyiv
    const to = new Date("2026-11-12T10:00:00Z");
    const series = fillSeries([{ _id: "2026-11-11", paidRevenue: 500, orders: 2 }], from, to, "day", "Europe/Kiev");
    assert.deepEqual(
      series.map((point) => point.start),
      ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"],
    );
    assert.equal(series[2].orders, 2);
    assert.equal(series[0].orders, 0);
  });

  it("buckets weeks from Monday and months from the 1st", () => {
    const weeks = fillSeries([], new Date("2026-11-04T12:00:00Z"), new Date("2026-11-20T12:00:00Z"), "week", "Europe/Kiev");
    assert.deepEqual(weeks.map((point) => point.start), ["2026-11-02", "2026-11-09", "2026-11-16"]);
    const months = fillSeries([], new Date("2026-01-15T12:00:00Z"), new Date("2026-03-02T12:00:00Z"), "month", "Europe/Kiev");
    assert.deepEqual(months.map((point) => point.start), ["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("ranks best sellers by product group and links the best size", () => {
    const groups = new Map([
      ["a1", { key: "A", title: "Куртка", members: [{ image: "a.jpg" }] }],
      ["a2", { key: "A", title: "Куртка", members: [{ image: "a.jpg" }] }],
      ["b1", { key: "B", title: "Шапка", members: [{ image: null }] }],
    ]);
    const top = rankTopProducts(
      [
        { productId: "a1", units: 1 },
        { productId: "a2", units: 3 },
        { productId: "b1", units: 2 },
        { productId: "gone", units: 9 },
      ],
      groups,
    );
    assert.deepEqual(
      top.map((row) => [row.key, row.units, row.variants, row.productId]),
      [
        ["A", 4, 2, "a2"],
        ["B", 2, 1, "b1"],
      ],
    );
  });
});

describe("thumbnails", () => {
  it("asks the optimiser for one width", () => {
    assert.equal(thumbnailUrl("https://x.ua/a b.png"), "/_next/image?url=https%3A%2F%2Fx.ua%2Fa%20b.png&w=96&q=75");
    assert.equal(thumbnailUrl(""), "");
  });
});
