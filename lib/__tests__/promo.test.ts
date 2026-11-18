import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PROMO_REWARDS,
  PROMO_CODE_SHAPE,
  addDays,
  checkPromo,
  cleanPromoInput,
  cleanPromoRewards,
  customerPromo,
  daysBetween,
  kyivDay,
  legacyPromo,
  normalizePromoCode,
  promoStatus,
  randomPromoCode,
  refusalText,
  sortCustomerPromos,
  usesLeft,
  type PromoRecord,
} from "../promo/rules";

const OWNER = "65f000000000000000000001";
const OTHER = "65f000000000000000000002";
const TODAY = "2026-12-10";

function code(overrides: Partial<PromoRecord> = {}): PromoRecord {
  return { id: "1", code: "ZYMA15", percent: 15, ownerId: null, startDay: null, endDay: null, maxUses: null, perCustomer: 1, minOrder: 0, active: true, note: "", source: "admin", usedCount: 0, ...overrides };
}
const ask = (record: PromoRecord | null, context: Partial<Parameters<typeof checkPromo>[1]> = {}) =>
  checkPromo(record, { userId: OWNER, subtotal: 1000, today: TODAY, usedByCustomer: 0, ...context });

describe("promo codes: may this customer use it now", () => {
  it("a shared code works for anyone, signed in or not", () => {
    assert.deepEqual(ask(code()), { ok: true, percent: 15 });
    assert.deepEqual(ask(code(), { userId: null }), { ok: true, percent: 15 });
  });

  it("an unknown code is refused", () => {
    assert.deepEqual(ask(null), { ok: false, refusal: "unknown" });
  });

  it("a personal code works only for its owner, and a stranger cannot tell it exists", () => {
    const personal = code({ ownerId: OWNER });
    assert.deepEqual(ask(personal), { ok: true, percent: 15 });
    assert.deepEqual(ask(personal, { userId: OTHER }), { ok: false, refusal: "unknown" });
    assert.deepEqual(ask(personal, { userId: null }), { ok: false, refusal: "sign-in" });
    // Even when it is switched off or expired, a stranger is told nothing more.
    assert.deepEqual(ask(code({ ownerId: OWNER, active: false }), { userId: OTHER }), { ok: false, refusal: "unknown" });
  });

  it("works on its first and last day and not outside them", () => {
    const dated = code({ startDay: "2026-12-10", endDay: "2026-12-12" });
    assert.equal(ask(dated, { today: "2026-12-09" }).ok, false);
    assert.deepEqual(ask(dated, { today: "2026-12-09" }), { ok: false, refusal: "not-started" });
    assert.equal(ask(dated, { today: "2026-12-10" }).ok, true);
    assert.equal(ask(dated, { today: "2026-12-12" }).ok, true);
    assert.deepEqual(ask(dated, { today: "2026-12-13" }), { ok: false, refusal: "ended" });
  });

  it("a switched-off code is refused", () => {
    assert.deepEqual(ask(code({ active: false })), { ok: false, refusal: "off" });
  });

  it("each customer gets their number of orders, and the code its total", () => {
    assert.deepEqual(ask(code(), { usedByCustomer: 1 }), { ok: false, refusal: "already-used" });
    assert.equal(ask(code({ perCustomer: 3 }), { usedByCustomer: 2 }).ok, true);
    assert.deepEqual(ask(code({ maxUses: 100, usedCount: 100 })), { ok: false, refusal: "used-up" });
    assert.equal(ask(code({ maxUses: 100, usedCount: 99 })).ok, true);
  });

  it("needs the order to reach its minimum", () => {
    const from1000 = code({ minOrder: 1000 });
    assert.equal(ask(from1000, { subtotal: 1000 }).ok, true);
    assert.deepEqual(ask(from1000, { subtotal: 999 }), { ok: false, refusal: "min-order" });
    assert.match(refusalText("min-order", from1000), /від 1.000 ₴/);
  });

  it("never gives a discount outside 1 to 99 percent, whatever is stored", () => {
    assert.equal(ask(code({ percent: 100 })).ok, false);
    assert.equal(ask(code({ percent: 0 })).ok, false);
  });

  it("tells the customer why, in words they can act on", () => {
    assert.match(refusalText("ended", code({ endDay: "2026-12-09" })), /минув 9 грудня 2026/);
    assert.match(refusalText("not-started", code({ startDay: "2026-12-20" })), /20 грудня 2026/);
    assert.match(refusalText("sign-in", null), /Увійдіть/);
    assert.match(refusalText("unknown", null), /Такого промокоду немає/);
  });
});

