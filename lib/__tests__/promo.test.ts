import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerPromo, customerPromoCodes } from "../promo";

// "DV-" + percent + 4 digits + 3 letters of the e-mail + date written in the code + uses left
const code = (percent: number, date: string, uses: number, digits = "1234") => `DV-${percent}${digits}TES${date}${uses}`;

describe("a customer's promo codes", () => {
  // 10 December 2026, 12:00 in Kyiv
  const now = new Date("2026-12-10T10:00:00Z");

  it("reads the discount, the uses and the last working day", () => {
    const promo = customerPromo(code(10, "20261217", 1), now);
    assert.equal(promo.percent, 10);
    assert.equal(promo.usesLeft, 1);
    assert.equal(promo.state, "active");
    // The order check refuses the code once the date written in it has come, so the day before is the last one.
    assert.equal(promo.lastDay, "2026-12-16");
    assert.equal(promo.daysLeft, 7);
  });

  it("counts today as the last day when the date in the code is tomorrow", () => {
    const promo = customerPromo(code(5, "20261211", 1), now);
    assert.equal(promo.state, "active");
    assert.equal(promo.lastDay, "2026-12-10");
    assert.equal(promo.daysLeft, 1);
  });

  it("is over on the date written in the code", () => {
    const promo = customerPromo(code(10, "20261210", 1), now);
    assert.equal(promo.state, "expired");
    assert.equal(promo.daysLeft, 0);
    assert.equal(promo.lastDay, "2026-12-09");
  });

  it("goes by the Kyiv calendar, not the server's", () => {
    // 23:30 UTC on the 9th is already the 10th in Kyiv.
    assert.equal(customerPromo(code(10, "20261210", 1), new Date("2026-12-09T23:30:00Z")).state, "expired");
    assert.equal(customerPromo(code(10, "20261210", 1), new Date("2026-12-09T20:00:00Z")).state, "active");
  });

  it("is used when no uses are left, even before its date", () => {
    const promo = customerPromo(code(10, "20261231", 0), now);
    assert.equal(promo.state, "used");
    assert.equal(promo.daysLeft, 0);
  });

  it("treats a code it cannot read as not working", () => {
    const promo = customerPromo("WELCOME", now);
    assert.equal(promo.state, "expired");
    assert.equal(promo.percent, null);
    assert.equal(promo.lastDay, null);
  });

  it("lists working codes first, the one that ends soonest on top, and drops repeats and junk", () => {
    const later = code(10, "20270115", 1, "1111");
    const sooner = code(5, "20261212", 1, "2222");
    const used = code(10, "20261231", 0, "3333");
    const oldExpired = code(10, "20260301", 1, "4444");
    const newExpired = code(10, "20261101", 1, "5555");
    const list = customerPromoCodes([oldExpired, later, used, sooner, newExpired, sooner, "", null, 42], now);
    assert.deepEqual(list.map((promo) => promo.code), [sooner, later, used, newExpired, oldExpired]);
    assert.deepEqual(list.map((promo) => promo.state), ["active", "active", "used", "expired", "expired"]);
  });
});
