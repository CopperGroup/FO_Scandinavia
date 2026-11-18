import { facetValue, isSizeParamName } from "./attributes";
import { normalizeForSearch, stripHtml, truncate } from "./text";
import type { CatalogListing, ListingVariant, VariantGroup } from "./types";
import type { ProductIdentity } from "./variants";

const SYNTHETIC_SIZE_PARAM = "Розмір";

/**
 * Params as the catalog filters see them. A size known only from the article
 * number is exposed under "Розмір" so such products can still be filtered.
 */
function effectiveParams(identity: ProductIdentity): Record<string, string> {
  const result: Record<string, string> = {};
  for (const param of identity.product.params ?? []) {
    const name = param?.name?.trim();
    if (!name || param.value == null || name in result) continue;
    result[name] = facetValue(name, String(param.value));
  }
  if (identity.size && !Object.keys(result).some(isSizeParamName)) {
    result[SYNTHETIC_SIZE_PARAM] = identity.size.label;
  }
  return result;
}

function discountPercent(price: number, priceToShow: number): number {
  if (!price || priceToShow >= price) return 0;
  return Math.round(((price - priceToShow) / price) * 100);
}

/**
 * Catalog card for a variant group, built from the SKUs that can be bought.
 * Returns null when nothing in the group is in stock.
 */
export function buildListing(
  group: VariantGroup,
  identities: ProductIdentity[],
  colorCount: number,
): CatalogListing | null {
  const byId = new Map(identities.map((identity) => [String(identity.product._id), identity]));
  const sellable = group.members
    .filter((member) => !member.duplicateOf && member.purchasable)
    .map((member) => ({ member, identity: byId.get(member.id) as ProductIdentity }));

  if (sellable.length === 0) return null;

  const lead = sellable[0];
  const paramSets = sellable.map(({ identity }) => effectiveParams(identity));

  const common: Record<string, string> = {};
  const varying = new Set<string>();
  const names = new Set(paramSets.flatMap((params) => Object.keys(params)));
  names.forEach((name) => {
    const first = paramSets[0][name];
    if (first !== undefined && paramSets.every((params) => params[name] === first)) common[name] = first;
    else varying.add(name);
  });

  const variants: ListingVariant[] = sellable.map(({ member, identity }, index) => {
    const params: Record<string, string> = {};
    varying.forEach((name) => {
      if (paramSets[index][name] !== undefined) params[name] = paramSets[index][name];
    });
    return {
      id: member.id,
      articleNumber: identity.article.raw,
      label: member.values.size?.label ?? member.values.variant?.label ?? member.values.color?.label ?? null,
      size: member.values.size?.label ?? identity.size?.label ?? null,
      price: identity.product.price,
      priceToShow: identity.product.priceToShow,
      params,
    };
  });

  const prices = variants.map((variant) => variant.priceToShow);
  const categories = new Set<string>();
  for (const { identity } of sellable) for (const category of identity.product.category ?? []) categories.add(String(category));

  const product = lead.identity.product;
  const articles = Array.from(new Set(variants.map((variant) => variant.articleNumber).filter(Boolean)));

  return {
    key: group.key,
    id: lead.member.id,
    productId: product.id,
    name: product.name,
    title: group.title,
    image: product.images?.[0] ?? sellable.find(({ member }) => member.image)?.member.image ?? null,
    hoverImage: product.images?.[1] ?? null,
    url: product.url ?? "",
    vendor: product.vendor ?? "",
    category: Array.from(categories),
    price: product.price,
    priceToShow: product.priceToShow,
    priceMin: Math.min(...prices),
    priceMax: Math.max(...prices),
    discountPercent: discountPercent(product.price, product.priceToShow),
    params: common,
    variants,
    axisLabel: variants.length > 1 ? group.axes[0]?.label ?? null : null,
    colorLabel: group.color?.label ?? null,
    colorCount,
    excerpt: truncate(stripHtml(product.description ?? ""), 110),
    searchText: normalizeForSearch(
      [group.title, product.name, product.vendor ?? "", lead.identity.article.stem, ...articles].join(" "),
    ),
    createdAt: Math.max(...sellable.map(({ identity }) => Date.parse(identity.product.createdAt ?? "") || 0)),
    salesCount: sellable.reduce((sum, { identity }) => sum + (identity.product.salesCount ?? 0), 0),
  };
}
