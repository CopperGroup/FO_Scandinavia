import type { DepartmentKey, NavDepartment } from "@/lib/catalog/departments";
import type { StoreNavigation } from "@/lib/storefront/navigation";

/**
 * "Where it leads" for blocks of the storefront the owner points somewhere
 * (the four tiles of the home page and the small links under their names).
 * The stored value is a short code:
 *
 *   all | sale | new | clothing | department:<key> | category:<id> | column:<department key>:<column name>
 *
 * A column is a column of a department in the menu ("Взуття" → "Жіноче"): its
 * categories together. resolveTarget() turns a tile's code into a link with
 * what the tile shows next to it; targetOptions() lists the codes the editor
 * offers, from the live catalog.
 */

const departmentHref = (key: DepartmentKey) => `/catalog?department=${key}`;
const categoryHref = (id: string, department?: DepartmentKey) => (department ? `/catalog?department=${department}&categories=${id}` : `/catalog?categories=${id}`);
const SALE_HREF = "/catalog?sale=1&sort=discount";
const NEW_HREF = "/catalog?sort=new";
const CLOTHING: DepartmentKey[] = ["women", "men", "kids"];

/** A small link as the owner sets it: its name and the code of where it leads. */
export type LinkItem = { label: string; target: string };

export type ResolvedLink = {
  label: string;
  href: string;
  /** Place of the link in the owner's list; absent on the links the shop puts there by itself. */
  index?: number;
};

export type ResolvedTarget = {
  href: string;
  /** Products behind the link; null when the number says nothing (the newest products). */
  count: number | null;
  /** A few narrower links to show under the title. */
  links: ResolvedLink[];
};

const columnCode = (department: NavDepartment, label: string) => `column:${department.key}:${label}`;

function findColumn(navigation: StoreNavigation, code: string) {
  const rest = code.slice("column:".length);
  const cut = rest.indexOf(":");
  if (cut < 0) return null;
  const department = navigation.departments.find((entry) => entry.key === rest.slice(0, cut));
  const group = department?.groups.find((entry) => entry.label === rest.slice(cut + 1));
  return department && group ? { department, group } : null;
}

const columnHref = (department: NavDepartment, group: NavDepartment["groups"][number]) =>
  `${departmentHref(department.key)}&categories=${group.categories.map((category) => category.id).join(",")}`;

function findCategory(navigation: StoreNavigation, id: string) {
  for (const department of navigation.departments) {
    for (const group of department.groups) {
      const category = group.categories.find((entry) => entry.id === id);
      if (category) return { category, department: department.key as DepartmentKey | undefined };
    }
  }
  const other = navigation.other.find((entry) => entry.id === id);
  return other ? { category: other, department: undefined } : null;
}

/**
 * The address a code leads to, or null when there is nothing there now: the
 * department is hidden, the category was deleted or sold out, the column was
 * renamed. A link to nothing is not shown.
 */
export function targetHref(navigation: StoreNavigation, target: string): string | null {
  if (target === "all") return "/catalog";
  if (target === "sale") return navigation.saleCount > 0 ? SALE_HREF : null;
  if (target === "new") return NEW_HREF;
  if (target === "clothing") {
    const first = CLOTHING.map((key) => navigation.departments.find((department) => department.key === key)).find(Boolean);
    return first ? departmentHref(first.key) : null;
  }
  if (target.startsWith("department:")) {
    const department = navigation.departments.find((entry) => entry.key === target.slice("department:".length));
    return department ? departmentHref(department.key) : null;
  }
  if (target.startsWith("category:")) {
    const id = target.slice("category:".length);
    const found = findCategory(navigation, id);
    return found ? categoryHref(id, found.department) : null;
  }
  if (target.startsWith("column:")) {
    const column = findColumn(navigation, target);
    return column ? columnHref(column.department, column.group) : null;
  }
  return null;
}

/**
 * The links the shop puts under a tile by itself while the owner has set none:
 * the three clothing departments, or the first columns of the department.
 */
export function autoLinkItems(navigation: StoreNavigation, target: string, limit = 3): LinkItem[] {
  if (target === "clothing") {
    return CLOTHING.map((key) => navigation.departments.find((department) => department.key === key))
      .filter((department): department is NavDepartment => Boolean(department))
      .map((department) => ({ label: department.label, target: `department:${department.key}` }));
  }
  if (target.startsWith("department:")) {
    const department = navigation.departments.find((entry) => entry.key === target.slice("department:".length));
    return department ? department.groups.slice(0, limit).map((group) => ({ label: group.label, target: columnCode(department, group.label) })) : [];
  }
  return [];
}

