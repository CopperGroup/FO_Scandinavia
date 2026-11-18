import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTACT_VARIABLES,
  applyVariables,
  cleanVariables,
  emptyVariables,
  fillVariables,
  knownNames,
  legacyContacts,
  mergeVariables,
  namesIn,
  normaliseName,
  unknownNames,
  usedNames,
  variableList,
  variableMap,
} from "../variables";

const computed = { store: "Nordiva", year: 2026, amount: "3 000 ₴" };
const filled = () => ({ ...emptyVariables(), contacts: { ...emptyVariables().contacts, phone: "+380 96 087 14 57", email: "shop@nordiva.com.ua" } });

describe("variables: names in a text", () => {
  it("finds names in braces, whatever the case and spacing", () => {
    assert.deepEqual(namesIn("Дзвоніть {Телефон} або пишіть { пошта }. {телефон}"), ["телефон", "пошта"]);
    assert.deepEqual(namesIn("Без дужок, {} порожні, {a\nb} через рядок"), []);
    assert.equal(normaliseName("  {Мін.  Замовлення} "), "мін. замовлення");
  });

  it("puts values in and leaves an unknown name as written", () => {
    const map = { телефон: "+380 96 087 14 57", знижка: "−20%" };
    assert.equal(fillVariables("Телефон: {ТЕЛЕФОН}, знижка {знижка}, {щось}", map), "Телефон: +380 96 087 14 57, знижка −20%, {щось}");
    assert.equal(fillVariables("Без змінних", map), "Без змінних");
  });

  it("does not treat a value as a text to fill again", () => {
    assert.equal(fillVariables("{а}", { а: "{б}", б: "ні" }), "{б}");
  });

  it("fills every text of a page, lists included, and nothing else", () => {
    const values = { headline: "Магазин {магазин}", freeDelivery: 3000, facts: [{ icon: "truck", title: "Від {сума}", text: "{рік}" }] };
    const result = applyVariables(values, variableMap(filled(), computed));
    assert.deepEqual(result, { headline: "Магазин Nordiva", freeDelivery: 3000, facts: [{ icon: "truck", title: "Від 3 000 ₴", text: "2026" }] });
    assert.equal(values.headline, "Магазин {магазин}", "the source is not changed");
  });

  it("keeps {сума} in the text while free delivery is off", () => {
    const map = variableMap(filled(), { ...computed, amount: "" });
    assert.equal(fillVariables("Безкоштовно від {сума}", map), "Безкоштовно від {сума}");
  });

  it("reports names that no variable has, by the place of the text", () => {
    const values = { headline: "{телефон} {телефонн}", facts: [{ title: "{знижка}", text: "ок" }] };
    const known = knownNames({ ...filled(), custom: [{ name: "знижка", value: "−20%" }] });
    assert.deepEqual(unknownNames(values, known), { headline: ["телефонн"] });
    assert.deepEqual(unknownNames(values, knownNames(filled())), { headline: ["телефонн"], "facts.0.title": ["знижка"] });
    assert.deepEqual(Array.from(usedNames(values)).sort(), ["знижка", "телефон", "телефонн"]);
  });
});

