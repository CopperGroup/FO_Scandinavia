import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AMOUNT_TOKEN, CONTENT_PAGES, TARGET_SHAPE, amountLabel, cleanContent, contentPage, defaultsFor, paragraphs, sameContent, withAmount } from "../schema";
import { autoLinkItems, autoLinksByTarget, resolveTarget, targetHref, targetOptions } from "../targets";

const home = contentPage("home")!;
const delivery = contentPage("delivery")!;

describe("editable texts: the list", () => {
  it("has unique page keys and unique field keys inside a page", () => {
    assert.equal(new Set(CONTENT_PAGES.map((page) => page.key)).size, CONTENT_PAGES.length);
    for (const page of CONTENT_PAGES) {
      const keys = page.sections.flatMap((section) => section.fields.map((field) => field.key));
      assert.equal(new Set(keys).size, keys.length, page.key);
    }
  });

  it("ships defaults that pass its own rules", () => {
    for (const page of CONTENT_PAGES) {
      // The two legal texts get their default from lib/content/legal.ts.
      const extra: Record<string, string> = page.group === "documents" ? { body: "Текст документа." } : {};
      const { errors } = cleanContent(page, defaultsFor(page, extra), { strict: true });
      assert.deepEqual(errors, {}, page.key);
    }
  });
});

describe("editable texts: cleaning what arrives", () => {
  it("falls back to the default for anything missing when reading", () => {
    const { values, errors } = cleanContent(home, { headline: "  Свій   заголовок " });
    assert.equal(values.headline, "Свій заголовок");
    assert.deepEqual(values.facts, defaultsFor(home).facts);
    assert.deepEqual(errors, {});
  });

  it("drops keys the page does not have", () => {
    const { values } = cleanContent(home, { headline: "A", evil: "<script>", __proto__: { x: 1 } });
    assert.ok(!("evil" in values));
  });

  it("reports what must be fixed when saving", () => {
    const input = { ...defaultsFor(home), headline: "Д".repeat(90), facts: [{ icon: "truck", title: "", text: "x" }] };
    const { errors } = cleanContent(home, input, { strict: true });
    assert.match(errors.headline, /90/);
    assert.ok(errors["facts.0.title"]);
    assert.match(errors.facts, /2/);
  });

  it("keeps lists within their size and icons within the offered set", () => {
    const facts = Array.from({ length: 7 }, (_, index) => ({ icon: index === 0 ? "bomb" : "gift", title: `Перевага ${index}`, text: "" }));
    const { values, errors } = cleanContent(home, { ...defaultsFor(home), facts }, { strict: true });
    assert.equal((values.facts as unknown[]).length, 4);
    assert.equal((values.facts as { icon: string }[])[0].icon, "star");
    assert.ok(errors.facts);
  });

  it("accepts only whole sums for free delivery", () => {
    const base = defaultsFor(delivery);
    assert.equal(cleanContent(delivery, { ...base, freeDelivery: "2 500" }, { strict: true }).values.freeDelivery, 2500);
    assert.equal(cleanContent(delivery, { ...base, freeDelivery: 0 }, { strict: true }).errors.freeDelivery, undefined);
    assert.ok(cleanContent(delivery, { ...base, freeDelivery: "" }, { strict: true }).errors.freeDelivery);
    assert.ok(cleanContent(delivery, { ...base, freeDelivery: -5 }, { strict: true }).errors.freeDelivery);
    assert.ok(cleanContent(delivery, { ...base, freeDelivery: "багато" }, { strict: true }).errors.freeDelivery);
  });

  it("keeps a link target only when it has a known shape", () => {
    assert.equal(cleanContent(home, { ...defaultsFor(home), shoesTarget: "sale" }, { strict: true }).values.shoesTarget, "sale");
    assert.equal(cleanContent(home, { ...defaultsFor(home), shoesTarget: "https://evil.example" }, { strict: true }).values.shoesTarget, "department:shoes");
    for (const good of ["all", "new", "clothing", "department:food", "category:67e46e2c17a08e46145a5a96"]) assert.ok(TARGET_SHAPE.test(good), good);
    for (const bad of ["", "category:1", "department:", "/catalog", "javascript:alert(1)"]) assert.ok(!TARGET_SHAPE.test(bad), bad);
  });

  it("compares values, not objects", () => {
    assert.ok(sameContent(defaultsFor(home), defaultsFor(home)));
    assert.ok(!sameContent(defaultsFor(home), { ...defaultsFor(home), headline: "Інший" }));
  });
});

