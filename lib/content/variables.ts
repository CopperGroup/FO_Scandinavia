import type { ContentValues } from "./schema";

/**
 * Variables: values the admin sets once and uses in any text of the site by
 * writing the name in curly braces, e.g. "Телефонуйте: {телефон}". Change the
 * value in one place and every text that names it changes with it.
 *
 * Three kinds:
 *  - contacts: belong to the shop itself (phone, e-mail, hours, messengers,
 *    address). The names are fixed; the values are the admin's. The phone and
 *    the e-mail must be filled in. The header, the footer and the "Контакти"
 *    page read the same values. Edited in the admin under "Налаштування".
 *  - computed: the shop fills them in by itself (shop name, year, the
 *    free-delivery sum).
 *  - custom: the admin's own, any number of them.
 *
 * This file holds the rules and has no access to the database, so the editor
 * in the browser and the server check the same things. Reading and saving are
 * in ./server.ts.
 */

/** Key of the document in the "sitecontents" collection that keeps the variables. */
export const VARIABLES_KEY = "variables";

export type ContactKey = "phone" | "email" | "hours" | "telegram" | "viber" | "address";

export type ContactVariable = {
  key: ContactKey;
  /** The word to write in braces. */
  name: string;
  label: string;
  /** Words needed to fill the field. */
  hint: string;
  /** Where customers see it besides the texts that name it. */
  where: string;
  placeholder: string;
  required?: boolean;
  max: number;
  input: "tel" | "email" | "text";
};

export const CONTACT_VARIABLES: ContactVariable[] = [
  { key: "phone", name: "телефон", label: "Телефон", hint: "Номер, на який дзвонять покупці.", where: "Угорі кожної сторінки сайту, внизу сайту і на сторінці «Контакти».", placeholder: "+380 96 087 14 57", required: true, max: 30, input: "tel" },
  { key: "email", name: "пошта", label: "Електронна пошта", hint: "Адреса для листів від покупців.", where: "Внизу кожної сторінки сайту і на сторінці «Контакти».", placeholder: "shop@nordiva.com.ua", required: true, max: 120, input: "email" },
  { key: "hours", name: "графік", label: "Графік роботи", hint: "Коли ви відповідаєте на дзвінки й повідомлення.", where: "Внизу сайту, на сторінці «Контакти» і в кнопці зв’язку.", placeholder: "Пн–Сб, 9:00–19:00", max: 60, input: "text" },
  { key: "telegram", name: "телеграм", label: "Telegram", hint: "Номер телефону або нік, наприклад @nordiva. Порожнє поле прибирає кнопку Telegram із сайту.", where: "На сторінці «Контакти» і в кнопці зв’язку.", placeholder: "@nordiva", max: 40, input: "text" },
  { key: "viber", name: "вайбер", label: "Viber", hint: "Номер телефону. Порожнє поле прибирає кнопку Viber із сайту.", where: "На сторінці «Контакти» і в кнопці зв’язку.", placeholder: "+380 66 407 44 13", max: 30, input: "tel" },
  { key: "address", name: "адреса", label: "Адреса", hint: "Місто й адреса, якщо покупцям треба її знати.", where: "На сторінці «Контакти».", placeholder: "м. Київ, вул. Хрещатик, 1", max: 160, input: "text" },
];

/** Filled in by the shop itself. `{сума}` is the oldest of them: lib/content/schema.ts, AMOUNT_TOKEN. */
export const COMPUTED_VARIABLES = [
  { name: "магазин", label: "Назва магазину", note: "Задана в налаштуваннях сайту." },
  { name: "сума", label: "Сума безкоштовної доставки", note: "Змінюється на сторінці «Доставка та оплата»." },
  { name: "рік", label: "Поточний рік", note: "Міняється сам 1 січня." },
] as const;

export type CustomVariable = { name: string; value: string };
export type VariableValues = { contacts: Record<ContactKey, string>; custom: CustomVariable[] };

export const MAX_CUSTOM_VARIABLES = 40;
export const CUSTOM_VALUE_MAX = 300;

const RESERVED = new Set<string>([...CONTACT_VARIABLES.map((variable) => variable.name), ...COMPUTED_VARIABLES.map((variable) => variable.name)]);

/** A name as it is compared: lower case, single spaces, no braces. */
export function normaliseName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("uk-UA");
}

/** Letters (Ukrainian or Latin), digits, spaces and hyphens; starts with a letter; 2 to 30 characters. */
const NAME_SHAPE = /^[a-zа-яіїєґ][a-zа-яіїєґ0-9’' -]{1,29}$/;
export const isVariableName = (name: string) => NAME_SHAPE.test(name);
export const isReservedName = (name: string) => RESERVED.has(name);

/** `{name}` in a text. Nothing that spans lines or holds another brace. */
const TOKEN = /\{([^{}\n]{1,40})\}/g;

export const token = (name: string) => `{${name}}`;

/** Names written in braces in a text, as compared (normalised), each once. */
export function namesIn(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(TOKEN)) {
    const name = normaliseName(match[1]);
    if (name) names.add(name);
  }
  return Array.from(names);
}

