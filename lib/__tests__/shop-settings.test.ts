import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { brandHref, brandKey, brandNameProblem, brandTwinKey, cleanBrandList, cleanBrandName } from "../brands";
import { cleanMenu, freeKey, pageText, slugify } from "../menu";
import { DEFAULT_POLICIES, cleanPolicies, returnPolicyJsonLd, shippingJsonLd } from "../policies";

const ID_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ID_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("menu settings", () => {
  it("makes an address key from a Ukrainian name", () => {
    assert.equal(slugify("Спорт і відпочинок"), "sport-i-vidpochynok");
    assert.equal(slugify("Їжа"), "yizha");
    assert.equal(freeKey("Дім", ["dim"]), "dim-2");
  });

  it("keeps a saved menu as it is and never drops the special links by accident", () => {
    const { menu, errors } = cleanMenu(
      { departments: [{ key: "women", label: " Жінкам ", title: "Для жінок", text: "Перший абзац.\n\n\n\nДругий.", groups: [{ label: "Одяг", categoryIds: [ID_A, ID_A, "junk"] }] }] },
      { strict: true, knownCategoryIds: new Set([ID_A]) },
    );
    assert.deepEqual(errors, {});
    assert.deepEqual(menu.departments, [{ key: "women", label: "Жінкам", title: "Для жінок", text: "Перший абзац.\n\nДругий.", groups: [{ label: "Одяг", categoryIds: [ID_A] }] }]);
    assert.equal(menu.showNew, true);
    assert.equal(menu.showSale, true);
  });

  it("hides Новинки and Знижки only when told so", () => {
    const { menu } = cleanMenu({ departments: [], showNew: false, showSale: "no" });
    assert.equal(menu.showNew, false);
    assert.equal(menu.showSale, true);
  });

  it("reports what is wrong when saving", () => {
    const { errors } = cleanMenu(
      { departments: [{ label: "", groups: [] }, { label: "Дім", groups: [{ label: "", categoryIds: [ID_A] }, { label: "Порожня", categoryIds: [ID_B] }] }] },
      { strict: true, knownCategoryIds: new Set([ID_A]) },
    );
    assert.ok(errors["departments.0.label"]);
    assert.ok(errors["departments.0.groups"]);
    assert.ok(errors["departments.1.groups.0.label"]);
    assert.equal(errors["departments.1.groups"], undefined);
    assert.ok(cleanMenu({ departments: [] }, { strict: true }).errors.departments);
  });

  it("gives a new department a key and keeps keys unique", () => {
    const { menu } = cleanMenu({ departments: [{ label: "Спорт", groups: [] }, { key: "sport", label: "Спорт 2", groups: [] }, { key: "Not a key", label: "Дім", groups: [] }] });
    assert.deepEqual(menu.departments.map((entry) => entry.key), ["sport", "sport-2", "dim"]);
  });

  it("drops damaged parts of a stored menu instead of failing", () => {
    assert.deepEqual(cleanMenu("nonsense").menu.departments, []);
    assert.deepEqual(cleanMenu({ departments: [null, { label: "" }, { label: "Дім", groups: "x" }] }).menu.departments.map((entry) => entry.label), ["Дім"]);
  });

  it("stores a page text with single spaces and at most one empty line", () => {
    assert.equal(pageText("  Раз   два\r\n\r\n\r\nтри  "), "Раз два\n\nтри");
    assert.equal(pageText(null), "");
    assert.equal(pageText("x".repeat(2000)).length, 1200);
  });
});

