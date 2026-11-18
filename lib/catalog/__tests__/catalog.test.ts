import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { modelStemOf, parseArticle } from "../article";
import { compareSizes, normalizeColor, normalizeSize, parseSizeToken } from "../attributes";
import { parseCatalogQuery, runCatalogQuery } from "../query";
import { buildCatalogSnapshot } from "../snapshot";
import { stripArticle } from "../title";
import type { CatalogSnapshot, ProductParam, SourceProduct } from "../types";
import { buildVariantIndex, getProductVariants, groupProducts } from "../variants";

/* -------------------------------- fixtures -------------------------------- */

let sequence = 0;

function product(
  articleNumber: string,
  name: string,
  overrides: Partial<SourceProduct> & { size?: string; color?: string } = {},
): SourceProduct {
  sequence += 1;
  const { size, color, ...rest } = overrides;
  const params: ProductParam[] = [...(rest.params ?? [])];
  if (size) params.push({ name: "Розмір", value: size });
  if (color) params.push({ name: "Колір", value: color });

  return {
    _id: `p${String(sequence).padStart(4, "0")}`,
    id: String(10000 + sequence),
    name,
    articleNumber,
    images: [`https://img.test/${articleNumber}.jpg`],
    isAvailable: true,
    quantity: 10,
    url: "",
    price: 1000,
    priceToShow: 1000,
    vendor: "Vendor",
    category: ["cat-clothes"],
    description: "<p>Опис товару</p>",
    createdAt: "2026-01-01T00:00:00.000Z",
    salesCount: 0,
    ...rest,
    params,
  };
}

/** The reported case: sizes only in the name and article number, no params at all. */
function sportTop(colorCode = "001", colorWord = "коричневий"): SourceProduct[] {
  return ["XS", "S", "M", "L", "XL", "XXL"].map((size) =>
    product(`1354663${colorCode}-${size}`, `Топ спортивний Henness&Mauritz ${size} ${colorWord} 1354663${colorCode}-${size}`),
  );
}

function variantsOf(products: SourceProduct[], articleNumber: string) {
  const { groups } = groupProducts(products);
  const index = buildVariantIndex(groups);
  const target = products.find((item) => item.articleNumber === articleNumber);
  assert.ok(target, `fixture ${articleNumber} exists`);
  const variants = getProductVariants(index, target._id);
  assert.ok(variants, "product is known to the variant index");
  return variants;
}

function snapshotOf(products: SourceProduct[]): CatalogSnapshot {
  return buildCatalogSnapshot({
    products,
    categories: [
      { name: "Одяг", categoryId: "cat-clothes", totalProducts: products.length, subCategories: [] },
      { name: "Взуття", categoryId: "cat-shoes", totalProducts: 0, subCategories: [] },
    ],
    filterSettings: {
      "cat-clothes": { totalProducts: products.length, params: { Розмір: { totalProducts: 1, type: "select" } } },
    },
    filterDelay: 250,
    now: new Date("2026-06-01T00:00:00.000Z"),
  });
}

/* --------------------------------- sizes --------------------------------- */

