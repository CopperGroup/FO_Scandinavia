/**
 * The texts of the storefront that the shop owner can change in the admin
 * panel ("Сторінки"). This file is the single list of them: what can be
 * edited, how the field is called, how long it may be, and the text the site
 * shows until someone changes it.
 *
 * Pure data and pure functions: imported by server code, by the storefront and
 * by the admin editor alike. Reading and saving live in ./server.ts.
 *
 * To make another piece of text editable: add a field here, then read it on
 * the page with getContent("<page>"). Nothing else is needed, the editor is
 * built from this list.
 */

export const AMOUNT_TOKEN = "{сума}";

/** Icons a "fact" can carry; components/content/FactIcon.tsx draws them. */
export const FACT_ICONS = [
  { value: "truck", label: "Вантажівка (доставка)" },
  { value: "package", label: "Посилка" },
  { value: "return", label: "Стрілка назад (повернення)" },
  { value: "chat", label: "Повідомлення" },
  { value: "card", label: "Картка (оплата)" },
  { value: "shield", label: "Щит (гарантія)" },
  { value: "clock", label: "Годинник" },
  { value: "gift", label: "Подарунок" },
  { value: "star", label: "Зірка" },
  { value: "heart", label: "Серце" },
] as const;
export type FactIconKey = (typeof FACT_ICONS)[number]["value"];

type Base = {
  key: string;
  label: string;
  hint?: string;
  /** A small heading printed above the field, to group a few fields that belong together. */
  heading?: string;
  /** The field whose mark on the page (data-edit) shows where this one is, when it has none of its own. */
  marker?: string;
};

/** One line of text. */
export type TextField = Base & { kind: "text"; max: number; default: string; required?: boolean };
/** A few sentences; an empty line starts a new paragraph. */
export type LongField = Base & { kind: "long"; max: number; rows?: number; default: string; required?: boolean };
/**
 * Formatted text: paragraphs, lists, headings and links, written with a few
 * simple marks (Markdown). `document` is a long legal text.
 */
export type RichField = Base & { kind: "rich"; max: number; rows?: number; default: string; document?: boolean; required?: boolean };
export type NumberField = Base & { kind: "number"; min: number; max: number; suffix?: string; default: number };
export type ChoiceField = Base & { kind: "choice"; options: readonly { value: string; label: string }[]; default: string; /** The options are icons (FACT_ICONS): the editor shows them as pictures. */ icons?: boolean };
/**
 * Where a block of the storefront leads: a department, a category, the sale…
 * The choices come from the catalog, so the editor gets them from the server
 * (lib/content/targets.ts); the stored value looks like "department:shoes".
 * Inside a list item the default is "": the owner must choose.
 */
export type TargetField = Base & { kind: "target"; default: string };
/** A department key is what lib/menu.ts makes of its name: latin letters, digits and hyphens. */
export const TARGET_SHAPE = /^(all|sale|new|clothing|department:[a-z0-9]+(?:-[a-z0-9]+){0,12}|category:[0-9a-f]{24}|column:[a-z0-9]+(?:-[a-z0-9]+){0,12}:[^\u0000-\u001f]{1,40})$/;
export type ItemField = TextField | LongField | RichField | ChoiceField | TargetField;
/** A list of similar items the owner can add to, remove from and reorder. */
export type ListField = Base & {
  kind: "list";
  /** Accusative, for the button: «Додати <itemName>». */
  itemName: string;
  min: number;
  max: number;
  fields: ItemField[];
  default: Record<string, string>[];
  /** Shows the items in the editor the way the site draws them. */
  preview?: "facts";
  /**
   * While the list is empty the shop fills the place by itself: with the links
   * that follow from the target field `of` (lib/content/targets.ts,
   * autoLinkItems), at most `limit` of them. The editor shows those and offers
   * to start from them.
   */
  auto?: { of: string; limit: number };
};
export type ContentField = TextField | LongField | RichField | NumberField | ChoiceField | TargetField | ListField;

export type ContentSection = { id: string; title: string; description?: string; fields: ContentField[] };
export type ContentPage = {
  key: ContentKey;
  title: string;
  /** Shown in the list of pages in the admin. */
  summary: string;
  /** Where to look at the result. */
  href: string;
  group: "pages" | "documents";
  sections: ContentSection[];
};

