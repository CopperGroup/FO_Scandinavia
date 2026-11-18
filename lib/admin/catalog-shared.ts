/**
 * Pure helpers shared by the catalog admin (products, categories, filter) on
 * both the server and the client. No database, no React.
 */

/** Placeholder documents that stand in for deleted products/categories in old orders. */
export const DELETED_PRODUCT_ID = "681a9c16b06f4e599d07371e";
export const DELETED_CATEGORY_ID = "681a9c9a90b4efb3dd18d1e5";

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** True for a 24-character hex string, i.e. something that is an id and never a name. */
export function isObjectIdLike(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID.test(value.trim());
}

/** A category name as it is stored: trimmed, inner whitespace collapsed. */
export function normalizeCategoryName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** The key two names are compared by (case-insensitive). */
export function categoryNameKey(value: unknown): string {
  return normalizeCategoryName(value).toLocaleLowerCase("uk-UA");
}

export const CATEGORY_NAME_MAX = 80;

/** Why a category name is not acceptable, or null when it is fine. */
export function categoryNameProblem(value: unknown): string | null {
  const name = normalizeCategoryName(value);
  if (!name) return "Вкажіть назву категорії.";
  if (name.length > CATEGORY_NAME_MAX) return `Назва задовга: не більше ${CATEGORY_NAME_MAX} символів.`;
  if (isObjectIdLike(name)) return "Назва схожа на службовий ідентифікатор. Введіть зрозумілу назву.";
  return null;
}

export type CategoryInput = {
  /** Ids of categories that exist. */
  ids: string[];
  /** Names of categories to find or create (already normalised and de-duplicated). */
  newNames: string[];
  /** Values that looked like ids of categories that no longer exist: dropped. */
  dropped: string[];
};

/**
 * Splits what a product form sends as its category list into ids of existing
 * categories and names of new ones.
 *
 * The bug this guards against: a product that still carried the id of a
 * deleted category sent that id back as an "unknown value", and the server
 * created a category NAMED after the id. Here an unknown value that looks like
 * an id is dropped, never turned into a name; names are trimmed, empty ones
 * ignored, and a name that matches an existing category (any letter case)
 * resolves to that category instead of creating a duplicate.
 */
export function splitCategoryInput(
  values: readonly unknown[],
  newNames: readonly unknown[],
  existing: readonly { id: string; name: string }[],
): CategoryInput {
  const known = new Set(existing.map((category) => category.id.toLowerCase()));
  const byName = new Map<string, string>();
  for (const category of existing) {
    const key = categoryNameKey(category.name);
    if (key && !byName.has(key)) byName.set(key, category.id);
  }

  const ids: string[] = [];
  const names: string[] = [];
  const nameKeys = new Set<string>();
  const dropped: string[] = [];

  const addId = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  const consider = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const value = raw.trim();
    if (!value) return;
    if (isObjectIdLike(value)) {
      const id = value.toLowerCase();
      if (known.has(id)) addId(id);
      else dropped.push(value);
      return;
    }
    if (categoryNameProblem(value)) return;
    const key = categoryNameKey(value);
    const existingId = byName.get(key);
    if (existingId) {
      addId(existingId);
      return;
    }
    if (!nameKeys.has(key)) {
      nameKeys.add(key);
      names.push(normalizeCategoryName(value));
    }
  };

  values.forEach(consider);
  newNames.forEach(consider);

  return { ids, newNames: names, dropped };
}

/* -------------------------------------------------------------------------- */
/*                                   Prices                                   */
/* -------------------------------------------------------------------------- */

/** Price after a percentage change, rounded to whole hryvnias and never negative. */
export function adjustPrice(price: number, percent: number, direction: "decrease" | "increase"): number {
  const base = Number.isFinite(price) ? price : 0;
  const factor = direction === "decrease" ? 1 - percent / 100 : 1 + percent / 100;
  return Math.max(0, Math.round(base * Math.max(0, factor)));
}

/** Whole-number discount in percent between a regular and a sale price (0 when there is none). */
export function discountPercent(price: number, priceToShow: number): number {
  if (!(price > 0) || !(priceToShow >= 0) || priceToShow >= price) return 0;
  return Math.round((1 - priceToShow / price) * 100);
}