describe("the free-delivery sum inside a text", () => {
  it("is put where the text asks for it", () => {
    assert.equal(amountLabel(3000), "3 000 ₴");
    assert.equal(withAmount(`Безкоштовно від ${AMOUNT_TOKEN}`, 3000), "Безкоштовно від 3 000 ₴");
    assert.equal(withAmount("Без суми", 3000), "Без суми");
  });

  it("empties a line that names the sum while free delivery is off", () => {
    assert.equal(withAmount(`Безкоштовно від ${AMOUNT_TOKEN}`, 0), "");
    assert.equal(withAmount("Без суми", 0), "Без суми");
  });

  it("splits a plain text into paragraphs", () => {
    assert.deepEqual(paragraphs("Перший.\n\n\nДругий.\nтой самий абзац\n\n"), ["Перший.", "Другий.\nтой самий абзац"]);
    assert.deepEqual(paragraphs("   "), []);
  });
});

describe("where a tile leads", () => {
  const category = (id: string, name: string, count: number) => ({ id, name, count, image: null });
  const navigation: any = {
    totalCount: 100,
    saleCount: 7,
    other: [category("c".repeat(24), "Різне", 2)],
    departments: [
      { key: "women", label: "Жінкам", count: 40, groups: [{ label: "Одяг", categories: [category("a".repeat(24), "Плаття", 10)] }] },
      { key: "men", label: "Чоловікам", count: 20, groups: [] },
      { key: "shoes", label: "Взуття", count: 15, groups: [{ label: "Жіноче", categories: [category("b".repeat(24), "Чоботи", 5)] }, { label: "Чоловіче", categories: [] }] },
    ],
  };

  it("resolves departments, the clothing trio, the sale and single categories", () => {
    assert.deepEqual(resolveTarget(navigation, "department:shoes", 1), { href: "/catalog?department=shoes", count: 15, links: [{ label: "Жіноче", href: `/catalog?department=shoes&categories=${"b".repeat(24)}` }] });
    const clothing = resolveTarget(navigation, "clothing");
    assert.equal(clothing.count, 60);
    assert.deepEqual(clothing.links.map((link) => link.label), ["Жінкам", "Чоловікам"]);
    assert.deepEqual(resolveTarget(navigation, "sale"), { href: "/catalog?sale=1&sort=discount", count: 7, links: [] });
    assert.equal(resolveTarget(navigation, "new").count, null);
    assert.deepEqual(resolveTarget(navigation, `category:${"a".repeat(24)}`), { href: `/catalog?department=women&categories=${"a".repeat(24)}`, count: 10, links: [] });
    assert.equal(resolveTarget(navigation, `category:${"c".repeat(24)}`).href, `/catalog?categories=${"c".repeat(24)}`);
  });

  it("falls back to the whole catalog for something that no longer exists", () => {
    for (const gone of ["department:food", `category:${"f".repeat(24)}`, "nonsense"]) {
      assert.deepEqual(resolveTarget(navigation, gone), { href: "/catalog", count: 100, links: [] }, gone);
    }
  });

  it("offers every choice once, each in a valid shape", () => {
    const options = targetOptions(navigation);
    assert.equal(new Set(options.map((option) => option.value)).size, options.length);
    for (const option of options) assert.ok(TARGET_SHAPE.test(option.value), option.value);
    assert.ok(options.some((option) => option.value === `category:${"c".repeat(24)}`));
  });

  it("offers the columns of the menu for the small links, and accepts the keys of departments the owner added", () => {
    const options = targetOptions(navigation, { columns: true });
    assert.equal(new Set(options.map((option) => option.value)).size, options.length);
    for (const option of options) assert.ok(TARGET_SHAPE.test(option.value), option.value);
    assert.ok(options.some((option) => option.value === "column:shoes:Жіноче" && option.label === "Взуття: Жіноче"));
    assert.ok(TARGET_SHAPE.test("department:sport-i-vidpochynok"));
    assert.ok(TARGET_SHAPE.test("department:dim-2"));
    assert.ok(!TARGET_SHAPE.test("department:Дім"));
    assert.ok(!TARGET_SHAPE.test("column:shoes:"));
  });

  it("says where a code leads, or that there is nothing there", () => {
    assert.equal(targetHref(navigation, "column:shoes:Жіноче"), `/catalog?department=shoes&categories=${"b".repeat(24)}`);
    assert.equal(targetHref(navigation, "department:men"), "/catalog?department=men");
    assert.equal(targetHref(navigation, `category:${"a".repeat(24)}`), `/catalog?department=women&categories=${"a".repeat(24)}`);
    assert.equal(targetHref(navigation, "all"), "/catalog");
    assert.equal(targetHref(navigation, "sale"), "/catalog?sale=1&sort=discount");
    assert.equal(targetHref({ ...navigation, saleCount: 0 }, "sale"), null);
    for (const gone of ["column:shoes:Дитяче", "column:food:Бакалія", "department:food", `category:${"f".repeat(24)}`, "", "nonsense"]) assert.equal(targetHref(navigation, gone), null, gone);
  });

  it("shows the owner's links instead of its own, without the ones that lead nowhere", () => {
    const custom = [
      { label: "Сукні", target: `category:${"a".repeat(24)}` },
      { label: "Зникла", target: `category:${"f".repeat(24)}` },
      { label: "Знижки", target: "sale" },
    ];
    const tile = resolveTarget(navigation, "department:shoes", 3, custom);
    assert.equal(tile.href, "/catalog?department=shoes");
    assert.equal(tile.count, 15);
    assert.deepEqual(tile.links, [
      { label: "Сукні", href: `/catalog?department=women&categories=${"a".repeat(24)}`, index: 0 },
      { label: "Знижки", href: "/catalog?sale=1&sort=discount", index: 2 },
    ]);
    // A tile that leads to a selection has no links of its own, but takes the owner's.
    assert.deepEqual(resolveTarget(navigation, "new", 3, [custom[0]]).links.map((link) => link.label), ["Сукні"]);
    assert.deepEqual(resolveTarget(navigation, "department:food", 3, [custom[0]]).links.map((link) => link.label), ["Сукні"]);
  });

  it("gives the editor the links the shop puts there by itself, as editable items", () => {
    assert.deepEqual(autoLinkItems(navigation, "department:shoes", 3), [
      { label: "Жіноче", target: "column:shoes:Жіноче" },
      { label: "Чоловіче", target: "column:shoes:Чоловіче" },
    ]);
    assert.deepEqual(autoLinkItems(navigation, "clothing"), [
      { label: "Жінкам", target: "department:women" },
      { label: "Чоловікам", target: "department:men" },
    ]);
    assert.deepEqual(autoLinkItems(navigation, "sale"), []);
    const byTarget = autoLinksByTarget(navigation);
    assert.deepEqual(Object.keys(byTarget).sort(), ["clothing", "department:shoes", "department:women"]);
    // Saved as they are, they resolve to the same links the shop showed.
    assert.deepEqual(
      resolveTarget(navigation, "department:shoes", 3, byTarget["department:shoes"]).links.map(({ label, href }) => ({ label, href })),
      resolveTarget(navigation, "department:shoes", 3).links,
    );
  });
});

