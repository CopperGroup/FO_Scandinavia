/**
 * Catalog engine: pure functions that turn products into variant groups,
 * catalog listings and query results. Nothing here touches the database, the
 * cache or Next.js, so all of it can be unit tested (see ./__tests__).
 */
export * from "./types";
export { parseArticle, modelStemOf } from "./article";
export {
  compareSizes,
  facetValue,
  isColorParamName,
  isSizeParamName,
  normalizeColor,
  normalizeSize,
  parseSizeToken,
} from "./attributes";
export { buildListing } from "./listing";
export {
  CATALOG_PAGE_SIZE,
  SORT_KEYS,
  extractNumber,
  parseCatalogQuery,
  runCatalogQuery,
  type CatalogQuery,
  type CatalogResult,
  type CatalogResultItem,
  type SortKey,
} from "./query";
export { SNAPSHOT_VERSION, buildCatalogSnapshot } from "./snapshot";
export {
  buildVariantIndex,
  getProductVariants,
  groupProducts,
  isPurchasable,
  resolveIdentity,
  type VariantIndex,
} from "./variants";