export type ContentKey = "home" | "product" | "delivery" | "returns" | "footer" | "offer" | "privacy";
export type ContentValue = string | number | Record<string, string>[];
export type ContentValues = Record<string, ContentValue>;

/** The four tiles of the home page and how many links the shop puts under each by itself. */
export const HOME_TILES = { shoes: 3, clothing: 3, food: 2, home: 3 } as const;
export type HomeTile = keyof typeof HOME_TILES;

/** A tile of the home page: its name, where it leads, and the small links under the name. */
function tileFields(slot: HomeTile, heading: string, title: string, target: string): ContentField[] {
  return [
    { kind: "text", key: `${slot}Title`, label: "Назва", heading, max: 18, default: title, required: true },
    { kind: "target", key: `${slot}Target`, marker: `${slot}Title`, label: "Куди веде", default: target },
    {
      kind: "list",
      key: `${slot}Links`,
      marker: `${slot}Title`,
      label: "Посилання під назвою",
      itemName: "посилання",
      min: 0,
      max: 3,
      auto: { of: `${slot}Target`, limit: HOME_TILES[slot] },
      hint: "Маленькі посилання під назвою плитки, до трьох. Їх видно на комп’ютері й планшеті; на телефоні плитка показує лише назву.",
      fields: [
        { kind: "text", key: "label", label: "Назва посилання", max: 22, default: "", required: true },
        { kind: "target", key: "target", label: "Куди веде", default: "" },
      ],
      default: [],
    },
  ];
}

const AMOUNT_HINT = `Напишіть ${AMOUNT_TOKEN} там, де має стояти сума безкоштовної доставки: вона підставиться сама і зміниться всюди, коли ви зміните її на сторінці «Доставка та оплата».`;