describe("size parsing", () => {
  it("recognises letter, numeric, range, bra and dimension sizes", () => {
    assert.equal(parseSizeToken("XS")?.cls, "alpha");
    assert.equal(parseSizeToken("3XL")?.cls, "alpha");
    assert.equal(parseSizeToken("42")?.cls, "numeric");
    assert.equal(parseSizeToken("34/36")?.cls, "numeric");
    assert.equal(parseSizeToken("85B")?.cls, "bra");
    assert.equal(parseSizeToken("140x300см")?.cls, "dimension");
    assert.equal(parseSizeToken("ONESIZE")?.cls, "onesize");
  });

  it("rejects colour codes and other non-sizes", () => {
    assert.equal(parseSizeToken("04"), null, "leading zero is a colour code");
    assert.equal(parseSizeToken("0168"), null);
    assert.equal(parseSizeToken("3117"), null);
    assert.equal(parseSizeToken("white"), null);
    assert.equal(parseSizeToken("0r"), null);
  });

  it("treats Cyrillic lookalike letters as their Latin twins", () => {
    assert.equal(normalizeSize("М")?.key, "M");
    assert.equal(normalizeSize("ХL")?.key, "XL");
    assert.equal(normalizeSize("85С")?.key, "85C");
    assert.equal(normalizeSize("140х300")?.key, "140x300");
  });

  it("keeps 2XL and XXL distinct but adjacent", () => {
    const xxl = normalizeSize("XXL");
    const twoXl = normalizeSize("2XL");
    assert.notEqual(xxl?.key, twoXl?.key);
    assert.ok(compareSizes(normalizeSize("XL"), twoXl) < 0);
    assert.ok(compareSizes(twoXl, normalizeSize("3XL")) < 0);
  });

  it("orders sizes the way a shopper expects", () => {
    const sorted = ["XL", "S", "XXS", "M", "3XL", "L", "XS"].map((value) => normalizeSize(value)).sort(compareSizes);
    assert.deepEqual(sorted.map((size) => size?.label), ["XXS", "XS", "S", "M", "L", "XL", "3XL"]);

    const numeric = ["42/44", "34/36", "38/40"].map((value) => normalizeSize(value)).sort(compareSizes);
    assert.deepEqual(numeric.map((size) => size?.label), ["34/36", "38/40", "42/44"]);
  });

  it("pulls the size out of descriptive values and ignores placeholders", () => {
    assert.equal(normalizeSize("зріст моделі 185 , розмір XL")?.key, "XL");
    assert.equal(normalizeSize("Не вказано"), null);
  });
});

describe("colour normalisation", () => {
  it("merges case variants and resolves swatches", () => {
    assert.equal(normalizeColor("Чорний")?.key, normalizeColor("чорний")?.key);
    assert.deepEqual(normalizeColor("темно-синій")?.swatch, ["#1e2a52"]);
    assert.equal(normalizeColor("Чорний/білий/рожевий")?.swatch.length, 3);
    assert.equal(normalizeColor("бежева_смугаста")?.label, "Бежева смугаста");
  });
});

/* -------------------------------- articles -------------------------------- */

describe("article numbers", () => {
  it("splits base + size", () => {
    const parsed = parseArticle("1354663001-XS");
    assert.equal(parsed.stem, "1354663001");
    assert.equal(parsed.size?.key, "XS");
  });

  it("splits model + colour + size", () => {
    assert.equal(parseArticle("1518326-18-44").stem, "1518326-18");
    assert.equal(parseArticle("619494-0168r-34/36").stem, "619494-0168r");
    assert.equal(parseArticle("619494-0168r-34/36").size?.key, "34/36");
  });

  it("keeps the audience marker out of the size", () => {
    const parsed = parseArticle("475563089-XXS-m");
    assert.equal(parsed.stem, "475563089");
    assert.equal(parsed.size?.key, "XXS");
    assert.equal(parsed.marker, "m");
  });

  it("leaves plain SKUs alone", () => {
    for (const article of ["gille_saffran_300", "70-3117", "1504301-59r", "ref.23000032", "1518326-04"]) {
      assert.equal(parseArticle(article).size, null, article);
      assert.equal(parseArticle(article).stem, article);
    }
  });

  it("derives the model that colour variants share", () => {
    assert.equal(modelStemOf("1518326-18"), "1518326");
    assert.equal(modelStemOf("1354663001"), "1354663");
    assert.equal(modelStemOf("8537278_white"), "8537278");
    assert.equal(modelStemOf("gille_saffran_300"), null);
    assert.equal(modelStemOf("70-3117"), null);
  });

  it("strips the article number from names without regex injection", () => {
    assert.equal(
      stripArticle("Кеди H&M 35 сірі (70-3117)", parseArticle("70-3117")),
      "Кеди H&M 35 сірі",
    );
    assert.equal(
      stripArticle("Джинси Mango синій ref.23000032", parseArticle("ref.23000032")),
      "Джинси Mango синій",
    );
    // Special characters in an article number must not break the pattern.
    assert.equal(stripArticle("Товар A+B(1) ab+c(1)", parseArticle("ab+c(1)")), "Товар A+B(1)");
  });
});

/* -------------------------------- grouping -------------------------------- */

