import type { MenuConfig, MenuDepartment } from "@/lib/catalog/departments"

/**
 * The menu row of the shop as the owner edits it in the admin ("Меню"):
 * validation and the small helpers both the editor and the server need.
 * Pure: no database, no request.
 */

export const MENU_KEY = "menu"
export const MAX_DEPARTMENTS = 12
export const MAX_GROUPS = 8
export const MAX_GROUP_CATEGORIES = 200
export const LABEL_MAX = 28
export const TITLE_MAX = 70
export const GROUP_LABEL_MAX = 40
export const TEXT_MAX = 1200

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const OBJECT_ID = /^[0-9a-f]{24}$/i

/** Ukrainian to Latin for addresses (Cabinet of Ministers resolution 55 of 2010). */
const LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ю: "iu", я: "ia", ь: "", "’": "", "'": "",
  ё: "e", ы: "y", э: "e", ъ: "",
}
const INITIAL: Record<string, string> = { є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya" }

/** "Спорт і відпочинок" -> "sport-i-vidpochynok": what a department is called in an address. */
export function slugify(text: string): string {
  const words = text.toLocaleLowerCase("uk-UA").replace(/зг/g, "zgh").split(/[^\p{L}\p{N}’']+/u).filter(Boolean)
  const latin = words.map((word) =>
    Array.from(word)
      .map((letter, index) => (index === 0 && INITIAL[letter]) || (letter in LATIN ? LATIN[letter] : letter))
      .join("")
      .replace(/[^a-z0-9]/g, ""),
  )
  return latin.filter(Boolean).join("-").slice(0, 30).replace(/-+$/, "")
}

/** A key for a new department that no other department has. */
export function freeKey(label: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base = slugify(label) || "viddil"
  if (!used.has(base)) return base
  for (let index = 2; index < 100; index++) if (!used.has(`${base}-${index}`)) return `${base}-${index}`
  return `${base}-${Date.now().toString(36)}`
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "")
/** Text of a few paragraphs as it is stored: single spaces, at most one empty line in a row. */
export const pageText = (value: unknown, max = TEXT_MAX) => (typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "")

export type MenuErrors = Record<string, string>

/**
 * Brings whatever arrived to a valid menu. `strict` (saving) reports what is
 * wrong, by field; without it (reading what is stored) wrong parts are
 * dropped, so a damaged record can never take the menu down.
 * Error keys: `departments`, `departments.N.label`, `departments.N.groups`, `departments.N.groups.M.label`.
 */
export function cleanMenu(input: unknown, options: { strict: boolean; knownCategoryIds?: Set<string> } = { strict: false }): { menu: MenuConfig; errors: MenuErrors } {
  const errors: MenuErrors = {}
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  const rawDepartments = Array.isArray(source.departments) ? source.departments.slice(0, MAX_DEPARTMENTS) : []
  const known = options.knownCategoryIds

  const departments: MenuDepartment[] = []
  const keys = new Set<string>()
  rawDepartments.forEach((entry, index) => {
    const raw = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>
    const label = text(raw.label, LABEL_MAX)
    if (!label) {
      if (options.strict) errors[`departments.${index}.label`] = "Напишіть назву відділу: так він називатиметься в меню."
      else return
    }
    let key = typeof raw.key === "string" && KEY_PATTERN.test(raw.key) && raw.key.length <= 40 ? raw.key : ""
    if (!key || keys.has(key)) key = freeKey(label, keys)
    keys.add(key)

    const groups = (Array.isArray(raw.groups) ? raw.groups.slice(0, MAX_GROUPS) : [])
      .map((group, groupIndex) => {
        const rawGroup = (group && typeof group === "object" ? group : {}) as Record<string, unknown>
        const ids = Array.isArray(rawGroup.categoryIds) ? rawGroup.categoryIds : []
        const categoryIds = Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && OBJECT_ID.test(id)).map((id) => id.toLowerCase())))
          .filter((id) => !known || known.has(id))
          .slice(0, MAX_GROUP_CATEGORIES)
        const groupLabel = text(rawGroup.label, GROUP_LABEL_MAX)
        if (!groupLabel && categoryIds.length > 0 && options.strict) errors[`departments.${index}.groups.${groupIndex}.label`] = "Назвіть колонку: під цією назвою категорії стоять у меню."
        return { label: groupLabel, categoryIds }
      })
      // An untouched empty column is not an error, it is just not saved.
      .filter((group) => group.label || group.categoryIds.length > 0)

    if (options.strict && groups.every((group) => group.categoryIds.length === 0)) errors[`departments.${index}.groups`] = "Додайте у відділ хоча б одну категорію або видаліть відділ."

    departments.push({ key, label, title: text(raw.title, TITLE_MAX), text: pageText(raw.text), groups })
  })

  if (options.strict && departments.length === 0) errors.departments = "У меню має бути хоча б один відділ."

  return {
    menu: { departments, showNew: source.showNew !== false, showSale: source.showSale !== false },
    errors,
  }
}