/** Puts the values in. A name that is not in `map` stays as written. */
export function fillVariables(text: string, map: Record<string, string>): string {
  if (!text.includes("{")) return text;
  return text.replace(TOKEN, (whole, raw: string) => {
    const name = normaliseName(raw);
    return Object.prototype.hasOwnProperty.call(map, name) ? map[name] : whole;
  });
}

/** Every text of a page: its place ("facts.0.title") and the text. */
function texts(values: ContentValues): [string, string][] {
  const found: [string, string][] = [];
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") found.push([key, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => Object.entries(item ?? {}).forEach(([field, text]) => typeof text === "string" && found.push([`${key}.${index}.${field}`, text])));
  }
  return found;
}

/** The texts of a page with the values put in. */
export function applyVariables<T extends ContentValues>(values: T, map: Record<string, string>): T {
  const result: ContentValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") result[key] = fillVariables(value, map);
    else if (Array.isArray(value)) result[key] = value.map((item) => Object.fromEntries(Object.entries(item ?? {}).map(([field, text]) => [field, typeof text === "string" ? fillVariables(text, map) : text])));
    else result[key] = value;
  }
  return result as T;
}

/** Names used in the texts of a page. */
export function usedNames(values: ContentValues): Set<string> {
  return new Set(texts(values).flatMap(([, text]) => namesIn(text)));
}

/** Names in braces that no variable has, by the place of the text: what must be fixed before saving. */
export function unknownNames(values: ContentValues, known: Set<string>): Record<string, string[]> {
  const problems: Record<string, string[]> = {};
  for (const [where, text] of texts(values)) {
    const unknown = namesIn(text).filter((name) => !known.has(name));
    if (unknown.length > 0) problems[where] = unknown;
  }
  return problems;
}

export function emptyVariables(): VariableValues {
  return { contacts: { phone: "", email: "", hours: "", telegram: "", viber: "", address: "" }, custom: [] };
}

const PHONE = /^\+?\d[\d\s()-]{8,18}$/;
const digitCount = (value: string) => value.replace(/\D/g, "").length;
export const isPhone = (value: string) => PHONE.test(value) && digitCount(value) >= 10 && digitCount(value) <= 13;
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const isTelegramNick = (value: string) => /^@?[A-Za-z][A-Za-z0-9_]{3,31}$/.test(value);

const tidy = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Brings what arrives from the editor (or from the database) to the shape
 * above. `strict` also reports what must be fixed before saving; the keys of
 * `errors` are "contacts.phone", "custom.2.name", "custom.2.value".
 */
export function cleanVariables(input: unknown, options: { strict: boolean } = { strict: false }): { values: VariableValues; errors: Record<string, string> } {
  const source = input && typeof input === "object" ? (input as { contacts?: unknown; custom?: unknown }) : {};
  const contactsIn = source.contacts && typeof source.contacts === "object" ? (source.contacts as Record<string, unknown>) : {};
  const values = emptyVariables();
  const errors: Record<string, string> = {};

  for (const variable of CONTACT_VARIABLES) values.contacts[variable.key] = tidy(contactsIn[variable.key], variable.max);

  const seen = new Set<string>();
  const customIn = Array.isArray(source.custom) ? source.custom.slice(0, MAX_CUSTOM_VARIABLES) : [];
  customIn.forEach((entry, index) => {
    const row = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const name = normaliseName(row.name).slice(0, 30);
    const value = tidy(row.value, CUSTOM_VALUE_MAX);
    if (!options.strict && (!name || !isVariableName(name) || isReservedName(name) || seen.has(name))) return; // reading: a broken row is dropped
    if (options.strict) {
      if (!name) errors[`custom.${index}.name`] = "Дайте змінній назву, наприклад: знижка.";
      else if (!isVariableName(name)) errors[`custom.${index}.name`] = "У назві можуть бути літери, цифри, пробіл і дефіс; від 2 до 30 символів, перша літера.";
      else if (isReservedName(name)) errors[`custom.${index}.name`] = `Назва «${name}» вже зайнята змінною магазину. Виберіть іншу.`;
      else if (seen.has(name)) errors[`custom.${index}.name`] = `Змінна «${name}» вже є у списку.`;
      if (!value) errors[`custom.${index}.value`] = "Напишіть значення: це те, що покупець побачить замість назви.";
    }
    seen.add(name);
    values.custom.push({ name, value });
  });

  if (options.strict) {
    const { phone, email, telegram, viber } = values.contacts;
    if (!phone) errors["contacts.phone"] = "Вкажіть телефон: він стоїть угорі сайту, без нього покупці не зможуть подзвонити.";
    else if (!isPhone(phone)) errors["contacts.phone"] = "Перевірте телефон. Приклад: +380 96 087 14 57.";
    if (!email) errors["contacts.email"] = "Вкажіть електронну пошту для покупців.";
    else if (!isEmail(email)) errors["contacts.email"] = "Перевірте адресу. Приклад: shop@nordiva.com.ua.";
    if (telegram && !isPhone(telegram) && !isTelegramNick(telegram)) errors["contacts.telegram"] = "Вкажіть номер телефону або нік у Telegram, наприклад @nordiva.";
    if (viber && !isPhone(viber)) errors["contacts.viber"] = "Для Viber потрібен номер телефону. Приклад: +380 66 407 44 13.";
    if (Array.isArray(source.custom) && source.custom.length > MAX_CUSTOM_VARIABLES) errors.custom = `Своїх змінних може бути не більше ${MAX_CUSTOM_VARIABLES}.`;
  }
  return { values, errors };
}