describe("the links under a home tile", () => {
  it("are empty until the owner sets them", () => {
    const defaults = defaultsFor(home);
    for (const slot of ["shoes", "clothing", "food", "home"]) assert.deepEqual(defaults[`${slot}Links`], []);
    // A record saved before the links existed reads as "no links set".
    assert.deepEqual(cleanContent(home, { shoesTitle: "Взуття" }).values.shoesLinks, []);
  });

  it("need a name and a place when saved, and never more than three", () => {
    const base = defaultsFor(home);
    const good = cleanContent(home, { ...base, shoesLinks: [{ label: "  Жіноче ", target: "column:shoes:Жіноче" }] }, { strict: true });
    assert.deepEqual(good.errors, {});
    assert.deepEqual(good.values.shoesLinks, [{ label: "Жіноче", target: "column:shoes:Жіноче" }]);

    const bad = cleanContent(home, { ...base, shoesLinks: [{ label: "", target: "" }, { label: "Назва, довша за двадцять два знаки", target: "javascript:alert(1)" }] }, { strict: true });
    assert.ok(bad.errors["shoesLinks.0.label"]);
    assert.ok(bad.errors["shoesLinks.0.target"]);
    assert.ok(bad.errors["shoesLinks.1.label"]);
    assert.ok(bad.errors["shoesLinks.1.target"]);

    const many = cleanContent(home, { ...base, foodLinks: Array.from({ length: 4 }, () => ({ label: "Чай", target: "all" })) }, { strict: true });
    assert.ok(many.errors.foodLinks);
  });
});
