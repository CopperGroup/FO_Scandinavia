import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adjustPrice,
  categoryNameProblem,
  childrenFromParents,
  discountPercent,
  filterParamType,
  isObjectIdLike,
  isRecommendedParam,
  normalizeCategoryName,
  parentsFromChildren,
  parseFilterParamType,
  productsWord,
  splitCategoryInput,
} from "../catalog-shared";

const existing = [
  { id: "65f000000000000000000001", name: "Жіночий одяг" },
  { id: "65f000000000000000000002", name: "Сукні" },
];

describe("splitCategoryInput (the id-named category bug)", () => {
  it("keeps ids of existing categories", () => {
    const result = splitCategoryInput(["65f000000000000000000002"], [], existing);
    assert.deepEqual(result, { ids: ["65f000000000000000000002"], newNames: [], dropped: [] });
  });

  it("drops an unknown id instead of turning it into a category name", () => {
    const result = splitCategoryInput(["68650a739c40610d6ca6be22", "65f000000000000000000001"], [], existing);
    assert.deepEqual(result.ids, ["65f000000000000000000001"]);
    assert.deepEqual(result.newNames, []);
    assert.deepEqual(result.dropped, ["68650a739c40610d6ca6be22"]);
  });

  it("drops an id-looking value even when it arrives as a 'new category name'", () => {
    const result = splitCategoryInput([], ["68650A739C40610D6CA6BE22"], existing);
    assert.deepEqual(result.newNames, []);
    assert.equal(result.dropped.length, 1);
  });

  it("reuses an existing category case-insensitively and trims names", () => {
    const result = splitCategoryInput([], ["  жіночий   ОДЯГ "], existing);
    assert.deepEqual(result.ids, ["65f000000000000000000001"]);
    assert.deepEqual(result.newNames, []);
  });

  it("de-duplicates new names and ignores empty ones", () => {
    const result = splitCategoryInput(["Пальта", ""], ["пальта", "   ", "Шуби"], existing);
    assert.deepEqual(result.newNames, ["Пальта", "Шуби"]);
  });

  it("does not repeat an id", () => {
    const result = splitCategoryInput(["65f000000000000000000002", "65F000000000000000000002"], ["сукні"], existing);
    assert.deepEqual(result.ids, ["65f000000000000000000002"]);
  });
});

describe("category names", () => {
  it("normalises whitespace", () => assert.equal(normalizeCategoryName("  a   b "), "a b"));
  it("rejects empty and id-like names", () => {
    assert.ok(categoryNameProblem("  "));
    assert.ok(categoryNameProblem("68650a739c40610d6ca6be22"));
    assert.equal(categoryNameProblem("Сукні"), null);
  });
  it("recognises ObjectId strings", () => {
    assert.equal(isObjectIdLike("68650a739c40610d6ca6be22"), true);
    assert.equal(isObjectIdLike("No-category"), false);
    assert.equal(isObjectIdLike(undefined), false);
  });
});

describe("prices", () => {
  it("adjusts and rounds to whole hryvnias", () => {
    assert.equal(adjustPrice(999, 10, "decrease"), 899);
    assert.equal(adjustPrice(999, 10, "increase"), 1099);
    assert.equal(adjustPrice(100, 150, "decrease"), 0);
  });
  it("computes the discount percent", () => {
    assert.equal(discountPercent(1000, 750), 25);
    assert.equal(discountPercent(1000, 1000), 0);
    assert.equal(discountPercent(0, 0), 0);
  });
});

describe("category tree", () => {
  const nodes = [
    { id: "a", subCategories: ["b", "missing"] },
    { id: "b", subCategories: ["c"] },
    { id: "c", subCategories: [] },
    { id: "d", subCategories: ["b"] },
  ];

  it("reads parents from children; the first parent wins, unknown children are ignored", () => {
    const parents = parentsFromChildren(nodes);
    assert.equal(parents.get("a"), null);
    assert.equal(parents.get("b"), "a");
    assert.equal(parents.get("c"), "b");
    assert.equal(parents.has("missing"), false);
  });

  it("cuts a loop so every category stays reachable", () => {
    const parents = parentsFromChildren([
      { id: "x", subCategories: ["y"] },
      { id: "y", subCategories: ["x"] },
    ]);
    assert.ok(parents.get("x") === null || parents.get("y") === null);
  });

  it("rebuilds children and refuses cycles", () => {
    const children = childrenFromParents(["a", "b", "c"], new Map([["a", null], ["b", "a"], ["c", "a"]]));
    assert.deepEqual(children.get("a"), ["b", "c"]);
    assert.throws(() => childrenFromParents(["a", "b"], new Map([["a", "b"], ["b", "a"]])));
    assert.throws(() => childrenFromParents(["a"], new Map([["a", "zzz"]])));
  });
});

describe("filter params", () => {
  it("round-trips select and unit types", () => {
    assert.equal(filterParamType("select"), "select");
    assert.equal(filterParamType("unit", " см "), "unit-см");
    assert.equal(filterParamType("unit", ""), null);
    assert.deepEqual(parseFilterParamType("unit-кг"), { kind: "unit", unit: "кг" });
    assert.deepEqual(parseFilterParamType("select"), { kind: "select", unit: "" });
    assert.deepEqual(parseFilterParamType(""), { kind: "", unit: "" });
  });
  it("recommends params most products have", () => {
    assert.equal(isRecommendedParam(80, 100), true);
    assert.equal(isRecommendedParam(50, 100), false);
    assert.equal(isRecommendedParam(0, 0), false);
  });
});

describe("plural", () => {
  it("agrees with the count", () => {
    assert.equal(productsWord(1), "товар");
    assert.equal(productsWord(3), "товари");
    assert.equal(productsWord(11), "товарів");
    assert.equal(productsWord(21), "товар");
    assert.equal(productsWord(25), "товарів");
  });
});
