import type { CatalogCategory, CatalogListing } from "./types";

/**
 * Storefront departments: the menu row of the shop.
 *
 * Categories in the database are a flat list ("Жіночі топи", "Оселедець", …).
 * Shoppers navigate by department first, so every category is listed in one
 * or more departments, in a group (a menu column) inside each of them.
 *
 * The menu is a MenuConfig. Until the owner edits it in the admin ("Меню"),
 * it is the automatic one: six departments with the categories put where
 * their names say (automaticMenu). Once saved, the menu is exactly what the
 * owner made; a category that is in no department is still sold and shows up
 * under "other", so nothing disappears from the shop.
 */

/** Built-in departments of the automatic menu. */
type BuiltInKey = "women" | "men" | "kids" | "shoes" | "home" | "food";

/** Key of a department: the built-in ones, or one the owner added (latin letters, digits, hyphens). It is the "department" value in catalog addresses. */
export type DepartmentKey = string;

export const DEPARTMENT_ORDER: BuiltInKey[] = ["women", "men", "kids", "shoes", "home", "food"];

export const DEPARTMENT_LABELS: Record<BuiltInKey, string> = {
  women: "Жінкам",
  men: "Чоловікам",
  kids: "Дітям",
  shoes: "Взуття",
  home: "Дім",
  food: "Продукти",
};

/** Longer names for page headings. */
export const DEPARTMENT_TITLES: Record<BuiltInKey, string> = {
  women: "Жінкам",
  men: "Чоловікам",
  kids: "Дітям",
  shoes: "Взуття",
  home: "Все для дому",
  food: "Продукти зі Скандинавії",
};

export type Placement = { department: BuiltInKey; group: string };

type Audience = "women" | "men" | "kids";
type Kind = "shoes" | "underwear" | "accessories" | "clothing" | "textile" | "decor" | "sweets" | "fish" | "drinks" | "grocery";

const AUDIENCE: [Audience, RegExp][] = [
  ["kids", /дит|дівчат|хлопч|малюк|підлітк/],
  ["women", /жін/],
  ["men", /чолов/],
];

/** Garments that are women's wear even when the category name does not say so. */
const IMPLICITLY_WOMEN = /плать|плаття|сарафан|спідниц|блуз|тунік|легінс|бюстгальт/;

// Order matters: the first kind whose pattern matches wins. Home and food come
// before clothing so "Постільна білизна" is not underwear and "Сиропи, топінги" is not tops.
const KINDS: [Kind, RegExp][] = [
  ["shoes", /взутт|чобот|черевик|капц|туфл|кросівк|сандал|босоніж|кеди|мокасин/],
  ["textile", /штор|фіранк|постільн|текстиль|наволоч|рушник|килим|ковдр|подуш|плед|скатерт|простирад/],
  ["decor", /декор|освітленн|посуд|свічк|ваз|кухн/],
  ["drinks", /кава|кави|чай|вода|напо|сироп|сік|соки|какао/],
  ["sweets", /печив|шоколад|цукер|драже|льодяник|торт|варенн|джем|снек|сухофр|солод|мармелад|жуйк|топінг/],
  ["fish", /риб|ікр|оселед|паштет|раки|кревет|консерв|тунець|лосос/],
  ["grocery", /соус|спец|сир|масл|круп|макарон|борошн|хліб|горіх/],
  ["underwear", /трус|білизн|шкарпет|домашній одяг|піжам|колгот|халат/],
  ["accessories", /аксесуар|рюкзак|сумк|шапк|шарф|рукавич|ремен|гаман/],
  ["clothing", /плать|плаття|сарафан|светр|кардиган|дощовик|легінс|топ|шорт|жакет|тунік|штан|джинс|брюк|футболк|майк|сороч|блуз|спідниц|одяг|куртк|пальт|костюм|худі/],
];