describe("variant grouping", () => {
  it("groups sizes that exist only in the name and article number (reported bug)", () => {
    const products = sportTop();
    const { groups } = groupProducts(products);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].members.length, 6);
    assert.deepEqual(groups[0].axes.map((axis) => axis.key), ["size"]);
    assert.equal(groups[0].title, "Топ спортивний Henness&Mauritz коричневий");

    const variants = variantsOf(products, "1354663001-M");
    assert.deepEqual(variants.axes[0].options.map((option) => option.label), ["XS", "S", "M", "L", "XL", "XXL"]);
    assert.deepEqual(variants.axes[0].options.filter((option) => option.selected).map((option) => option.label), ["M"]);
  });

  it("never loses a product: every member is reachable through an option", () => {
    const products = [
      ...sportTop(),
      ...sportTop("006", "білий"),
      product("gille_saffran_300", "Печиво шафранове Gille, 300 г gille_saffran_300"),
      product("", "Товар без артикулу"),
      product("", "Ще один без артикулу"),
    ];
    const { groups } = groupProducts(products);
    const index = buildVariantIndex(groups);

    assert.equal(groups.reduce((sum, group) => sum + group.members.length, 0), products.length);

    for (const group of groups) {
      const primaries = group.members.filter((member) => !member.duplicateOf);
      if (primaries.length < 2) continue;
      const reachable = new Set(
        getProductVariants(index, primaries[0].id)?.axes.flatMap((axis) => axis.options.map((option) => option.productId)),
      );
      for (const member of primaries) assert.ok(reachable.has(member.id), `${member.articleNumber} is reachable`);
    }
  });

  it("requires a bare numeric suffix to be confirmed before treating it as a size", () => {
    // "-18" is a colour code here: the name never mentions 18 and there is no size param.
    const { groups } = groupProducts([
      product("1518326-18", "Чоботи Tretorn Коричневий 1518326-18"),
      product("1518326-19", "Чоботи Tretorn Зелений 1518326-19"),
    ]);
    assert.equal(groups.length, 2);
  });

  it("accepts a numeric suffix confirmed by the name or the size param", () => {
    const byName = groupProducts([
      product("472954028-41", "Чоботи Tretorn 41 Гірчичний 472954028-41"),
      product("472954028-42", "Чоботи Tretorn 42 Гірчичний 472954028-42"),
    ]);
    assert.equal(byName.groups.length, 1);

    const byParam = groupProducts([
      product("5643694733r-38", "Жіночі балетки ECCO Чорний", { size: "38" }),
      product("5643694733r-39", "Жіночі балетки ECCO Чорний", { size: "39" }),
    ]);
    assert.equal(byParam.groups.length, 1);
  });

  it("groups a SKU whose article number lacks the size suffix with its family", () => {
    const products = [
      product("1129809018", "Труси чоловічі Hennes&Mauritz сині XS 1129809018", { size: "XS" }),
      product("1129809018-S", "Труси чоловічі Hennes&Mauritz сині S 1129809018-S", { size: "S" }),
      product("1129809018-M", "Труси чоловічі Hennes&Mauritz сині M 1129809018-M", { size: "M" }),
    ];
    assert.deepEqual(variantsOf(products, "1129809018").axes[0].options.map((option) => option.label), ["XS", "S", "M"]);
  });

  it("recovers a size that is only visible in the name of one family member", () => {
    const products = [
      product("473428011", "Чоботи Tretorn 25 чорний"),
      product("473428011-24", "Чоботи Tretorn 24 чорний 473428011-24"),
      product("473428011-26", "Чоботи Tretorn 26 чорний 473428011-26"),
    ];
    const variants = variantsOf(products, "473428011");
    assert.equal(variants.axes[0].key, "size");
    assert.deepEqual(variants.axes[0].options.map((option) => option.label), ["24", "25", "26"]);
  });

  it("uses the fuller size from the param when the article number abbreviates it", () => {
    const products = [
      product("615352-0001-34", "Штани Cellbes 34/36 Чорний 615352-0001-34/36", { size: "34/36", color: "Чорний" }),
      product("615352-0001-38", "Штани Cellbes 38/40 Чорний 615352-0001-38/40", { size: "38/40", color: "Чорний" }),
    ];
    const variants = variantsOf(products, "615352-0001-34");
    assert.equal(variants.title, "Штани Cellbes Чорний");
    assert.deepEqual(variants.axes[0].options.map((option) => option.label), ["34/36", "38/40"]);
  });

  it("folds size-coded article numbers into one item when only the size differs", () => {
    const products = [
      product("1716681-03-160", "Штори Jotex 140x160 см зелений 1716681-03-160", { size: "140х160", color: "зелений" }),
      product("1716681-03-220", "Штори Jotex 140x220 см зелений 1716681-03-220"),
      product("1716681-03-250", "Штори Jotex 140x250 см зелений 1716681-03-250"),
    ];
    const { groups } = groupProducts(products);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].title, "Штори Jotex зелений");
    assert.deepEqual(
      variantsOf(products, "1716681-03-220").axes[0].options.map((option) => option.label),
      ["140×160 см", "140×220 см", "140×250 см"],
    );
  });

  it("does not fold colour variants that merely share a model", () => {
    const { groups } = groupProducts([
      product("1504301-59r", "Постільна білизна ZACK зелений 1504301-59r", { color: "зелений" }),
      product("1504301-60r", "Постільна білизна ZACK синя 1504301-60r", { color: "синій" }),
    ]);
    assert.equal(groups.length, 2);
  });

  it("collapses a SKU imported twice into one option", () => {
    const products = [
      product("1255283009-XS", "Легінси H&M XS беж 1255283009-XS", { size: "XS" }),
      product("1255283009-XS", "Легінси H&M XS беж 1255283009-XS", { size: "XS" }),
      product("1255283009-S", "Легінси H&M S беж 1255283009-S", { size: "S" }),
    ];
    const { groups } = groupProducts(products);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].members.filter((member) => member.duplicateOf).length, 1);

    // Both copies show the same two options, and each sees its own size selected.
    for (const copy of products.slice(0, 2)) {
      const index = buildVariantIndex(groups);
      const variants = getProductVariants(index, copy._id);
      assert.deepEqual(variants?.axes[0].options.map((option) => option.label), ["XS", "S"]);
      assert.equal(variants?.axes[0].options.find((option) => option.selected)?.label, "XS");
    }
  });

  it("prefers the purchasable copy of a duplicated SKU", () => {
    const products = [
      product("1255283009-XS", "Легінси H&M XS беж 1255283009-XS", { size: "XS", isAvailable: false }),
      product("1255283009-XS", "Легінси H&M XS беж 1255283009-XS", { size: "XS" }),
      product("1255283009-S", "Легінси H&M S беж 1255283009-S", { size: "S" }),
    ];
    const { groups } = groupProducts(products);
    const primary = groups[0].members.find((member) => !member.duplicateOf && member.values.size?.key === "XS");
    assert.equal(primary?.id, products[1]._id);
  });

  it("falls back to distinguishing labels when sizes collide", () => {
    const products = [
      product("9000001", "Набір рушників Home синій 9000001"),
      product("9000001", "Набір рушників Home сірий 9000001", { vendor: "Other" }),
    ];
    // Same article, no size: one SKU imported twice.
    assert.equal(groupProducts(products).groups[0].members.filter((member) => member.duplicateOf).length, 1);

    // Two different SKUs of one family that both claim size M.
    const clash = [
      product("9000002-M", "Халат Home M синій 9000002-M", { size: "M" }),
      product("9000002", "Халат Home M сірий 9000002", { size: "M" }),
    ];
    const variants = variantsOf(clash, "9000002-M");
    assert.equal(variants.axes[0].key, "variant");
    assert.equal(new Set(variants.axes[0].options.map((option) => option.label)).size, 2);
    assert.equal(new Set(variants.axes[0].options.map((option) => option.productId)).size, 2);
  });

  it("does not merge unrelated items that share an article stem", () => {
    const { groups } = groupProducts([
      product("7777777-M", "Сорочка Brand M біла 7777777-M"),
      product("7777777-L", "Рюкзак Brand L чорний 7777777-L"),
    ]);
    assert.equal(groups.length, 2);
  });

  it("marks out-of-stock sizes instead of hiding them", () => {
    const products = sportTop();
    products[2] = { ...products[2], isAvailable: false };
    products[4] = { ...products[4], quantity: 0 };

    const options = variantsOf(products, "1354663001-XS").axes[0].options;
    assert.equal(options.length, 6);
    assert.deepEqual(options.filter((option) => !option.purchasable).map((option) => option.label), ["M", "XL"]);
  });

  it("is deterministic regardless of input order", () => {
    const products = [...sportTop(), ...sportTop("006", "білий")];
    const forward = groupProducts(products).groups;
    const backward = groupProducts([...products].reverse()).groups;
    assert.deepEqual(forward, backward);
  });
});