describe("brands", () => {
  it("treats spellings that differ in case and spaces as one brand", () => {
    assert.equal(cleanBrandName("  Polarn   O. Pyret "), "Polarn O. Pyret");
    assert.equal(brandKey("ELLOS"), brandKey(" ellos "));
  });

  it("recognises spellings of one brand, look-alike Cyrillic letters included", () => {
    const key = brandTwinKey("Ellos");
    assert.equal(brandTwinKey("ELLOS"), key);
    assert.equal(brandTwinKey("+ Ellos"), key);
    // "Еllos" typed with a Cyrillic "Е".
    assert.equal(brandTwinKey("Еllos"), key);
    assert.equal(brandTwinKey("Áhkká"), brandTwinKey("Ahkka"));
    assert.notEqual(brandTwinKey("Ellos"), brandTwinKey("Ello"));
    // A Ukrainian name is not turned into Latin letters.
    assert.equal(brandTwinKey("Нова Думка"), "новадумка");
  });

  it("refuses names that are not brands", () => {
    assert.ok(brandNameProblem(""));
    assert.ok(brandNameProblem("Не вказано"));
    assert.ok(brandNameProblem(ID_A));
    assert.equal(brandNameProblem("H&M"), null);
  });

  it("reads the saved list without duplicates or junk", () => {
    assert.deepEqual(cleanBrandList({ names: ["Ellos", "ELLOS", "", 5, "Не вказано", " Tretorn "] }), ["Ellos", "Tretorn"]);
    assert.deepEqual(cleanBrandList(null), []);
  });

  it("builds the address of a brand page", () => {
    assert.equal(brandHref("H&M"), "/catalog?vendor=H%26M");
  });
});

describe("return and delivery terms", () => {
  it("starts from 14 days and nothing else stated", () => {
    assert.deepEqual(cleanPolicies(undefined).policies, DEFAULT_POLICIES);
    assert.deepEqual(cleanPolicies({}).policies, DEFAULT_POLICIES);
  });

  it("reads the form: empty fields mean not stated, one number of a pair stands for both", () => {
    const { policies, errors } = cleanPolicies({ returnDays: "", returnFees: "buyer", handlingMin: "1", handlingMax: "", transitMin: "1", transitMax: "3", shippingCost: "89,5" });
    assert.deepEqual(errors, {});
    assert.deepEqual(policies, { returnDays: 0, returnFees: "buyer", handlingMin: 1, handlingMax: 1, transitMin: 1, transitMax: 3, shippingCost: 89.5 });
  });

  it("reports wrong numbers and never keeps them", () => {
    const { policies, errors } = cleanPolicies({ returnDays: "two weeks", handlingMin: "3", handlingMax: "1", transitMin: "1.5", shippingCost: "-5", returnFees: "someone" });
    assert.deepEqual(Object.keys(errors).sort(), ["handling", "returnDays", "shippingCost", "transit"]);
    assert.deepEqual(policies, { returnDays: 0, returnFees: "", handlingMin: null, handlingMax: null, transitMin: null, transitMax: null, shippingCost: null });
  });

  it("states returns only when a window is set", () => {
    assert.equal(returnPolicyJsonLd({ ...DEFAULT_POLICIES, returnDays: 0 }), null);
    const policy = returnPolicyJsonLd({ ...DEFAULT_POLICIES, returnFees: "free" });
    assert.equal(policy?.merchantReturnDays, 14);
    assert.equal(policy?.applicableCountry, "UA");
    assert.equal(policy?.returnFees, "https://schema.org/FreeReturn");
    assert.equal("returnFees" in (returnPolicyJsonLd(DEFAULT_POLICIES) ?? {}), false);
  });

  it("states delivery only when its cost is known", () => {
    assert.equal(shippingJsonLd(DEFAULT_POLICIES, { price: 500, freeFrom: 3000 }), null);
    assert.equal(shippingJsonLd(DEFAULT_POLICIES, { price: 500, freeFrom: 0 }), null);

    const free = shippingJsonLd(DEFAULT_POLICIES, { price: 3000, freeFrom: 3000 });
    assert.deepEqual(free?.shippingRate, { "@type": "MonetaryAmount", value: 0, currency: "UAH" });
    assert.equal("deliveryTime" in (free ?? {}), false);

    const paid = shippingJsonLd({ ...DEFAULT_POLICIES, shippingCost: 90, handlingMin: 0, handlingMax: 1, transitMin: 1, transitMax: 3 }, { price: 500, freeFrom: 3000 });
    assert.deepEqual(paid?.shippingRate, { "@type": "MonetaryAmount", value: 90, currency: "UAH" });
    assert.deepEqual(paid?.deliveryTime, {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
    });
  });
});