/** The contact fields as the old "Contacts" record kept them (inputs with Ukrainian names). */
export function legacyContacts(dataInputs: unknown): Partial<Record<ContactKey, string>> {
  const rows = Array.isArray(dataInputs) ? dataInputs : [];
  const byName = new Map<string, string>();
  for (const row of rows) {
    const name = String((row as { name?: unknown })?.name ?? "").trim();
    const value = String((row as { value?: unknown })?.value ?? "").trim();
    if (name && value) byName.set(name, value);
  }
  const found: Partial<Record<ContactKey, string>> = {};
  const take = (key: ContactKey, ...names: string[]) => {
    for (const name of names) {
      const value = byName.get(name);
      if (value) {
        found[key] = value;
        return;
      }
    }
  };
  take("phone", "Телефон");
  take("email", "Email");
  take("hours", "Працюємо з");
  take("telegram", "Telegram(nickname)", "Telegram");
  take("viber", "Viber");
  return found;
}

/**
 * What is stored, completed with what the shop had before variables existed.
 * A contact that was never saved here (the key is absent) is taken from the
 * old record; one that was saved, even empty, is the admin's decision and stays.
 */
export function mergeVariables(stored: unknown, legacy: Partial<Record<ContactKey, string>>): { values: VariableValues; fromLegacy: ContactKey[] } {
  const { values } = cleanVariables(stored);
  const savedContacts = stored && typeof stored === "object" && (stored as { contacts?: unknown }).contacts && typeof (stored as { contacts?: unknown }).contacts === "object" ? ((stored as { contacts: Record<string, unknown> }).contacts) : {};
  const fromLegacy: ContactKey[] = [];
  for (const variable of CONTACT_VARIABLES) {
    if (Object.prototype.hasOwnProperty.call(savedContacts, variable.key)) continue;
    const old = tidy(legacy[variable.key], variable.max);
    if (old) {
      values.contacts[variable.key] = old;
      fromLegacy.push(variable.key);
    }
  }
  return { values, fromLegacy };
}

/** Name to value, ready for fillVariables(). `amount` is the free-delivery sum as text, or "" while it is switched off. */
export function variableMap(values: VariableValues, computed: { store: string; year: number; amount: string }): Record<string, string> {
  const map: Record<string, string> = {};
  for (const variable of CONTACT_VARIABLES) map[variable.name] = values.contacts[variable.key];
  for (const variable of values.custom) map[variable.name] = variable.value;
  map["магазин"] = computed.store;
  map["рік"] = String(computed.year);
  // Without a sum the name stays in the text: the pages drop the whole line that mentions it (schema.ts, withAmount).
  if (computed.amount) map["сума"] = computed.amount;
  return map;
}

/** Every name a text may use. */
export function knownNames(values: VariableValues): Set<string> {
  return new Set([...RESERVED, ...values.custom.map((variable) => variable.name)]);
}

export type VariableInfo = { name: string; label: string; value: string; kind: "contact" | "computed" | "custom"; required?: boolean };

/** The list shown where a variable is picked: its name, what it is, and its value now. */
export function variableList(values: VariableValues, computed: { store: string; year: number; amount: string }): VariableInfo[] {
  return [
    ...CONTACT_VARIABLES.map((variable) => ({ name: variable.name, label: variable.label, value: values.contacts[variable.key], kind: "contact" as const, required: variable.required })),
    { name: "магазин", label: "Назва магазину", value: computed.store, kind: "computed" as const },
    { name: "сума", label: "Сума безкоштовної доставки", value: computed.amount, kind: "computed" as const },
    { name: "рік", label: "Поточний рік", value: String(computed.year), kind: "computed" as const },
    ...values.custom.map((variable) => ({ name: variable.name, label: "Ваша змінна", value: variable.value, kind: "custom" as const })),
  ];
}