const CLOTHING_GROUPS: Record<"clothing" | "underwear" | "shoes" | "accessories", string> = {
  clothing: "Одяг",
  underwear: "Білизна та домашній одяг",
  shoes: "Взуття",
  accessories: "Аксесуари",
};

const SHOE_GROUPS: Record<Audience, string> = { women: "Жіноче", men: "Чоловіче", kids: "Дитяче" };

const FOOD_GROUPS: Record<"sweets" | "fish" | "drinks" | "grocery", string> = {
  sweets: "Солодощі та снеки",
  fish: "Риба та консерви",
  drinks: "Кава, чай, напої",
  grocery: "Бакалія",
};

/** Menu columns in display order, per department. */
const GROUP_ORDER: Record<BuiltInKey, string[]> = {
  women: ["Одяг", "Білизна та домашній одяг", "Взуття", "Аксесуари"],
  men: ["Одяг", "Білизна та домашній одяг", "Взуття", "Аксесуари"],
  kids: ["Одяг", "Білизна та домашній одяг", "Взуття", "Аксесуари"],
  shoes: ["Жіноче", "Чоловіче", "Дитяче"],
  home: ["Текстиль", "Декор і посуд"],
  food: ["Солодощі та снеки", "Риба та консерви", "Кава, чай, напої", "Бакалія"],
};

/** Imports sometimes leave a category whose "name" is a database id. */
export function isJunkCategoryName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length === 0 || /^[0-9a-f]{24}$/i.test(trimmed);
}

/** Where a category belongs. Empty when the name matches no department. */
export function classifyCategory(name: string): Placement[] {
  if (isJunkCategoryName(name)) return [];
  const text = name.toLowerCase();

  const kind = KINDS.find(([, pattern]) => pattern.test(text))?.[0];
  if (!kind) return [];

  if (kind === "textile") return [{ department: "home", group: "Текстиль" }];
  if (kind === "decor") return [{ department: "home", group: "Декор і посуд" }];
  if (kind === "sweets" || kind === "fish" || kind === "drinks" || kind === "grocery") {
    return [{ department: "food", group: FOOD_GROUPS[kind] }];
  }

  const named = AUDIENCE.find(([, pattern]) => pattern.test(text))?.[0];
  const audiences: Audience[] = named ? [named] : IMPLICITLY_WOMEN.test(text) ? ["women"] : ["women", "men"];

  const placements: Placement[] = audiences.map((audience) => ({ department: audience, group: CLOTHING_GROUPS[kind] }));
  if (kind === "shoes") {
    for (const audience of audiences) placements.push({ department: "shoes", group: SHOE_GROUPS[audience] });
  }
  return placements;
}

/* -------------------------------------------------------------------------- */
/*                               Navigation tree                              */
/* -------------------------------------------------------------------------- */

export type NavCategory = {
  id: string;
  name: string;
  /** Catalog cards in stock. */
  count: number;
  /** Photo of the best-selling item, used for category thumbnails. */
  image: string | null;
  /** A few sentences shown on the page of the category, written by the owner. */
  text: string;
};

export type NavGroup = { label: string; categories: NavCategory[] };

export type NavDepartment = {
  key: DepartmentKey;
  label: string;
  title: string;
  /** A few sentences shown on the page of the department, written by the owner. */
  text: string;
  categoryIds: string[];
  count: number;
  groups: NavGroup[];
};

export type NavigationTree = {
  departments: NavDepartment[];
  /** Categories with stock that are in no department. */
  other: NavCategory[];
  /** Whether the menu shows "Новинки" and "Знижки". */
  showNew: boolean;
  showSale: boolean;
};

/* -------------------------------------------------------------------------- */
/*                              Menu configuration                            */
/* -------------------------------------------------------------------------- */

export type MenuGroup = { label: string; categoryIds: string[] };

export type MenuDepartment = {
  key: DepartmentKey;
  /** Name in the menu row. */
  label: string;
  /** Heading of the department page; the label when empty. */
  title: string;
  text: string;
  groups: MenuGroup[];
};