/**
 * A tile: where it leads, how many products are there and the small links
 * under its name. `custom` are the links the owner set; without them the shop
 * puts its own (autoLinkItems). A link whose place is gone is left out.
 */
export function resolveTarget(navigation: StoreNavigation, target: string, linkLimit = 3, custom: LinkItem[] = []): ResolvedTarget {
  const links: ResolvedLink[] =
    custom.length > 0
      ? custom.flatMap((item, index) => {
          const href = targetHref(navigation, item.target);
          return href && item.label ? [{ label: item.label, href, index }] : [];
        })
      : autoLinkItems(navigation, target, linkLimit).flatMap((item) => {
          const href = targetHref(navigation, item.target);
          return href ? [{ label: item.label, href }] : [];
        });
  const whole: ResolvedTarget = { href: "/catalog", count: navigation.totalCount, links: custom.length > 0 ? links : [] };

  if (target === "sale") return { href: SALE_HREF, count: navigation.saleCount, links };
  if (target === "new") return { href: NEW_HREF, count: null, links };
  if (target === "clothing") {
    const departments = CLOTHING.map((key) => navigation.departments.find((department) => department.key === key)).filter(Boolean) as NavDepartment[];
    if (departments.length === 0) return whole;
    return { href: departmentHref(departments[0].key), count: departments.reduce((sum, department) => sum + department.count, 0), links };
  }
  if (target.startsWith("department:")) {
    const department = navigation.departments.find((entry) => entry.key === target.slice("department:".length));
    return department ? { href: departmentHref(department.key), count: department.count, links } : whole;
  }
  if (target.startsWith("category:")) {
    const id = target.slice("category:".length);
    const found = findCategory(navigation, id);
    // A category that was deleted since: the tile falls back to the whole catalog rather than to an empty page.
    return found ? { href: categoryHref(id, found.department), count: found.category.count, links } : whole;
  }
  if (target.startsWith("column:")) {
    const column = findColumn(navigation, target);
    // A product can be in two categories of a column, so this is the sum of the categories, not an exact count.
    return column ? { href: columnHref(column.department, column.group), count: column.group.categories.reduce((sum, category) => sum + category.count, 0), links } : whole;
  }
  return { ...whole, links };
}

export type TargetOption = { value: string; label: string; hint?: string; group?: string };

const products = (count: number) => `товарів: ${count.toLocaleString("uk-UA")}`;

/**
 * Everything a tile can lead to, for the editor's searchable list. With
 * `columns` the list also offers the columns of the departments: the narrower
 * places the small links under a tile usually lead to.
 */
export function targetOptions(navigation: StoreNavigation, options: { columns?: boolean } = {}): TargetOption[] {
  const list: TargetOption[] = [
    { value: "clothing", label: "Одяг: жінкам, чоловікам і дітям", group: "Відділи" },
    ...navigation.departments.map((department) => ({ value: `department:${department.key}`, label: department.label, hint: products(department.count), group: "Відділи" })),
    { value: "sale", label: "Товари зі знижкою", hint: products(navigation.saleCount), group: "Добірки" },
    { value: "new", label: "Новинки", group: "Добірки" },
    { value: "all", label: "Увесь каталог", hint: products(navigation.totalCount), group: "Добірки" },
  ];
  if (options.columns) {
    for (const department of navigation.departments) {
      for (const group of department.groups) {
        list.push({
          value: columnCode(department, group.label),
          label: `${department.label}: ${group.label}`,
          hint: group.categories.map((category) => category.name).join(", "),
          group: "Колонки меню",
        });
      }
    }
  }
  const seen = new Set<string>();
  for (const department of navigation.departments) {
    for (const group of department.groups) {
      for (const category of group.categories) {
        if (seen.has(category.id)) continue;
        seen.add(category.id);
        list.push({ value: `category:${category.id}`, label: category.name, hint: products(category.count), group: `Категорії: ${department.label}` });
      }
    }
  }
  for (const category of navigation.other) {
    if (seen.has(category.id)) continue;
    seen.add(category.id);
    list.push({ value: `category:${category.id}`, label: category.name, hint: products(category.count), group: "Категорії: інше" });
  }
  return list;
}

/** For the editor: the links the shop would put under a tile by itself, for every place a tile can lead to. */
export function autoLinksByTarget(navigation: StoreNavigation, limit = 3): Record<string, LinkItem[]> {
  const result: Record<string, LinkItem[]> = {};
  for (const option of targetOptions(navigation)) {
    const items = autoLinkItems(navigation, option.value, limit).filter((item) => targetHref(navigation, item.target));
    if (items.length > 0) result[option.value] = items;
  }
  return result;
}