describe("colour siblings", () => {
  it("offers the other colours of the same model", () => {
    const products = [...sportTop("001", "коричневий"), ...sportTop("006", "білий"), ...sportTop("009", "чорний")];
    const variants = variantsOf(products, "1354663001-M");

    assert.equal(variants.siblingAxisLabel, "Колір");
    assert.deepEqual(variants.siblings.map((sibling) => sibling.label), ["Білий", "Коричневий", "Чорний"]);
    assert.equal(variants.siblings.find((sibling) => sibling.selected)?.label, "Коричневий");
  });

  it("keeps the shopper's size when switching colour", () => {
    const products = [...sportTop("001", "коричневий"), ...sportTop("006", "білий")];
    const variants = variantsOf(products, "1354663001-XL");
    const white = variants.siblings.find((sibling) => sibling.label === "Білий");
    assert.equal(white?.productId, products.find((item) => item.articleNumber === "1354663006-XL")?._id);
  });

  it("separates men's and women's cuts of one model", () => {
    const products = [
      product("475563089-S-m", "Дощовик чоловічий Tretorn S синій 475563089-S-m", { size: "S", color: "синій" }),
      product("475563404-S-w", "Дощовик unisex Tretorn S голубий 475563404-S-w", { size: "S", color: "голубий" }),
    ];
    assert.equal(variantsOf(products, "475563089-S-m").siblings.length, 0);
  });
});

