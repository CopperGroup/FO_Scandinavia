import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ancestorsOf,
  applyMove,
  canDrop,
  descendantIds,
  filterCounts,
  searchKey,
  sortNodes,
  splitMatch,
  subtreeTotals,
  visibleRows,
  type CategoryNode,
} from "../../../components/admin-components/Categories/tree-model";

// Жінкам ─┬─ Сукні ── Вечірні
//         └─ Светри
// Дітям (empty)
// Взуття
const tree: CategoryNode[] = sortNodes([
  { id: "w", name: "Жінкам", parentId: null, position: 0, products: 0 },
  { id: "d", name: "Сукні", parentId: "w", position: 0, products: 7 },
  { id: "e", name: "Вечірні", parentId: "d", position: 0, products: 2 },
  { id: "s", name: "Светри", parentId: "w", position: 1, products: 3 },
  { id: "k", name: "Дітям", parentId: null, position: 0, products: 0 },
  { id: "b", name: "Взуття", parentId: null, position: 0, products: 5 },
]);

const ids = (rows: { node: { id: string } }[]) => rows.map((row) => row.node.id);

describe("category tree model", () => {
  it("sorts roots by name and children by their saved order", () => {
    assert.deepEqual(
      sortNodes(tree).filter((node) => !node.parentId).map((node) => node.id),
      ["b", "k", "w"],
    );
  });

  it("adds up products of a branch", () => {
    const totals = subtreeTotals(tree);
    assert.equal(totals.get("w"), 12);
    assert.equal(totals.get("d"), 9);
    assert.equal(totals.get("k"), 0);
  });

  it("survives a cycle in broken data", () => {
    const broken: CategoryNode[] = [
      { id: "a", name: "A", parentId: "b", position: 0, products: 1 },
      { id: "b", name: "B", parentId: "a", position: 0, products: 1 },
    ];
    assert.doesNotThrow(() => subtreeTotals(broken));
    assert.doesNotThrow(() => visibleRows({ nodes: broken, expanded: new Set(["a", "b"]) }));
  });

  it("finds descendants and ancestors", () => {
    assert.deepEqual(Array.from(descendantIds(tree, "w")).sort(), ["d", "e", "s"]);
    assert.deepEqual(ancestorsOf(tree, "e").map((node) => node.id), ["w", "d"]);
    assert.deepEqual(ancestorsOf(tree, "w"), []);
  });

  it("refuses a drop into itself, its own branch or where it already is", () => {
    assert.equal(canDrop(tree, "w", "w"), false);
    assert.equal(canDrop(tree, "w", "e"), false);
    assert.equal(canDrop(tree, "d", "w"), false);
    assert.equal(canDrop(tree, "b", null), false);
    assert.equal(canDrop(tree, "d", null), true);
    assert.equal(canDrop(tree, "b", "d"), true);
    assert.equal(canDrop(tree, "missing", "d"), false);
  });

  it("moves a category to the end of its new parent and back to its old place", () => {
    const moved = applyMove(tree, "b", "w");
    assert.equal(moved.find((node) => node.id === "b")?.parentId, "w");
    const open = visibleRows({ nodes: moved, expanded: new Set(["w"]) });
    assert.deepEqual(ids(open), ["k", "w", "d", "s", "b"]);
    const back = applyMove(moved, "s", "w", 0);
    assert.deepEqual(ids(visibleRows({ nodes: back, expanded: new Set(["w"]) })), ["k", "w", "s", "d", "b"]);
    const top = applyMove(moved, "b", null);
    assert.deepEqual(ids(visibleRows({ nodes: top, expanded: new Set() })), ["b", "k", "w"]);
  });

  it("shows only open branches", () => {
    assert.deepEqual(ids(visibleRows({ nodes: tree, expanded: new Set() })), ["b", "k", "w"]);
    const rows = visibleRows({ nodes: tree, expanded: new Set(["w"]) });
    assert.deepEqual(ids(rows), ["b", "k", "w", "d", "s"]);
    const dress = rows.find((row) => row.node.id === "d")!;
    assert.equal(dress.depth, 1);
    assert.equal(dress.hasChildren, true);
    assert.equal(dress.open, false);
    assert.equal(dress.posInSet, 1);
    assert.equal(dress.setSize, 2);
  });

  it("searches inside closed branches and opens them", () => {
    const rows = visibleRows({ nodes: tree, expanded: new Set(), query: "ВЕЧ" });
    assert.deepEqual(ids(rows), ["w", "d", "e"]);
    assert.deepEqual(
      rows.map((row) => row.context),
      [true, true, false],
    );
    const closed = visibleRows({ nodes: tree, expanded: new Set(), query: "веч", collapsedWhileNarrowed: new Set(["d"]) });
    assert.deepEqual(ids(closed), ["w", "d"]);
  });

  it("filters by products with counts", () => {
    assert.deepEqual(filterCounts(tree), { all: 6, with: 5, empty: 1 });
    assert.deepEqual(ids(visibleRows({ nodes: tree, expanded: new Set(), filter: "empty" })), ["k"]);
    assert.deepEqual(ids(visibleRows({ nodes: tree, expanded: new Set(), filter: "with" })), ["b", "w", "d", "e", "s"]);
  });

  it("matches apostrophes and letter case", () => {
    assert.equal(searchKey("  Об’єкти  ДОМУ "), "об'єкти дому");
    assert.deepEqual(splitMatch("Об’єкти дому", "об'єк"), ["", "Об’єк", "ти дому"]);
    assert.equal(splitMatch("Сукні", "штани"), null);
  });
});