describe("promo codes: state and what is left", () => {
  it("the state of the code as a whole", () => {
    assert.equal(promoStatus(code(), TODAY), "active");
    assert.equal(promoStatus(code({ active: false }), TODAY), "off");
    assert.equal(promoStatus(code({ startDay: "2026-12-11" }), TODAY), "scheduled");
    assert.equal(promoStatus(code({ endDay: "2026-12-09" }), TODAY), "ended");
    assert.equal(promoStatus(code({ maxUses: 5, usedCount: 5 }), TODAY), "used");
    // A personal code is spent when its one customer has used it up.
    assert.equal(promoStatus(code({ ownerId: OWNER, usedCount: 1 }), TODAY), "used");
    // A shared code that one customer has used is still good for the others.
    assert.equal(promoStatus(code({ usedCount: 1 }), TODAY), "active");
  });

  it("counts the uses left", () => {
    assert.equal(usesLeft(code()), null);
    assert.equal(usesLeft(code({ maxUses: 10, usedCount: 4 })), 6);
    assert.equal(usesLeft(code({ ownerId: OWNER, perCustomer: 2, usedCount: 1 })), 1);
    assert.equal(usesLeft(code({ maxUses: 3, usedCount: 7 })), 0);
  });

  it("shows a customer their own code", () => {
    const view = customerPromo(code({ ownerId: OWNER, endDay: "2026-12-16", minOrder: 500 }), TODAY, 0);
    assert.deepEqual(view, { code: "ZYMA15", percent: 15, startDay: null, lastDay: "2026-12-16", daysLeft: 7, usesLeft: 1, minOrder: 500, state: "active" });
    assert.equal(customerPromo(code({ ownerId: OWNER, endDay: TODAY }), TODAY, 0).daysLeft, 1);
    assert.equal(customerPromo(code({ ownerId: OWNER, endDay: "2026-12-09" }), TODAY, 0).state, "expired");
    assert.equal(customerPromo(code({ ownerId: OWNER, usedCount: 1 }), TODAY, 1).state, "used");
    assert.equal(customerPromo(code({ ownerId: OWNER, active: false }), TODAY, 0).state, "expired");
    assert.equal(customerPromo(code({ ownerId: OWNER }), TODAY, 0).daysLeft, null);
    const later = customerPromo(code({ ownerId: OWNER, startDay: "2026-12-20" }), TODAY, 0);
    assert.equal(later.state, "scheduled");
    assert.equal(later.startDay, "2026-12-20");
  });

  it("lists working codes first, the one that ends soonest on top", () => {
    const list = sortCustomerPromos([
      customerPromo(code({ code: "OLD", endDay: "2026-03-01" }), TODAY, 0),
      customerPromo(code({ code: "LATER", endDay: "2027-01-15" }), TODAY, 0),
      customerPromo(code({ code: "USED", usedCount: 1 }), TODAY, 1),
      customerPromo(code({ code: "SOON", endDay: "2026-12-11" }), TODAY, 0),
      customerPromo(code({ code: "COMING", startDay: "2026-12-20" }), TODAY, 0),
      customerPromo(code({ code: "FOREVER" }), TODAY, 0),
    ]);
    assert.deepEqual(list.map((promo) => promo.code), ["SOON", "LATER", "FOREVER", "COMING", "USED", "OLD"]);
  });
});

