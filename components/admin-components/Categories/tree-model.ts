/**
 * Pure helpers for the category tree of the categories admin: building the
 * hierarchy, totals, search and filters, which rows are visible, where a
 * category may be dropped. No React, no database: used by the tree (client),
 * the page (server) and the unit tests.
 */

export type CategoryNode = {
  id: string
  name: string
  parentId: string | null
  /** Place among its siblings; roots are ordered by name. */
  position: number
  /** Products directly in this category. */
  products: number
  damaged?: boolean
}

export type TreeFilter = "all" | "with" | "empty"

export type VisibleRow = {
  node: CategoryNode
  depth: number
  hasChildren: boolean
  open: boolean
  /** Shown only because something inside it matches the search or the filter. */
  context: boolean
  posInSet: number
  setSize: number
  parentId: string | null
}

const collator = new Intl.Collator("uk-UA", { sensitivity: "base", numeric: true })

/** Lower case, one kind of apostrophe, single spaces: what the search compares. */
export function searchKey(text: string): string {
  return text
    .toLocaleLowerCase("uk-UA")
    .replace(/[’ʼ`]/g, "'")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .trim()
}

/** Roots by name, children in their saved order. */
export function sortNodes<T extends CategoryNode>(nodes: readonly T[]): T[] {
  return [...nodes].sort((a, b) => {
    if (!a.parentId && !b.parentId) return collator.compare(a.name, b.name)
    return a.position - b.position || collator.compare(a.name, b.name)
  })
}

/** parent id (null for the top level) → children in order. A parent that is not in the list makes its children top-level. */
export function childrenMap<T extends CategoryNode>(nodes: readonly T[]): Map<string | null, T[]> {
  const ids = new Set(nodes.map((node) => node.id))
  const map = new Map<string | null, T[]>()
  for (const node of nodes) {
    const parent = node.parentId && ids.has(node.parentId) && node.parentId !== node.id ? node.parentId : null
    const list = map.get(parent)
    if (list) list.push(node)
    else map.set(parent, [node])
  }
  return map
}

/** Products in a category plus all its subcategories (a product in two of them counts twice). */
export function subtreeTotals(nodes: readonly CategoryNode[]): Map<string, number> {
  const children = childrenMap(nodes)
  const totals = new Map<string, number>()
  const visit = (node: CategoryNode, trail: Set<string>): number => {
    const known = totals.get(node.id)
    if (known !== undefined) return known
    if (trail.has(node.id)) return 0
    trail.add(node.id)
    let sum = node.products
    for (const child of children.get(node.id) ?? []) sum += visit(child, trail)
    trail.delete(node.id)
    totals.set(node.id, sum)
    return sum
  }
  for (const node of nodes) visit(node, new Set())
  return totals
}

export function descendantIds(nodes: readonly CategoryNode[], id: string): Set<string> {
  const children = childrenMap(nodes)
  const result = new Set<string>()
  const stack = [id]
  while (stack.length) {
    const current = stack.pop()!
    for (const child of children.get(current) ?? []) {
      if (result.has(child.id) || child.id === id) continue
      result.add(child.id)
      stack.push(child.id)
    }
  }
  return result
}

/** Ancestors from the top level down to the direct parent. */
export function ancestorsOf<T extends CategoryNode>(nodes: readonly T[], id: string): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const chain: T[] = []
  const seen = new Set<string>([id])
  let cursor = byId.get(id)?.parentId ?? null
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const node = byId.get(cursor)
    if (!node) break
    chain.unshift(node)
    cursor = node.parentId
  }
  return chain
}

/**
 * May `dragId` be put under `targetId` (null = top level)? Not into itself,
 * not into its own subcategory, and not where it already is.
 */
export function canDrop(nodes: readonly CategoryNode[], dragId: string, targetId: string | null): boolean {
  const dragged = nodes.find((node) => node.id === dragId)
  if (!dragged) return false
  if (targetId === null) return dragged.parentId !== null
  if (targetId === dragId) return false
  if (!nodes.some((node) => node.id === targetId)) return false
  if (dragged.parentId === targetId) return false
  return !descendantIds(nodes, dragId).has(targetId)
}

/** The tree after moving a category under another one (last among its new siblings) or to the top level. */
export function applyMove<T extends CategoryNode>(nodes: readonly T[], id: string, parentId: string | null, index?: number): T[] {
  const siblings = nodes.filter((node) => node.parentId === parentId && node.id !== id)
  const at = parentId === null ? 0 : index === undefined ? siblings.length : Math.max(0, Math.min(index, siblings.length))
  const order = new Map<string, number>()
  if (parentId !== null) {
    const ordered = sortNodes(siblings)
    ordered.splice(at, 0, { id } as T)
    ordered.forEach((node, position) => order.set(node.id, position))
  }
  return sortNodes(
    nodes.map((node) => {
      if (node.id === id) return { ...node, parentId, position: parentId === null ? 0 : order.get(id)! }
      if (parentId !== null && order.has(node.id)) return { ...node, position: order.get(node.id)! }
      return node
    }),
  )
}

export function filterCounts(nodes: readonly CategoryNode[], totals = subtreeTotals(nodes)): Record<TreeFilter, number> {
  let empty = 0
  for (const node of nodes) if ((totals.get(node.id) ?? 0) === 0) empty++
  return { all: nodes.length, with: nodes.length - empty, empty }
}

/**
 * The rows the tree shows, in order. With a search or a filter, a category is
 * shown when it matches or something inside it does (then it is "context"),
 * and branches open by themselves, collapsed ones included.
 */
export function visibleRows({
  nodes,
  expanded,
  query = "",
  filter = "all",
  collapsedWhileNarrowed,
  totals = subtreeTotals(nodes),
}: {
  nodes: readonly CategoryNode[]
  expanded: ReadonlySet<string>
  query?: string
  filter?: TreeFilter
  /** Branches the admin closed by hand during a search. */
  collapsedWhileNarrowed?: ReadonlySet<string>
  totals?: Map<string, number>
}): VisibleRow[] {
  const children = childrenMap(nodes)
  const key = searchKey(query)
  const narrowed = Boolean(key) || filter !== "all"

  const selfMatch = (node: CategoryNode) => {
    if (key && !searchKey(node.name).includes(key)) return false
    const total = totals.get(node.id) ?? 0
    if (filter === "with") return total > 0
    if (filter === "empty") return total === 0
    return true
  }
  const subtree = new Map<string, boolean>()
  const anyMatch = (node: CategoryNode, trail: Set<string>): boolean => {
    const known = subtree.get(node.id)
    if (known !== undefined) return known
    if (trail.has(node.id)) return false
    trail.add(node.id)
    let result = selfMatch(node)
    for (const child of children.get(node.id) ?? []) if (anyMatch(child, trail)) result = true
    trail.delete(node.id)
    subtree.set(node.id, result)
    return result
  }

  const rows: VisibleRow[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null, depth: number) => {
    const kids = (children.get(parent) ?? []).filter((node) => !narrowed || anyMatch(node, new Set()))
    kids.forEach((node, index) => {
      if (seen.has(node.id)) return
      seen.add(node.id)
      const all = children.get(node.id) ?? []
      const shownKids = narrowed ? all.filter((child) => anyMatch(child, new Set())) : all
      const hasChildren = shownKids.length > 0
      const open = hasChildren && (narrowed ? !collapsedWhileNarrowed?.has(node.id) : expanded.has(node.id))
      rows.push({ node, depth, hasChildren, open, context: narrowed && !selfMatch(node), posInSet: index + 1, setSize: kids.length, parentId: parent })
      if (open) walk(node.id, depth + 1)
    })
  }
  walk(null, 0)
  return rows
}

/** Where the search text sits in a name, for highlighting: [before, match, after] or null. */
export function splitMatch(name: string, query: string): [string, string, string] | null {
  const key = searchKey(query)
  if (!key) return null
  // Compare on a copy with the same length: only letter case and apostrophes differ.
  const haystack = name.toLocaleLowerCase("uk-UA").replace(/[’ʼ`]/g, "'").replace(/ё/g, "е")
  const at = haystack.indexOf(key)
  if (at < 0) return null
  return [name.slice(0, at), name.slice(at, at + key.length), name.slice(at + key.length)]
}