describe("variables: what the admin may save", () => {
  it("accepts filled contacts and tidy custom variables", () => {
    const { values, errors } = cleanVariables({ contacts: { ...filled().contacts, telegram: "@nordiva", viber: "+380 66 407 44 13" }, custom: [{ name: " Знижка ", value: " −20%  на все " }] }, { strict: true });
    assert.deepEqual(errors, {});
    assert.deepEqual(values.custom, [{ name: "знижка", value: "−20% на все" }]);
    assert.equal(values.contacts.address, "");
  });

  it("requires the phone and the e-mail, and checks their shape", () => {
    assert.deepEqual(Object.keys(cleanVariables({}, { strict: true }).errors).sort(), ["contacts.email", "contacts.phone"]);
    const { errors } = cleanVariables({ contacts: { phone: "12345", email: "shop@", telegram: "!!", viber: "abc" } }, { strict: true });
    assert.deepEqual(Object.keys(errors).sort(), ["contacts.email", "contacts.phone", "contacts.telegram", "contacts.viber"]);
  });

  it("refuses a custom name that is taken, repeated, misshapen or without a value", () => {
    const custom = [
      { name: "телефон", value: "x" },
      { name: "акція", value: "x" },
      { name: "Акція", value: "y" },
      { name: "1+1", value: "x" },
      { name: "", value: "x" },
      { name: "строк", value: "" },
    ];
    const { errors } = cleanVariables({ contacts: filled().contacts, custom }, { strict: true });
    assert.deepEqual(Object.keys(errors).sort(), ["custom.0.name", "custom.2.name", "custom.3.name", "custom.4.name", "custom.5.value"]);
  });

  it("drops broken rows when reading instead of failing", () => {
    const { values } = cleanVariables({ contacts: "nonsense", custom: [{ name: "телефон", value: "x" }, null, { name: "акція", value: "так" }, "x"] });
    assert.deepEqual(values.custom, [{ name: "акція", value: "так" }]);
    assert.deepEqual(values.contacts, emptyVariables().contacts);
  });
});

describe("variables: what the shop had before them", () => {
  const old = [
    { name: "Телефон", value: " +380 96 087 14 57 " },
    { name: "Email", value: "shop@nordiva.com.ua" },
    { name: "Працюємо з", value: "9:00 до 20:00" },
    { name: "Telegram", value: "+380960871457" },
    { name: "Telegram(nickname)", value: "@nordiva" },
    { name: "Viber", value: "" },
    { name: "Щось інше", value: "x" },
  ];

  it("reads the old contacts record, the nick before the number for Telegram", () => {
    assert.deepEqual(legacyContacts(old), { phone: "+380 96 087 14 57", email: "shop@nordiva.com.ua", hours: "9:00 до 20:00", telegram: "@nordiva" });
    assert.deepEqual(legacyContacts(undefined), {});
    assert.deepEqual(legacyContacts([{ name: "Telegram", value: "+380960871457" }]), { telegram: "+380960871457" });
  });

  it("takes the old value only for a contact never saved as a variable", () => {
    const legacy = legacyContacts(old);
    const fresh = mergeVariables(undefined, legacy);
    assert.equal(fresh.values.contacts.phone, "+380 96 087 14 57");
    assert.deepEqual(fresh.fromLegacy, ["phone", "email", "hours", "telegram"]);

    // Saved once: an emptied field stays empty, the old value does not come back.
    const saved = mergeVariables({ contacts: { ...emptyVariables().contacts, phone: "+380 50 111 22 33", email: "new@nordiva.com.ua" }, custom: [] }, legacy);
    assert.equal(saved.values.contacts.phone, "+380 50 111 22 33");
    assert.equal(saved.values.contacts.telegram, "");
    assert.deepEqual(saved.fromLegacy, []);

    // A contact added to the list later is absent from an older saved document and is still picked up.
    const partial = mergeVariables({ contacts: { phone: "+380 50 111 22 33" } }, legacy);
    assert.equal(partial.values.contacts.email, "shop@nordiva.com.ua");
    assert.deepEqual(partial.fromLegacy, ["email", "hours", "telegram"]);
  });
});

describe("variables: the list offered to the admin", () => {
  it("has every name once and a value for each", () => {
    const values = { ...filled(), custom: [{ name: "знижка", value: "−20%" }] };
    const list = variableList(values, computed);
    assert.equal(new Set(list.map((item) => item.name)).size, list.length);
    assert.deepEqual(Object.keys(variableMap(values, computed)).sort(), list.map((item) => item.name).sort());
    assert.ok(CONTACT_VARIABLES.every((variable) => knownNames(values).has(variable.name)));
  });
});