describe("promo codes: days and code text", () => {
  it("goes by the Kyiv calendar", () => {
    assert.equal(kyivDay(new Date("2026-12-09T20:00:00Z")), "2026-12-09"); // 22:00 in Kyiv
    assert.equal(kyivDay(new Date("2026-12-09T23:30:00Z")), "2026-12-10"); // already the 10th there
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    assert.equal(daysBetween("2026-12-10", "2026-12-10"), 1);
    assert.equal(daysBetween("2026-12-10", "2026-12-16"), 7);
    assert.equal(daysBetween("2026-12-10", "2026-12-01"), 0);
  });

  it("reads what a customer typed as the stored code", () => {
    assert.equal(normalizePromoCode("  zyma 15 "), "ZYMA15");
    assert.equal(normalizePromoCode(null), "");
  });

  it("makes random codes that are easy to type and fit the allowed shape", () => {
    let n = 0;
    const made = randomPromoCode(() => ((n += 7) % 31) / 31);
    assert.match(made, /^NV-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.doesNotMatch(made, /[01OIL]/);
    assert.equal(PROMO_CODE_SHAPE.test(made), true);
    assert.notEqual(randomPromoCode(), randomPromoCode());
  });
});

describe("promo codes: the admin form", () => {
  it("accepts a filled form and tidies it", () => {
    const { value, errors } = cleanPromoInput({ code: " black friday ", percent: "20", startDay: "2026-11-27", endDay: "2026-11-30", maxUses: "500", perCustomer: "", minOrder: "1 500", note: "  Instagram  ", active: true });
    assert.deepEqual(errors, {});
    assert.deepEqual(value, { code: "BLACKFRIDAY", percent: 20, ownerId: null, startDay: "2026-11-27", endDay: "2026-11-30", maxUses: 500, perCustomer: 1, minOrder: 1500, active: true, note: "Instagram" });
  });

  it("says what is wrong, field by field", () => {
    const { errors } = cleanPromoInput({ code: "ЗИМА", percent: "120", startDay: "2026-12-10", endDay: "2026-12-01", maxUses: "0", perCustomer: "1.5", minOrder: "-5", ownerId: "someone" });
    assert.deepEqual(Object.keys(errors).sort(), ["code", "endDay", "maxUses", "minOrder", "ownerId", "percent", "perCustomer"].sort());
    assert.match(errors.code ?? "", /латинських/);
    assert.equal(cleanPromoInput({ code: "", percent: "" }).errors.code !== undefined, true);
    assert.equal(cleanPromoInput({ code: "OK1", percent: 10, endDay: "2026-02-30" }).errors.endDay !== undefined, true);
  });

  it("keeps a personal code's owner and an empty limit as no limit", () => {
    const { value, errors } = cleanPromoInput({ code: "nv-7k4q-9xtp", percent: 10, ownerId: OWNER.toUpperCase(), maxUses: "", minOrder: "" });
    assert.deepEqual(errors, {});
    assert.equal(value.ownerId, OWNER);
    assert.equal(value.maxUses, null);
    assert.equal(value.minOrder, 0);
  });
});

describe("promo codes: the rewards the shop gives by itself", () => {
  it("are what the shop did before, until someone changes them", () => {
    assert.deepEqual(cleanPromoRewards(undefined).rewards, DEFAULT_PROMO_REWARDS);
    assert.deepEqual(DEFAULT_PROMO_REWARDS, { welcome: { enabled: true, percent: 10, days: 30 }, review: { enabled: true, percent: 5, days: 30 } });
  });

  it("can be changed and switched off, within sane limits", () => {
    const { rewards, errors } = cleanPromoRewards({ welcome: { enabled: false, percent: 15, days: 14 }, review: { percent: 150, days: 0 } });
    assert.deepEqual(rewards.welcome, { enabled: false, percent: 15, days: 14 });
    assert.deepEqual(Object.keys(errors).sort(), ["review.days", "review.percent"]);
    assert.deepEqual(rewards.review, DEFAULT_PROMO_REWARDS.review);
  });
});

describe("promo codes issued in the old format", () => {
  // "DV-" + percent + 4 digits + 3 letters of the e-mail + date written in the code + uses left
  it("keep working as codes of the list, until the day before the date written in them", () => {
    const record = legacyPromo("DV-101234TES202612171", OWNER);
    assert.deepEqual(record, { code: "DV-101234TES202612171", percent: 10, ownerId: OWNER, startDay: null, endDay: "2026-12-16", maxUses: null, perCustomer: 1, minOrder: 0, active: true, note: "", source: "legacy", usedCount: 0 });
    assert.equal(checkPromo({ id: "x", ...record! }, { userId: OWNER, subtotal: 100, today: "2026-12-16", usedByCustomer: 0 }).ok, true);
    assert.equal(checkPromo({ id: "x", ...record! }, { userId: OWNER, subtotal: 100, today: "2026-12-17", usedByCustomer: 0 }).ok, false);
  });

  it("a spent one stays spent", () => {
    const record = legacyPromo("DV-101234TES202612170", OWNER);
    assert.equal(record?.usedCount, 1);
    assert.equal(promoStatus({ id: "x", ...record! }, "2026-12-01"), "used");
  });

  it("a personal code with no customer chosen is refused, not saved as shared", () => {
    assert.notEqual(cleanPromoInput({ code: "ZIMA15", percent: 10, ownerId: "" }).errors.ownerId, undefined);
    assert.equal(cleanPromoInput({ code: "ZIMA15", percent: 10, ownerId: null }).errors.ownerId, undefined);
    assert.equal(cleanPromoInput({ code: "ZIMA15", percent: 10, ownerId: null }).value.ownerId, null);
  });

  it("the e-mail part may hold a dot or an underscore, as old codes do", () => {
    assert.equal(legacyPromo("DV-101666B.S202612251", OWNER)?.endDay, "2026-12-24");
    assert.equal(legacyPromo("dv-104378iv_202612181", OWNER)?.code, "DV-104378IV_202612181");
    assert.equal(cleanPromoInput({ code: "DV-101666B.S202612251", percent: 10 }).errors.code, undefined);
    assert.notEqual(cleanPromoInput({ code: "ZIMA.15", percent: 10 }).errors.code, undefined);
  });

  it("text that is not such a code is left out", () => {
    assert.equal(legacyPromo("WELCOME", OWNER), null);
    assert.equal(legacyPromo("", OWNER), null);
  });
});
