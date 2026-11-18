#!/usr/bin/env node
/**
 * Repairs category data that the old admin left broken.
 *
 *   REPAIR_MONGODB_URL="mongodb://127.0.0.1:27018/nordiva_local?replicaSet=rs-local&directConnection=true" \
 *     node tools/repair-categories.mjs            # dry run: reports, writes nothing
 *     node tools/repair-categories.mjs --apply    # writes the fixes
 *
 * What it fixes (Product.category is the source of truth):
 *   1. Categories whose NAME is a 24-hex id (created by the old product form
 *      from the id of a deleted category). Their products first get a valid
 *      category inferred from the product's other categories or from sibling
 *      variants of the same model (same article stem / model number); products
 *      where nothing can be inferred are listed and left without category.
 *      Then the categories are deleted.
 *   2. Ids in Product.category that point at no category (or are not ids at
 *      all) are removed. A product left with no category gets one inferred
 *      from its sibling variants when possible.
 *   3. Category.products and Category.totalValue are rebuilt from products.
 *   4. subCategories entries that point at no category (or at the category itself) are removed.
 *   5. Empty duplicate categories (same name, any letter case, no products,
 *      no subcategories) are deleted, keeping one of each name.
 *   6. Filter entries for categories that no longer exist are removed.
 *
 * The URL comes only from REPAIR_MONGODB_URL. A non-local host is refused
 * unless --allow-remote is passed as well.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "local-db") + "/");
let mongodb;
try {
  mongodb = require("mongodb");
} catch {
  mongodb = createRequire(path.join(here, "..") + "/")("mongodb");
}
const { MongoClient, ObjectId } = mongodb;

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const url = process.env.REPAIR_MONGODB_URL;

if (!url) {
  console.error("REPAIR_MONGODB_URL is not set. Refusing to run (there is no default on purpose).");
  process.exit(2);
}
const host = (() => {
  try {
    return new URL(url.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost", "::1"].includes(host) && !args.has("--allow-remote")) {
  console.error(`Host "${host}" is not local. Pass --allow-remote as well if you really mean it.`);
  process.exit(2);
}

const DELETED_PRODUCT_ID = "681a9c16b06f4e599d07371e";
const DELETED_CATEGORY_ID = "681a9c9a90b4efb3dd18d1e5";
const HEX24 = /^[0-9a-f]{24}$/i;

const key = (name) => String(name ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase("uk-UA");

/* --------------------------- sibling detection --------------------------- */

const SIZE = /^(?:\d{1,3}(?:[/,.]\d{1,3})?|[2-6]?x{0,3}[sml]|xxs|xs|xl|xxl|xxxl|[2-6]xl|one ?size|os|\d{2,3}[a-h]{1,2}|\d{2,3}x\d{2,3})$/i;
const MARKER = /^[mwuk]$/;

/** Article number without the size segment (and audience marker): identifies one colour of one model. */
function stemOf(article) {
  const raw = String(article ?? "").trim();
  const parts = raw.split("-");
  if (parts.length < 2) return null;
  let end = parts.length - 1;
  if (parts.length >= 3 && MARKER.test(parts[end]) && SIZE.test(parts[end - 1])) end -= 1;
  if (!SIZE.test(parts[end])) return null;
  const stem = parts.slice(0, end).join("-");
  return stem.length >= 5 && /\d/.test(stem) ? stem.toLowerCase() : null;
}

/** Model number shared by the colours of one model. */
function modelOf(stem) {
  if (!stem) return null;
  const dashed = stem.split("-");
  if (dashed.length >= 2) {
    const model = dashed.slice(0, -1).join("-");
    return model.length >= 5 && /^\d/.test(model) ? model : null;
  }
  const underscored = /^(\d{5,})_[a-zа-яіїє]+$/i.exec(stem);
  if (underscored) return underscored[1];
  const numeric = /^(\d{6,7})\d{3}r?$/.exec(stem);
  return numeric ? numeric[1] : null;
}

