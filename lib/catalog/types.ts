/**
 * Shared types of the catalog engine.
 *
 * Vocabulary
 *  - product:  one sellable SKU (one document in the `products` collection)
 *  - group:    SKUs that are the same item in different sizes (one catalog card)
 *  - model:    groups that are the same item in different colours
 *  - listing:  the catalog-facing projection of a group that has stock
 */

export type ProductParam = { name: string; value: string };

/** The slim product projection the engine works with. */
export type SourceProduct = {
  _id: string;
  id: string;
  name: string;
  articleNumber?: string | null;
  images: string[];
  isAvailable: boolean;
  quantity: number;
  url?: string | null;
  price: number;
  priceToShow: number;
  vendor?: string | null;
  category: string[];
  params: ProductParam[];
  description?: string | null;
  createdAt?: string | null;
  salesCount?: number;
};

export type SizeClass = "alpha" | "numeric" | "bra" | "dimension" | "onesize" | "other";

export type NormalizedSize = {
  /** Stable identity used for comparisons, e.g. `XXL`, `34/36`, `140x300`. */
  key: string;
  /** Human readable label, e.g. `XXL`, `34/36`, `140×300 см`. */
  label: string;
  cls: SizeClass;
  /** Sort tuple; compare element by element. */
  rank: [number, number, number];
};

export type NormalizedColor = {
  key: string;
  label: string;
  /** One or more CSS colours approximating the label, empty when unknown. */
  swatch: string[];
};

export type AxisKey = "size" | "color" | "variant";

export type VariantAxisDefinition = { key: AxisKey; label: string };

export type AxisValue = { key: string; label: string };

export type GroupMember = {
  id: string;
  articleNumber: string;
  image: string | null;
  price: number;
  priceToShow: number;
  /** In stock and enabled, i.e. can be bought right now. */
  purchasable: boolean;
  values: Partial<Record<AxisKey, AxisValue>>;
  /** Set when this SKU was imported twice; points at the copy shown to shoppers. */
  duplicateOf?: string;
};

export type VariantGroup = {
  key: string;
  modelKey: string | null;
  /** Title shared by the members: no article number, no size. */
  title: string;
  color: NormalizedColor | null;
  axes: VariantAxisDefinition[];
  /**
   * Every product of the group. Primaries come first in display (size) order,
   * followed by duplicates of SKUs that were imported more than once.
   */
  members: GroupMember[];
};

export type ListingVariant = {
  id: string;
  articleNumber: string;
  label: string | null;
  /** Size label of this SKU ("XL", "38", "140×300 см"), null when it has none. */
  size: string | null;
  price: number;
  priceToShow: number;
  /** Params that differ between the variants of this listing. */
  params: Record<string, string>;
};

export type CatalogListing = {
  key: string;
  /** Product the card links to by default (first size in stock). */
  id: string;
  /** Legacy numeric product id of the representative, used by likes. */
  productId: string;
  name: string;
  title: string;
  image: string | null;
  /** Second photo, shown when the card is hovered. */
  hoverImage: string | null;
  url: string;
  vendor: string;
  category: string[];
  price: number;
  priceToShow: number;
  priceMin: number;
  priceMax: number;
  discountPercent: number;
  /** Params equal across all purchasable variants. */
  params: Record<string, string>;
  variants: ListingVariant[];
  /** Label of the axis the variants differ by ("Розмір"), null for single-SKU listings. */
  axisLabel: string | null;
  colorLabel: string | null;
  /** Colours of the same model that are in stock, this one included. */
  colorCount: number;
  excerpt: string;
  searchText: string;
  createdAt: number;
  salesCount: number;
};

export type CatalogCategory = {
  name: string;
  categoryId: string;
  totalProducts: number;
  subCategories: string[];
  /** A few sentences about the category, written by the owner, for its page in the shop. */
  text?: string;
};

export type FilterSettings = {
  [categoryId: string]: {
    params: { [paramName: string]: { totalProducts: number; type: string } };
    totalProducts: number;
    subCategories?: string[];
  };
};

export type CatalogStats = {
  products: number;
  purchasableProducts: number;
  groups: number;
  listings: number;
  multiVariantListings: number;
  largestGroup: number;
  productsWithoutParams: number;
  productsWithoutImages: number;
  productsWithoutCategory: number;
  duplicateProducts: number;
  fallbackAxisGroups: number;
};

export type CatalogSnapshot = {
  version: number;
  builtAt: string;
  listings: CatalogListing[];
  groups: VariantGroup[];
  categories: CatalogCategory[];
  filterSettings: FilterSettings;
  filterDelay: number;
  stats: CatalogStats;
};

/* ----------------------------- product page ----------------------------- */

export type VariantOption = {
  value: string;
  label: string;
  productId: string;
  selected: boolean;
  purchasable: boolean;
  /** False when choosing this option also changes another axis. */
  exact: boolean;
};

export type VariantAxis = VariantAxisDefinition & { options: VariantOption[] };

/** Another colour (or otherwise distinct edition) of the same model. */
export type SiblingOption = {
  productId: string;
  label: string;
  image: string | null;
  swatch: string[];
  selected: boolean;
  purchasable: boolean;
};

export type ProductVariants = {
  groupKey: string;
  title: string;
  axes: VariantAxis[];
  /** "Колір" when the siblings differ by colour, otherwise "Варіант". */
  siblingAxisLabel: string | null;
  siblings: SiblingOption[];
  totalVariants: number;
  purchasableVariants: number;
};