export const CONTENT_PAGES: ContentPage[] = [
  {
    key: "home",
    title: "Головна сторінка",
    summary: "Заголовок, чотири плитки, переваги, назви добірок",
    href: "/",
    group: "pages",
    sections: [
      {
        id: "hero",
        title: "Заголовок",
        description: "Перший рядок, який бачить покупець.",
        fields: [{ kind: "text", key: "headline", label: "Заголовок сторінки", max: 70, default: "Товари зі Скандинавії з доставкою по Україні", required: true, hint: "До 70 символів: на комп’ютері він стоїть в один рядок." }],
      },
      {
        id: "facts",
        title: "Переваги",
        description: "Рядок під плитками: доставка, оплата, повернення. Від двох до чотирьох переваг.",
        fields: [
          {
            kind: "list",
            key: "facts",
            label: "Переваги",
            itemName: "перевагу",
            min: 2,
            max: 4,
            preview: "facts",
            hint: AMOUNT_HINT,
            fields: [
              { kind: "choice", key: "icon", label: "Значок", options: FACT_ICONS, default: "star", icons: true },
              { kind: "text", key: "title", label: "Заголовок", max: 44, default: "", required: true },
              { kind: "text", key: "text", label: "Пояснення", max: 60, default: "" },
            ],
            default: [
              { icon: "truck", title: "Нова пошта по всій Україні", text: "У відділення або поштомат" },
              { icon: "package", title: `Безкоштовно від ${AMOUNT_TOKEN}`, text: "Оплата при отриманні або за реквізитами" },
              { icon: "return", title: "14 днів на обмін і повернення", text: "Якщо річ не підійшла" },
              { icon: "chat", title: "Виникли питання?", text: "Напишіть у Telegram чи Viber" },
            ],
          },
        ],
      },
      {
        id: "departments",
        title: "Чотири плитки",
        description: "Великий блок із фото вгорі сторінки. Для кожної плитки: назва, куди вона веде, і посилання під назвою. Кількість товарів підставляється сама.",
        fields: [
          ...tileFields("shoes", "Плитка вгорі ліворуч", "Взуття", "department:shoes"),
          ...tileFields("clothing", "Плитка вгорі праворуч", "Одяг", "clothing"),
          ...tileFields("food", "Плитка внизу ліворуч", "Продукти", "department:food"),
          ...tileFields("home", "Плитка внизу праворуч", "Дім", "department:home"),
        ],
      },
      {
        id: "sections",
        title: "Назви добірок",
        description: "Заголовки над рядами товарів.",
        fields: [
          { kind: "text", key: "popularTitle", label: "Товари, які купують найчастіше", max: 40, default: "Найчастіше купують", required: true },
          { kind: "text", key: "categoriesTitle", label: "Категорії", max: 40, default: "Популярні категорії", required: true },
          { kind: "text", key: "saleTitle", label: "Товари зі знижкою", max: 40, default: "Знижки", required: true },
          { kind: "text", key: "newTitle", label: "Нові товари", max: 40, default: "Новинки", required: true },
          { kind: "text", key: "brandsTitle", label: "Бренди", max: 40, default: "Бренди", required: true },
        ],
      },
    ],
  },
  {
    key: "product",
    title: "Сторінка товару",
    summary: "Умови біля кнопки «Купити»: доставка, повернення, оплата",
    href: "/catalog",
    group: "pages",
    sections: [
      {
        id: "notes",
        title: "Умови біля кнопки «Купити»",
        description: "Ці рядки однакові на сторінці кожного товару. Порожній рядок не показується.",
        fields: [
          { kind: "text", key: "delivery", label: "Доставка", max: 70, default: "Нова пошта: у відділення або поштомат" },
          { kind: "text", key: "freeDelivery", label: "Безкоштовна доставка", max: 70, default: `Безкоштовно для замовлень від ${AMOUNT_TOKEN}`, hint: AMOUNT_HINT },
          { kind: "text", key: "returns", label: "Повернення", max: 70, default: "14 днів на обмін і повернення" },
          { kind: "text", key: "returnsLink", label: "Посилання на умови повернення", max: 40, default: "Умови повернення", hint: "Веде на сторінку «Обмін і повернення»." },
          { kind: "text", key: "payment", label: "Оплата", max: 70, default: "Оплата при отриманні або за реквізитами" },
        ],
      },
    ],
  },
  {
    key: "delivery",
    title: "Доставка та оплата",
    summary: "Сума безкоштовної доставки, способи доставки й оплати",
    href: "/info/delivery-payment",
    group: "pages",
    sections: [
      {
        id: "free",
        title: "Безкоштовна доставка",
        description: "Ця сума діє в усьому магазині: у кошику, під час оформлення замовлення, на головній і на сторінці товару.",
        fields: [
          {
            kind: "number",
            key: "freeDelivery",
            label: "Безкоштовно для замовлень від",
            min: 0,
            max: 1_000_000,
            suffix: "₴",
            default: 3000,
            hint: "0 вимикає безкоштовну доставку: згадки про неї зникнуть із сайту.",
          },
        ],
      },
      {
        id: "delivery",
        title: "Доставка",
        fields: [
          {
            kind: "long",
            key: "deliveryIntro",
            label: "Вступ",
            max: 400,
            rows: 3,
            default: "Відправляємо Новою поштою по всій Україні. Під час оформлення ви обираєте місто і зручне відділення або поштомат.",
          },
          {
            kind: "list",
            key: "deliveryRows",
            label: "Способи доставки",
            itemName: "спосіб доставки",
            min: 0,
            max: 6,
            hint: "Рядок про безкоштовну доставку додається сам, із сумою з розділу вище.",
            fields: [
              { kind: "text", key: "label", label: "Куди", max: 40, default: "", required: true },
              { kind: "text", key: "value", label: "Скільки коштує", max: 60, default: "", required: true },
            ],
            default: [
              { label: "У відділення", value: "за тарифами Нової пошти" },
              { label: "У поштомат", value: "за тарифами Нової пошти" },
            ],
          },
          { kind: "long", key: "deliveryNote", label: "Примітка після таблиці", max: 300, rows: 2, default: "Перевірте товар у відділенні, перш ніж забрати його." },
        ],
      },
      {
        id: "payment",
        title: "Оплата",
        fields: [
          {
            kind: "list",
            key: "paymentMethods",
            label: "Способи оплати",
            itemName: "спосіб оплати",
            min: 1,
            max: 6,
            hint: "Це опис для покупців. Самі способи оплати під час оформлення замовлення звідси не змінюються.",
            fields: [
              { kind: "text", key: "title", label: "Назва", max: 40, default: "", required: true },
              { kind: "long", key: "text", label: "Пояснення", max: 300, rows: 2, default: "" },
            ],
            default: [
              { title: "При отриманні", text: "Накладений платіж: оплачуєте, коли забираєте посилку. Комісію перевізника за переказ сплачує покупець." },
              { title: "За реквізитами", text: "Після підтвердження замовлення надішлемо реквізити. Замовлення вважається підтвердженим, коли надійде оплата." },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "returns",
    title: "Обмін і повернення",
    summary: "Умови повернення, розбиті на розділи",
    href: "/info/warranty-services",
    group: "pages",
    sections: [
      {
        id: "sections",
        title: "Розділи сторінки",
        description: "Кожен розділ має заголовок і текст. Розділи можна додавати, прибирати й міняти місцями.",
        fields: [
          {
            kind: "list",
            key: "sections",
            label: "Розділи",
            itemName: "розділ",
            min: 1,
            max: 10,
            fields: [
              { kind: "text", key: "title", label: "Заголовок", max: 60, default: "", required: true },
              { kind: "rich", key: "text", label: "Текст", max: 2000, rows: 5, default: "", required: true },
            ],
            default: [
              {
                title: "14 днів на рішення",
                text: "Товар можна обміняти або повернути протягом 14 календарних днів, відповідно до Закону України «Про захист прав споживачів», якщо:\n\n- товар не був у використанні;\n- збережено його товарний вигляд та упаковку.",
              },
              {
                title: "Що повернути не можна",
                text: "Товари з переліку, затвердженого постановою Кабінету Міністрів №172 від 19.03.1994: зокрема білизну, косметику та речі, виготовлені на індивідуальне замовлення.",
              },
              {
                title: "Як оформити",
                text: "[Напишіть або зателефонуйте нам](/info/contacts) і назвіть номер замовлення. Узгодимо обмін або повернення.\n\nПовний текст умов є в [публічній оферті](/info/public-offer), розділи 8 і 9.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "footer",
    title: "Низ сайту (футер)",
    summary: "Синій блок унизу кожної сторінки: кілька слів про магазин",
    href: "/",
    group: "pages",
    sections: [
      {
        id: "about",
        title: "Про магазин",
        description: "Телефон, пошта й години роботи в цьому блоці беруться з «Контактів».",
        fields: [
          { kind: "long", key: "about", label: "Текст під логотипом", max: 200, rows: 3, default: "Одяг, взуття, речі для дому та продукти зі Скандинавії з доставкою по всій Україні." },
          { kind: "text", key: "tagline", label: "Підпис у нижньому рядку, праворуч", max: 40, default: "Скандинавія — Україна" },
        ],
      },
    ],
  },
  {
    key: "offer",
    title: "Публічна оферта",
    summary: "Договір із покупцем",
    href: "/info/public-offer",
    group: "documents",
    sections: [
      {
        id: "document",
        title: "Текст документа",
        description: "Юридичний текст. Змінюйте його лише тоді, коли знаєте, що саме має змінитися: на нього посилається сторінка «Обмін і повернення».",
        // The default is long and lives in ./legal.ts; server.ts and the editor fill it in.
        fields: [{ kind: "rich", key: "body", label: "Текст", max: 60_000, rows: 24, default: "", document: true, required: true }],
      },
    ],
  },
  {
    key: "privacy",
    title: "Політика конфіденційності",
    summary: "Як магазин поводиться з даними покупців",
    href: "/info/conf-policy",
    group: "documents",
    sections: [
      {
        id: "document",
        title: "Текст документа",
        description: "Юридичний текст про персональні дані покупців.",
        fields: [{ kind: "rich", key: "body", label: "Текст", max: 60_000, rows: 24, default: "", document: true, required: true }],
      },
    ],
  },
];

export const CONTENT_KEYS = CONTENT_PAGES.map((page) => page.key);

export function contentPage(key: string): ContentPage | undefined {
  return CONTENT_PAGES.find((page) => page.key === key);
}

function fieldsOf(page: ContentPage): ContentField[] {
  return page.sections.flatMap((section) => section.fields);
}

/** The text the site shows until the owner changes it. `extra` carries defaults too long for this file. */
export function defaultsFor(page: ContentPage, extra: ContentValues = {}): ContentValues {
  const values: ContentValues = {};
  for (const field of fieldsOf(page)) {
    values[field.key] = field.kind === "list" ? field.default.map((item) => ({ ...item })) : field.default;
  }
  return { ...values, ...extra };
}

const tidyLine = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const tidyBlock = (value: unknown) =>
  String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function cleanScalar(field: ItemField, raw: unknown, where: string, errors: Record<string, string>, checkRequired: boolean): string {
  if (field.kind === "target") {
    const value = String(raw ?? "");
    if (TARGET_SHAPE.test(value)) return value;
    if (checkRequired) errors[where] = "Виберіть, куди веде посилання.";
    return "";
  }
  if (field.kind === "choice") {
    const value = String(raw ?? "");
    return field.options.some((option) => option.value === value) ? value : field.default;
  }
  const value = field.kind === "text" ? tidyLine(raw) : tidyBlock(raw);
  if (value.length > field.max) errors[where] = `Задовгий текст: ${value.length} символів, а вміщується ${field.max}. Скоротіть його.`;
  else if (checkRequired && field.required && !value) errors[where] = "Це поле не може бути порожнім.";
  return value;
}

/**
 * Brings whatever arrived (from the editor or from the database) to the shape
 * of the page: unknown keys are dropped, texts tidied, numbers and lists kept
 * within their limits. With `strict` it also reports what the owner must fix;
 * `errors` is keyed like the editor's fields ("headline", "facts.2.title").
 * Without it (reading) a missing value falls back to the default.
 */
export function cleanContent(page: ContentPage, input: unknown, options: { strict: boolean; fallback?: ContentValues } = { strict: false }): { values: ContentValues; errors: Record<string, string> } {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fallback = options.fallback ?? defaultsFor(page);
  const errors: Record<string, string> = {};
  const values: ContentValues = {};

  for (const field of fieldsOf(page)) {
    const raw = source[field.key];
    const missing = raw === undefined || raw === null;
    if (missing && !options.strict) {
      values[field.key] = fallback[field.key];
      continue;
    }

    if (field.kind === "number") {
      const typed = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
      const number = typed === "" ? Number.NaN : Math.round(Number(typed));
      if (!Number.isFinite(number)) {
        errors[field.key] = "Вкажіть число.";
        values[field.key] = fallback[field.key];
      } else if (number < field.min || number > field.max) {
        errors[field.key] = `Вкажіть число від ${field.min} до ${field.max.toLocaleString("uk-UA")}.`;
        values[field.key] = Math.min(field.max, Math.max(field.min, number));
      } else {
        values[field.key] = number;
      }
    } else if (field.kind === "target") {
      const value = String(raw ?? "");
      values[field.key] = TARGET_SHAPE.test(value) ? value : (fallback[field.key] as string);
    } else if (field.kind === "list") {
      const rows = Array.isArray(raw) ? raw.slice(0, field.max) : [];
      const items = rows.map((row, index) => {
        const item: Record<string, string> = {};
        for (const sub of field.fields) item[sub.key] = cleanScalar(sub, (row as Record<string, unknown> | null)?.[sub.key], `${field.key}.${index}.${sub.key}`, errors, options.strict);
        return item;
      });
      if (Array.isArray(raw) && raw.length > field.max) errors[field.key] = `Не більше ${field.max}.`;
      if (items.length < field.min) {
        if (options.strict) errors[field.key] = `Потрібно щонайменше ${field.min}.`;
        else {
          values[field.key] = fallback[field.key];
          continue;
        }
      }
      values[field.key] = items;
    } else {
      values[field.key] = cleanScalar(field, raw, field.key, errors, options.strict);
    }
  }
  return { values, errors: options.strict ? errors : {} };
}

/** True when the two sets of values are the same text. */
export function sameContent(a: ContentValues, b: ContentValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

/** "3 000 ₴" */
export function amountLabel(amount: number): string {
  return `${money.format(amount).replace(/ /g, " ")} ₴`;
}

export function mentionsAmount(text: string): boolean {
  return text.includes(AMOUNT_TOKEN);
}

/**
 * Puts the free-delivery amount where the text asks for it. Returns an empty
 * string for a text that mentions the amount while free delivery is switched
 * off: such a line has nothing to say and is not shown.
 */
export function withAmount(text: string, freeDelivery: number): string {
  if (!mentionsAmount(text)) return text;
  return freeDelivery > 0 ? text.split(AMOUNT_TOKEN).join(amountLabel(freeDelivery)) : "";
}

/** Paragraphs of a plain multi-line text. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}