/* --------------------------------- catalog -------------------------------- */

describe("catalog snapshot", () => {
  it("builds one listing per group and lists only purchasable variants", () => {
    const products = sportTop();
    products[0] = { ...products[0], isAvailable: false };
    const snapshot = snapshotOf(products);

    assert.equal(snapshot.listings.length, 1);
    const [listing] = snapshot.listings;
    assert.deepEqual(listing.variants.map((variant) => variant.label), ["S", "M", "L", "XL", "XXL"]);
    assert.equal(listing.id, products[1]._id, "the card opens the first size in stock");
    assert.equal(listing.axisLabel, "Розмір");
    assert.equal(snapshot.groups[0].members.length, 6, "the page still knows about the sold-out size");
  });

  it("omits groups with nothing in stock from the catalog", () => {
    const snapshot = snapshotOf(sportTop().map((item) => ({ ...item, quantity: 0 })));
    assert.equal(snapshot.listings.length, 0);
    assert.equal(snapshot.groups.length, 1);
  });

  it("exposes article-derived sizes as a filterable param", () => {
    const [listing] = snapshotOf(sportTop()).listings;
    assert.deepEqual(listing.variants.map((variant) => variant.params["Розмір"]), ["XS", "S", "M", "L", "XL", "XXL"]);
  });

  it("reports catalog health", () => {
    const snapshot = snapshotOf([...sportTop(), product("solo_1", "Товар", { images: [], category: [] })]);
    assert.equal(snapshot.stats.products, 7);
    assert.equal(snapshot.stats.listings, 2);
    assert.equal(snapshot.stats.multiVariantListings, 1);
    assert.equal(snapshot.stats.productsWithoutImages, 1);
    assert.equal(snapshot.stats.productsWithoutCategory, 1);
    assert.equal(snapshot.stats.productsWithoutParams, 7);
  });

  it("survives a JSON round trip unchanged", () => {
    const snapshot = snapshotOf([...sportTop(), ...sportTop("006", "білий")]);
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  });
});