export type MenuConfig = { departments: MenuDepartment[]; showNew: boolean; showSale: boolean };

/** The menu nobody edited: every category where its name puts it. */
export function automaticMenu(categories: Pick<CatalogCategory, "categoryId" | "name">[]): MenuConfig {
  const byDepartment = new Map<BuiltInKey, Map<string, string[]>>();
  for (const category of categories) {
    for (const { department, group } of classifyCategory(category.name)) {
      const groups = byDepartment.get(department) ?? new Map<string, string[]>();
      byDepartment.set(department, groups);
      groups.set(group, [...(groups.get(group) ?? []), category.categoryId]);
    }
  }
  const departments: MenuDepartment[] = [];
  for (const key of DEPARTMENT_ORDER) {
    const groups = byDepartment.get(key);
    if (!groups) continue;
    departments.push({
      key,
      label: DEPARTMENT_LABELS[key],
      title: DEPARTMENT_TITLES[key],
      text: "",
      groups: GROUP_ORDER[key].filter((label) => groups.has(label)).map((label) => ({ label, categoryIds: groups.get(label) as string[] })),
    });
  }
  return { departments, showNew: true, showSale: true };
}

/**
 * Builds the department menu from the categories that currently have stock.
 * Empty categories and import leftovers never reach the menu. `menu` is the
 * one the owner saved; without it the automatic menu is used.
 */
export function buildNavigation(categories: CatalogCategory[], listings: CatalogListing[], menu?: MenuConfig | null): NavigationTree {
  const config = menu ?? automaticMenu(categories);
  const counts = new Map<string, number>();
  const lead = new Map<string, CatalogListing>();
  for (const listing of listings) {
    for (const id of listing.category) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      const current = lead.get(id);
      if (listing.image && (!current || listing.salesCount > current.salesCount)) lead.set(id, listing);
    }
  }

  // The categories that can be shown: in stock and with a real name.
  const nodes = new Map<string, NavCategory>();
  for (const category of categories) {
    const count = counts.get(category.categoryId) ?? 0;
    if (count === 0 || isJunkCategoryName(category.name)) continue;
    nodes.set(category.categoryId, { id: category.categoryId, name: category.name.trim(), count, image: lead.get(category.categoryId)?.image ?? null, text: category.text ?? "" });
  }

  const byCount = (a: NavCategory, b: NavCategory) => b.count - a.count || a.name.localeCompare(b.name, "uk");
  const placed = new Set<string>();

  const departments: NavDepartment[] = [];
  for (const entry of config.departments) {
    const groups: NavGroup[] = [];
    for (const group of entry.groups) {
      group.categoryIds.forEach((id) => placed.add(id));
      const shown = Array.from(new Set(group.categoryIds)).map((id) => nodes.get(id)).filter((node): node is NavCategory => Boolean(node));
      if (shown.length > 0) groups.push({ label: group.label, categories: shown.sort(byCount) });
    }
    // A department whose categories are all out of stock is not in the menu until something arrives.
    if (groups.length === 0) continue;

    const categoryIds = Array.from(new Set(groups.flatMap((group) => group.categories.map((category) => category.id))));
    const idSet = new Set(categoryIds);
    const count = listings.reduce((sum, listing) => sum + (listing.category.some((id) => idSet.has(id)) ? 1 : 0), 0);
    departments.push({ key: entry.key, label: entry.label, title: entry.title || entry.label, text: entry.text, categoryIds, count, groups });
  }

  const other: NavCategory[] = [];
  const seenNames = new Set<string>();
  nodes.forEach((node) => {
    if (placed.has(node.id) || seenNames.has(node.name)) return;
    seenNames.add(node.name);
    other.push(node);
  });

  return { departments, other: other.sort(byCount), showNew: config.showNew, showSale: config.showSale };
}