/* -------------------------------------------------------------------------- */
/*                               Category tree                                */
/* -------------------------------------------------------------------------- */

export type TreeNode = { id: string; subCategories: string[] };

/** Parent of every category, read from the subCategories lists (first parent wins). */
export function parentsFromChildren(nodes: readonly TreeNode[]): Map<string, string | null> {
  const ids = new Set(nodes.map((node) => node.id));
  const parent = new Map<string, string | null>();
  for (const node of nodes) parent.set(node.id, null);
  for (const node of nodes) {
    for (const child of node.subCategories) {
      if (child !== node.id && ids.has(child) && parent.get(child) === null) parent.set(child, node.id);
    }
  }
  // Broken data can make a loop (A in B, B in A): cut it so every category stays reachable.
  for (const node of nodes) {
    const seen = new Set<string>([node.id]);
    let cursor = parent.get(node.id) ?? null;
    while (cursor !== null) {
      if (cursor === node.id) {
        parent.set(node.id, null);
        break;
      }
      if (seen.has(cursor)) break; // a loop further up: cut when its own member is visited
      seen.add(cursor);
      cursor = parent.get(cursor) ?? null;
    }
  }
  return parent;
}

/**
 * subCategories lists rebuilt from a parent map. Throws when the map has a
 * cycle or names a category that does not exist, so a bad save can never
 * make part of the tree unreachable.
 */
export function childrenFromParents(ids: readonly string[], parentOf: ReadonlyMap<string, string | null>): Map<string, string[]> {
  const known = new Set(ids);
  const children = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const id of ids) {
    const parent = parentOf.get(id) ?? null;
    if (parent === null) continue;
    if (!known.has(parent)) throw new Error(`Батьківської категорії ${parent} не існує`);
    // Walk up from the parent: meeting the category itself means a cycle.
    let cursor: string | null = parent;
    const seen = new Set<string>();
    while (cursor !== null) {
      if (cursor === id) throw new Error("Категорія не може бути вкладена сама в себе");
      if (seen.has(cursor)) break;
      seen.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }
    children.get(parent)!.push(id);
  }
  return children;
}

/* -------------------------------------------------------------------------- */
/*                                Filter params                               */
/* -------------------------------------------------------------------------- */

/** "select" or "unit-<unit>" as the storefront filter expects it, or null when the input is not usable. */
export function filterParamType(kind: string, unit?: string): string | null {
  if (kind === "select") return "select";
  if (kind === "unit") {
    const clean = (unit ?? "").trim();
    return clean && !clean.includes("-") ? `unit-${clean}` : null;
  }
  return null;
}

/** The opposite of filterParamType. */
export function parseFilterParamType(type: string | undefined | null): { kind: "select" | "unit" | ""; unit: string } {
  if (!type) return { kind: "", unit: "" };
  if (type.startsWith("unit-")) return { kind: "unit", unit: type.slice(5) };
  if (type === "select") return { kind: "select", unit: "" };
  return { kind: "", unit: "" };
}

/** Delays the storefront waits after a filter click, in ms, with labels. */
export const FILTER_DELAY_OPTIONS = [
  { value: 0, label: "Без затримки" },
  { value: 166, label: "0,17 с" },
  { value: 250, label: "0,25 с (типово)" },
  { value: 333, label: "0,33 с" },
  { value: 500, label: "0,5 с" },
  { value: 750, label: "0,75 с" },
  { value: 1000, label: "1 с" },
] as const;

/** A param is recommended for the filter when most products of the category have it. */
export function isRecommendedParam(paramProducts: number, categoryProducts: number): boolean {
  return categoryProducts > 0 && paramProducts >= categoryProducts / 1.4;
}

/* -------------------------------------------------------------------------- */
/*                                 Formatting                                 */
/* -------------------------------------------------------------------------- */

/** "товар", "товари", "товарів" for a count. */
export function pluralUk(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function productsWord(count: number): string {
  return pluralUk(count, "товар", "товари", "товарів");
}
