import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNavigation, classifyCategory, isJunkCategoryName } from "../departments";
import { parseCatalogQuery, runCatalogQuery } from "../query";
import { buildCatalogSnapshot } from "../snapshot";
import type { CatalogCategory, SourceProduct } from "../types";
import { buildVendorMap, vendorKey } from "../vendors";
import {
  activeFilterCount,
  catalogHref,
  flattenParams,
  parseSelectParams,
  serializeSelectParams,
  toggleInList,
  toggleSelectParam,
} from "../../storefront/catalog-url";

let counter = 0;
function product(overrides: Partial<SourceProduct> & { name: string }): SourceProduct {
  counter += 1;
  return {
    _id: `p${counter}`,
    id: `legacy-${counter}`,
    articleNumber: `ART${counter}`,
    images: [`https://img.test/${counter}.jpg`, `https://img.test/${counter}-b.jpg`],
    isAvailable: true,
    quantity: 3,
    url: "",
    price: 1000,
    priceToShow: 1000,
    vendor: "Ellos",
    category: ["c-tops"],
    params: [],
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    salesCount: 0,
    ...overrides,
  };
}

const categories: CatalogCategory[] = [
  { name: "Жіночі топи", categoryId: "c-tops", totalProducts: 0, subCategories: [] },
  { name: "Чоловічі гумові чоботи", categoryId: "c-boots", totalProducts: 0, subCategories: [] },
  { name: "Оселедець", categoryId: "c-fish", totalProducts: 0, subCategories: [] },
  { name: "Книги", categoryId: "c-books", totalProducts: 0, subCategories: [] },
  { name: "6a4230d286fbd1310ce992cd", categoryId: "c-junk", totalProducts: 0, subCategories: [] },
  { name: "Декор", categoryId: "c-empty", totalProducts: 0, subCategories: [] },
];

function snapshotOf(products: SourceProduct[]) {
  return buildCatalogSnapshot({ products, categories, filterSettings: {}, filterDelay: 0 });
}

describe("departments", () => {
  it("places categories by what their name says", () => {
    assert.deepEqual(classifyCategory("Жіночі топи"), [{ department: "women", group: "Одяг" }]);
    assert.deepEqual(classifyCategory("Труси чоловічі"), [{ department: "men", group: "Білизна та домашній одяг" }]);
    assert.deepEqual(classifyCategory("Оселедець"), [{ department: "food", group: "Риба та консерви" }]);
    assert.deepEqual(classifyCategory("Штори та фіранки"), [{ department: "home", group: "Текстиль" }]);
  });

  it("lists shoes both under their audience and under the shoe department", () => {
    assert.deepEqual(classifyCategory("Дитячі гумові чоботи"), [
      { department: "kids", group: "Взуття" },
      { department: "shoes", group: "Дитяче" },
    ]);
  });

  it("does not mistake home or food categories for clothing", () => {
    assert.deepEqual(classifyCategory("Постільна білизна"), [{ department: "home", group: "Текстиль" }]);
    assert.deepEqual(classifyCategory("Сиропи, топінги та концентрати"), [{ department: "food", group: "Кава, чай, напої" }]);
  });

  it("treats dresses as women's wear and unisex items as both", () => {
    assert.deepEqual(classifyCategory("Плаття, сарафани").map((placement) => placement.department), ["women"]);
    assert.deepEqual(classifyCategory("Рюкзаки").map((placement) => placement.department), ["women", "men"]);
  });

  it("recognises import leftovers", () => {
    assert.equal(isJunkCategoryName("6a4230d286fbd1310ce992cd"), true);
    assert.equal(isJunkCategoryName("Кава"), false);
    assert.deepEqual(classifyCategory("6a4230d286fbd1310ce992cd"), []);
  });

  it("builds the menu only from categories that have stock", () => {
    const snapshot = snapshotOf([
      product({ name: "Топ Ellos чорний", category: ["c-tops"] }),
      product({ name: "Чоботи Tretorn", category: ["c-boots"], vendor: "Tretorn" }),
      product({ name: "Книга шведської", category: ["c-books"], vendor: "Нова Думка" }),
      product({ name: "Щось без назви категорії", category: ["c-junk"] }),
    ]);
    const tree = buildNavigation(snapshot.categories, snapshot.listings);

    assert.deepEqual(tree.departments.map((department) => department.key), ["women", "men", "shoes"]);
    assert.equal(tree.departments[0].count, 1);
    assert.deepEqual(tree.other.map((category) => category.name), ["Книги"]);
    const everything = [...tree.departments.flatMap((department) => department.categoryIds), ...tree.other.map((category) => category.id)];
    assert.equal(everything.includes("c-junk"), false, "import leftovers stay out of the menu");
    assert.equal(everything.includes("c-empty"), false, "empty categories stay out of the menu");
  });
});