/* --------------------------------- stats --------------------------------- */

async function measure(db) {
  const categories = await db.collection("categories").find({}, { projection: { name: 1, products: 1, subCategories: 1 } }).toArray();
  const ids = new Set(categories.map((c) => String(c._id)));
  const products = await db.collection("products").find({ _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) } }, { projection: { category: 1 } }).toArray();
  const productIds = new Set(products.map((p) => String(p._id)));

  let dangling = 0;
  let uncategorized = 0;
  const realMembers = new Map();
  for (const product of products) {
    const list = product.category ?? [];
    let valid = 0;
    for (const value of list) {
      const id = String(value);
      if (ids.has(id) && id !== DELETED_CATEGORY_ID && !HEX24.test(categories.find((c) => String(c._id) === id)?.name ?? "")) valid++;
      if (!ids.has(id) || !(value instanceof ObjectId)) dangling++;
      if (ids.has(id)) {
        if (!realMembers.has(id)) realMembers.set(id, new Set());
        realMembers.get(id).add(String(product._id));
      }
    }
    if (valid === 0) uncategorized++;
  }

  let mismatches = 0;
  let deletedListed = 0;
  let danglingSubs = 0;
  for (const category of categories) {
    const listed = new Set((category.products ?? []).map(String));
    const real = realMembers.get(String(category._id)) ?? new Set();
    for (const id of listed) if (!productIds.has(id)) deletedListed++;
      else if (!real.has(id)) mismatches++;
    for (const id of real) if (!listed.has(id)) mismatches++;
    for (const sub of category.subCategories ?? []) if (!ids.has(String(sub)) || String(sub) === String(category._id)) danglingSubs++;
  }

  const byName = new Map();
  for (const category of categories) {
    if (String(category._id) === DELETED_CATEGORY_ID) continue;
    const k = key(category.name);
    byName.set(k, (byName.get(k) ?? 0) + 1);
  }
  const duplicateNames = [...byName.values()].filter((count) => count > 1).length;

  const filter = await db.collection("filters").findOne({}, { projection: { categories: 1 } });
  const filterDangling = (filter?.categories ?? []).filter((entry) => !ids.has(String(entry.categoryId))).length;

  return {
    categories: categories.length,
    idNamedCategories: categories.filter((c) => HEX24.test(String(c.name ?? "").trim())).length,
    danglingProductRefs: dangling,
    productsWithoutValidCategory: uncategorized,
    membershipMismatches: mismatches,
    deletedProductsListed: deletedListed,
    danglingSubCategories: danglingSubs,
    duplicateNames,
    filterEntriesForMissingCategories: filterDangling,
  };
}

/* --------------------------------- repair -------------------------------- */