describe("catalog query", () => {
  const catalog = () =>
    snapshotOf([
      ...sportTop("001", "коричневий"),
      ...sportTop("006", "білий").map((item) => ({ ...item, priceToShow: 800, price: 1000 })),
      product("472954028-41", "Чоботи Tretorn 41 Гірчичний 472954028-41", {
        size: "41",
        vendor: "Tretorn",
        category: ["cat-shoes"],
        priceToShow: 2500,
        price: 2500,
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
    ]);

  const run = (params: Record<string, string>) => runCatalogQuery(catalog(), parseCatalogQuery(params));

  it("finds a group by the article number of any of its sizes", () => {
    const byStem = run({ search: "1354663001" });
    assert.equal(byStem.total, 1);

    const byVariant = run({ search: "1354663001-XL" });
    assert.equal(byVariant.total, 1);
    const xl = byVariant.items[0].listing.variants.find((variant) => variant.label === "XL");
    assert.equal(byVariant.items[0].targetId, xl?.id, "the card opens the variant that was searched for");
  });

  it("matches every search term, in any order and case", () => {
    assert.equal(run({ search: "БІЛИЙ топ" }).total, 1);
    assert.equal(run({ search: "топ чоботи" }).total, 0);
  });

  it("filters by a size held by any variant and opens that variant", () => {
    const result = run({ categories: "cat-clothes", selectParams: "Розмір--L" });
    assert.equal(result.total, 2);
    for (const item of result.items) {
      const large = item.listing.variants.find((variant) => variant.label === "L");
      assert.equal(item.targetId, large?.id);
    }
  });

  it("accepts legacy filter values that differ only by lookalike letters", () => {
    assert.equal(run({ categories: "cat-clothes", selectParams: "Розмір--М" }).total, 2);
  });

  it("builds size facets in size order with per-listing counts", () => {
    const facet = run({ categories: "cat-clothes" }).facets.selectParams["Розмір"];
    assert.deepEqual(facet.values.map((entry) => entry.value), ["XS", "S", "M", "L", "XL", "XXL"]);
    assert.ok(facet.values.every((entry) => entry.valueTotalProducts === 2));
  });

  it("filters by category, vendor and price", () => {
    assert.equal(run({ categories: "cat-shoes" }).total, 1);
    assert.equal(run({ vendor: "Tretorn" }).total, 1);
    assert.equal(run({ minPrice: "700", maxPrice: "900" }).total, 1);
    assert.equal(run({ categories: "unknown-category" }).total, 0);
  });

  it("sorts by price and by recency", () => {
    assert.deepEqual(run({ sort: "low_price" }).items.map((item) => item.listing.priceToShow), [800, 1000, 2500]);
    assert.deepEqual(run({ sort: "hight_price" }).items.map((item) => item.listing.priceToShow), [2500, 1000, 800]);
    assert.equal(run({}).items[0].listing.vendor, "Tretorn", "newest first by default");
    assert.equal(run({ sort: "discount" }).items[0].listing.discountPercent, 20);
  });

  it("clamps the page and reports empty results without NaN bounds", () => {
    const beyond = run({ page: "99" });
    assert.equal(beyond.page, 1);
    assert.equal(beyond.items.length, 3);

    const empty = run({ search: "немає такого" });
    assert.equal(empty.total, 0);
    assert.equal(empty.pageCount, 1);
    assert.equal(run({ categories: "unknown-category" }).facets.maxPrice, 0);
  });

  it("does not reorder the shared snapshot", () => {
    const snapshot = catalog();
    const before = snapshot.listings.map((listing) => listing.key);
    runCatalogQuery(snapshot, parseCatalogQuery({ sort: "hight_price" }));
    assert.deepEqual(snapshot.listings.map((listing) => listing.key), before);
  });

  it("parses filter values that contain commas", () => {
    const query = parseCatalogQuery({ selectParams: "Вага--19,3__250,Смак--ваніль", unitParams: "Об'єм--100m500" });
    assert.deepEqual(Array.from(query.selectFilters[0].values), ["19,3", "250"]);
    assert.equal(query.selectFilters[1].name, "Смак");
    assert.deepEqual(query.unitFilters, [{ name: "Об'єм", min: 100, max: 500 }]);
  });
});