describe("brand spellings", () => {
  it("gives every spelling of a brand one identity", () => {
    assert.equal(vendorKey("Hennes&Mauritz"), vendorKey("H&M"));
    assert.equal(vendorKey("Henness & Mauritz"), vendorKey("H&M"));
    assert.equal(vendorKey("ELLOS"), vendorKey("Ellos"));
    assert.notEqual(vendorKey("Ellos"), vendorKey("ECCO"));
  });

  it("shows the alias label, or the most common spelling", () => {
    const map = buildVendorMap(["Hennes&Mauritz", "Henness&Mauritz", "ELLOS", "Ellos", "Ellos", "BJORN BORG", "Bjorn Borg"]);
    assert.equal(map.get("Hennes&Mauritz"), "H&M");
    assert.equal(map.get("Henness&Mauritz"), "H&M");
    assert.equal(map.get("ELLOS"), "Ellos");
    assert.equal(map.get("BJORN BORG"), "Bjorn Borg");
  });

  it("is applied to the catalog, so one brand is one filter option", () => {
    const snapshot = snapshotOf([
      product({ name: "Топ H&M білий", vendor: "Hennes&Mauritz" }),
      product({ name: "Легінси H&M чорні", vendor: "H&M" }),
      product({ name: "Шкарпетки H&M сірі", vendor: "Henness&Mauritz" }),
    ]);
    assert.deepEqual(Array.from(new Set(snapshot.listings.map((listing) => listing.vendor))), ["H&M"]);
    const result = runCatalogQuery(snapshot, parseCatalogQuery({ vendor: "H&M" }));
    assert.equal(result.total, 3);
  });
});

describe("size filter and sale filter", () => {
  const snapshot = snapshotOf([
    product({ name: "Топ Ellos синій S 7000001-S", articleNumber: "7000001-S" }),
    product({ name: "Топ Ellos синій M 7000001-M", articleNumber: "7000001-M" }),
    product({ name: "Топ Ellos синій L 7000001-L", articleNumber: "7000001-L", quantity: 0 }),
    product({ name: "Куртка Ellos зелена M 7000002-M", articleNumber: "7000002-M", price: 2000, priceToShow: 1500 }),
    product({ name: "Пряники ANNAS 300 г", articleNumber: "8000001", vendor: "ANNAS" }),
  ]);

  it("offers only sizes that are in stock, in wearing order", () => {
    const result = runCatalogQuery(snapshot, parseCatalogQuery({}));
    assert.deepEqual(result.facets.sizes, [
      { value: "S", count: 1 },
      { value: "M", count: 2 },
    ]);
  });

  it("finds items that have the size and opens that size", () => {
    const result = runCatalogQuery(snapshot, parseCatalogQuery({ size: "S" }));
    assert.equal(result.total, 1);
    assert.equal(result.items[0].targeted, true);
    const target = result.items[0].listing.variants.find((variant) => variant.id === result.items[0].targetId);
    assert.equal(target?.size, "S");
  });

  it("accepts several sizes at once", () => {
    assert.equal(runCatalogQuery(snapshot, parseCatalogQuery({ size: "S__M" })).total, 2);
  });

  it("does not single out a variant when nothing narrows the choice", () => {
    const top = runCatalogQuery(snapshot, parseCatalogQuery({ search: "топ" })).items[0];
    assert.equal(top.targeted, false);
  });

  it("keeps only discounted items when the sale filter is on", () => {
    const result = runCatalogQuery(snapshot, parseCatalogQuery({ sale: "1" }));
    assert.deepEqual(result.items.map((item) => item.listing.title).length, 1);
    assert.equal(result.items[0].listing.discountPercent, 25);
  });

  it("keeps a second photo for the card hover", () => {
    assert.ok(snapshot.listings.every((listing) => typeof listing.hoverImage === "string"));
  });
});

describe("catalog links", () => {
  it("changes one param, keeps the rest and returns to page 1", () => {
    assert.equal(
      catalogHref({ department: "women", page: "3", sort: "popular" }, { size: "M" }),
      "/catalog?department=women&sort=popular&size=M",
    );
  });

  it("removes a param given as null and drops defaults", () => {
    assert.equal(catalogHref({ department: "women", sale: "1", sort: "default" }, { sale: null }), "/catalog?department=women");
    assert.equal(catalogHref({ search: "топ" }, { search: null }), "/catalog");
  });

  it("keeps the page when the page itself is what changes", () => {
    assert.equal(catalogHref({ department: "men" }, { page: "2" }), "/catalog?department=men&page=2");
  });

  it("toggles list values", () => {
    assert.equal(toggleInList("S__M", "L", "__"), "S__M__L");
    assert.equal(toggleInList("S__M", "S", "__"), "M");
    assert.equal(toggleInList(undefined, "Ellos", ","), "Ellos");
  });

  it("round-trips select params, including values with commas", () => {
    const state = parseSelectParams("Колір--Чорний__Білий,Вага--19,3 г");
    assert.deepEqual(state, { Колір: ["Чорний", "Білий"], Вага: ["19,3 г"] });
    assert.equal(serializeSelectParams(state), "Колір--Чорний__Білий,Вага--19,3 г");
    assert.equal(toggleSelectParam("Колір--Чорний", "Колір", "Чорний"), "");
    assert.equal(toggleSelectParam("Колір--Чорний", "Сезон", "Літо"), "Колір--Чорний,Сезон--Літо");
  });

  it("counts applied filters, ignoring sorting, paging and scope", () => {
    const params = flattenParams({ department: "women", sort: "popular", page: "2", size: "S__M", vendor: "Ellos", sale: "1", minPrice: "100" });
    assert.equal(activeFilterCount(params), 5);
  });
});