async function repair(db) {
  const Categories = db.collection("categories");
  const Products = db.collection("products");
  const report = { inferred: [], leftUncategorized: [], deletedCategories: [], duplicatesDeleted: [] };

  const categories = await Categories.find({}, { projection: { name: 1, subCategories: 1, createdAt: 1 } }).toArray();
  const idNamed = new Set(categories.filter((c) => HEX24.test(String(c.name ?? "").trim()) && String(c._id) !== DELETED_CATEGORY_ID).map((c) => String(c._id)));
  // Valid = exists, not the placeholder, not id-named.
  const valid = new Set(categories.map((c) => String(c._id)).filter((id) => id !== DELETED_CATEGORY_ID && !idNamed.has(id)));

  const products = await Products.find(
    { _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) } },
    { projection: { category: 1, articleNumber: 1, name: 1 } },
  ).toArray();

  const validOf = (product) => [...new Set((product.category ?? []).map(String))].filter((id) => valid.has(id));

  // Sibling index: stem and model -> products with valid categories.
  const byStem = new Map();
  const byModel = new Map();
  for (const product of products) {
    const stem = stemOf(product.articleNumber);
    const model = modelOf(stem);
    product.__stem = stem;
    product.__model = model;
    if (stem) byStem.set(stem, [...(byStem.get(stem) ?? []), product]);
    if (model) byModel.set(model, [...(byModel.get(model) ?? []), product]);
  }

  /** Categories most siblings share (all ties kept), or [] when siblings have none. */
  function inferFromSiblings(product) {
    for (const [index, pool] of [[product.__stem, byStem], [product.__model, byModel]]) {
      if (!index) continue;
      const siblings = (pool.get(index) ?? []).filter((other) => other !== product);
      const votes = new Map();
      for (const sibling of siblings) for (const id of validOf(sibling)) votes.set(id, (votes.get(id) ?? 0) + 1);
      if (votes.size) {
        const best = Math.max(...votes.values());
        return { ids: [...votes.entries()].filter(([, count]) => count === best).map(([id]) => id), via: pool === byStem ? "колір/розмір тієї ж моделі" : "інший колір тієї ж моделі" };
      }
    }
    return { ids: [], via: "" };
  }

  // 1 + 2: every product whose category list holds anything that is not a valid category.
  const productOps = [];
  for (const product of products) {
    const raw = product.category ?? [];
    const keep = validOf(product);
    const bad = raw.filter((value) => !valid.has(String(value)) || !(value instanceof ObjectId));
    if (bad.length === 0 && keep.length > 0) continue;

    let next = keep;
    if (next.length === 0) {
      const inferred = inferFromSiblings(product);
      if (inferred.ids.length) {
        next = inferred.ids;
        report.inferred.push({ id: String(product._id), name: product.name, article: product.articleNumber, via: inferred.via, categories: inferred.ids });
      } else {
        report.leftUncategorized.push({ id: String(product._id), name: product.name, article: product.articleNumber, hadIdNamed: bad.some((value) => idNamed.has(String(value))) });
      }
    }
    if (bad.length === 0 && next.length === keep.length) continue;
    productOps.push({ updateOne: { filter: { _id: product._id }, update: { $set: { category: next.map((id) => new ObjectId(id)) } } } });
  }

  // 5 (prepare): empty duplicates, judged after the product fix.
  const membership = new Map();
  for (const product of products) {
    const op = productOps.find((candidate) => String(candidate.updateOne.filter._id) === String(product._id));
    const list = op ? op.updateOne.update.$set.category.map(String) : validOf(product);
    for (const id of list) membership.set(id, (membership.get(id) ?? 0) + 1);
  }
  const groups = new Map();
  for (const category of categories) {
    const id = String(category._id);
    if (!valid.has(id)) continue;
    const k = key(category.name);
    groups.set(k, [...(groups.get(k) ?? []), category]);
  }
  const filterDoc = await db.collection("filters").findOne({}, { projection: { categories: 1 } });
  const inFilter = new Set((filterDoc?.categories ?? []).map((entry) => String(entry.categoryId)));
  const parents = new Set(categories.flatMap((c) => (c.subCategories ?? []).map(String)));
  const duplicateDeletes = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const score = (c) => (membership.get(String(c._id)) ?? 0) * 1000 + (c.subCategories?.length ?? 0) * 10 + (inFilter.has(String(c._id)) ? 5 : 0) + (parents.has(String(c._id)) ? 1 : 0);
    const sorted = [...group].sort((a, b) => score(b) - score(a) || String(a._id).localeCompare(String(b._id)));
    for (const extra of sorted.slice(1)) {
      const empty = !(membership.get(String(extra._id)) ?? 0) && !(extra.subCategories ?? []).length;
      if (empty) duplicateDeletes.push(extra);
    }
  }
  report.duplicatesDeleted = duplicateDeletes.map((c) => ({ id: String(c._id), name: c.name }));
  report.deletedCategories = [...idNamed].map((id) => ({ id, name: categories.find((c) => String(c._id) === id)?.name }));

  console.log(`\nProducts to update: ${productOps.length}`);
  console.log(`  category inferred from sibling variants: ${report.inferred.length}`);
  console.log(`  left without category (assign by hand in /admin/products?tab=uncategorized): ${report.leftUncategorized.length}`);
  console.log(`Id-named categories to delete: ${report.deletedCategories.length}`);
  console.log(`Empty duplicate categories to delete: ${report.duplicatesDeleted.length}`, report.duplicatesDeleted.map((c) => c.name).join(", "));
  if (report.inferred.length) {
    console.log("\nInferred (first 20):");
    for (const row of report.inferred.slice(0, 20)) console.log(`  ${row.article || row.id}  ${String(row.name).slice(0, 60)}  -> ${row.categories.map((id) => categories.find((c) => String(c._id) === id)?.name).join(", ")}  (${row.via})`);
  }
  if (report.leftUncategorized.length) {
    console.log("\nLeft without category:");
    for (const row of report.leftUncategorized) console.log(`  ${row.id}  ${row.article || "-"}  ${String(row.name).slice(0, 70)}`);
  }

  if (!APPLY) return report;

  // Writes.
  if (productOps.length) await Products.bulkWrite(productOps, { ordered: false });

  const removeIds = [...idNamed, ...duplicateDeletes.map((c) => String(c._id))].map((id) => new ObjectId(id));
  if (removeIds.length) {
    await Products.updateMany({ category: { $in: removeIds } }, { $pull: { category: { $in: removeIds } } });
    await Categories.updateMany({ subCategories: { $in: removeIds } }, { $pull: { subCategories: { $in: removeIds } } });
    await db.collection("filters").updateMany({}, { $pull: { categories: { categoryId: { $in: removeIds } } } });
    await Categories.deleteMany({ _id: { $in: removeIds } });
  }

  // 4: dangling and self subCategories.
  const remaining = await Categories.find({}, { projection: { subCategories: 1 } }).toArray();
  const existing = new Set(remaining.map((c) => String(c._id)));
  const subOps = remaining
    .map((c) => {
      const list = (c.subCategories ?? []).map(String);
      const clean = [...new Set(list.filter((id) => existing.has(id) && id !== String(c._id)))];
      return clean.length === list.length ? null : { updateOne: { filter: { _id: c._id }, update: { $set: { subCategories: clean.map((id) => new ObjectId(id)) } } } };
    })
    .filter(Boolean);
  if (subOps.length) await Categories.bulkWrite(subOps, { ordered: false });

  // 6: filter entries for missing categories.
  await db.collection("filters").updateMany({}, { $pull: { categories: { categoryId: { $nin: [...existing].map((id) => new ObjectId(id)) } } } });

  // 3: rebuild products/totalValue from Product.category.
  const rows = await Products.aggregate([
    { $match: { _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) } } },
    { $project: { category: { $setUnion: [{ $ifNull: ["$category", []] }, []] }, priceToShow: 1 } },
    { $unwind: "$category" },
    { $group: { _id: "$category", products: { $push: "$_id" }, totalValue: { $sum: { $ifNull: ["$priceToShow", 0] } } } },
  ]).toArray();
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  await Categories.bulkWrite(
    remaining
      .filter((c) => existing.has(String(c._id)))
      .map((c) => ({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { products: byId.get(String(c._id))?.products ?? [], totalValue: Math.round(byId.get(String(c._id))?.totalValue ?? 0) } },
        },
      })),
    { ordered: false },
  );

  return report;
}

/* ---------------------------------- main --------------------------------- */

const client = new MongoClient(url);
await client.connect();
try {
  const db = client.db();
  console.log(`Database: ${db.databaseName} on ${host}  mode: ${APPLY ? "APPLY (writing)" : "dry run (no writes)"}`);
  const before = await measure(db);
  console.log("\nBefore:");
  console.table(before);
  await repair(db);
  if (APPLY) {
    const after = await measure(db);
    console.log("\nAfter:");
    console.table(after);
  } else {
    console.log("\nDry run: nothing was written. Run again with --apply to fix.");
  }
} finally {
  await client.close();
}
