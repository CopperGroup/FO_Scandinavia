import { modelStemOf, parseArticle, type ParsedArticle } from "./article";
import {
  colorFromParams,
  compareSizes,
  dimensionFromText,
  normalizeColor,
  parseSizeToken,
  sizeFromParams,
} from "./attributes";
import { capitalize, tokenize } from "./text";
import { nameMentionsSize, stripArticle, stripSize } from "./title";
import type {
  AxisKey,
  AxisValue,
  GroupMember,
  NormalizedColor,
  NormalizedSize,
  ProductVariants,
  SiblingOption,
  SourceProduct,
  VariantAxis,
  VariantAxisDefinition,
  VariantGroup,
} from "./types";

const AXIS_LABELS: Record<AxisKey, string> = { size: "Розмір", color: "Колір", variant: "Варіант" };

/* -------------------------------------------------------------------------- */
/*                                  Identity                                  */
/* -------------------------------------------------------------------------- */

export type ProductIdentity = {
  product: SourceProduct;
  article: ParsedArticle;
  groupKey: string;
  modelKey: string | null;
  size: NormalizedSize | null;
  color: NormalizedColor | null;
  /** Name without the article number; still contains the size word. */
  plainName: string;
  /** Name without article number and size. */
  title: string;
  /** First word of the title, lower-cased. Guards against merging unrelated items. */
  word: string;
  purchasable: boolean;
};

export function isPurchasable(product: Pick<SourceProduct, "isAvailable" | "quantity">): boolean {
  return product.isAvailable === true && (product.quantity ?? 0) > 0;
}

/** "34" in the article number standing for the "34/36" the param spells out. */
function abbreviates(articleSize: NormalizedSize, paramSize: NormalizedSize | null): boolean {
  return (
    paramSize !== null &&
    articleSize.cls === "numeric" &&
    paramSize.cls === "numeric" &&
    paramSize.rank[2] !== -1 &&
    articleSize.rank[2] === -1 &&
    articleSize.rank[1] === paramSize.rank[1]
  );
}

/**
 * A size read off the article number is trusted when it cannot be anything
 * else (letters, ranges, bra sizes, dimensions). A bare number could equally be
 * a colour code, so it has to be confirmed by the size param or by the name.
 */
function isSizeConfirmed(article: ParsedArticle, paramSize: NormalizedSize | null, plainName: string): boolean {
  const size = article.size;
  if (!size || !article.sizeSegment) return false;
  if (paramSize?.key === size.key || abbreviates(size, paramSize)) return true;
  if (nameMentionsSize(plainName, size)) return true;

  const segment = article.sizeSegment;
  if (size.cls === "bra" || size.cls === "dimension" || size.cls === "onesize") return true;
  if (size.cls === "numeric") return segment.includes("/");
  if (size.cls === "alpha") return segment === segment.toUpperCase() && !/^[mwuk]$/.test(segment);
  return false;
}

/** Audience markers stay part of the model identity: men's and women's cuts are different items. */
function modelKeyFor(stem: string, word: string, marker = ""): string | null {
  const modelStem = stem ? modelStemOf(stem) : null;
  return modelStem ? `${modelStem.toLowerCase()}${marker}|${word}` : null;
}

export function resolveIdentity(product: SourceProduct): ProductIdentity {
  const params = Array.isArray(product.params) ? product.params : [];
  const name = product.name ?? "";
  const paramSize = sizeFromParams(params);

  let article = parseArticle(product.articleNumber);
  let plainName = stripArticle(name, article);

  if (article.size && !isSizeConfirmed(article, paramSize, plainName)) {
    article = { raw: article.raw, stem: article.raw, size: null, sizeSegment: null, marker: null };
    plainName = stripArticle(name, article);
  }

  // The param is the fuller spelling when the article number only abbreviates it.
  const size =
    (article.size && abbreviates(article.size, paramSize) ? paramSize : article.size) ??
    paramSize ??
    dimensionFromText(plainName);

  const title = stripSize(plainName, size) || plainName || name;
  const word = (tokenize(title)[0] ?? "").toLowerCase();

  const stemKey = article.stem.toLowerCase();
  const marker = article.marker ? `~${article.marker}` : "";

  return {
    product,
    article,
    // Products without an article number never group with anything.
    groupKey: stemKey ? `${stemKey}${marker}|${word}` : `id:${product._id}`,
    modelKey: modelKeyFor(article.stem, word, marker),
    size,
    color: colorFromParams(params),
    plainName,
    title,
    word,
    purchasable: isPurchasable(product),
  };
}

/* -------------------------------------------------------------------------- */
/*                          Duplicates and lost sizes                         */
/* -------------------------------------------------------------------------- */

function byPreference(a: ProductIdentity, b: ProductIdentity): number {
  if (a.purchasable !== b.purchasable) return a.purchasable ? -1 : 1;
  const createdA = a.product.createdAt ?? "";
  const createdB = b.product.createdAt ?? "";
  if (createdA !== createdB) return createdA < createdB ? 1 : -1;
  return String(a.product._id).localeCompare(String(b.product._id));
}

/**
 * The same SKU imported twice (identical article number and size) is one
 * choice for the shopper. The best copy becomes the primary; the others stay
 * in the group as duplicates and resolve to the same option.
 */
function splitDuplicates(identities: ProductIdentity[]): { primaries: ProductIdentity[]; duplicateOf: Map<string, string> } {
  const bySku = new Map<string, ProductIdentity[]>();
  for (const identity of identities) {
    const raw = identity.article.raw.toLowerCase();
    const sku = raw ? `${raw}\u0000${identity.size?.key ?? ""}` : `id:${identity.product._id}`;
    const bucket = bySku.get(sku);
    if (bucket) bucket.push(identity);
    else bySku.set(sku, [identity]);
  }

  const primaries: ProductIdentity[] = [];
  const duplicateOf = new Map<string, string>();
  bySku.forEach((bucket) => {
    const [primary, ...rest] = [...bucket].sort(byPreference);
    primaries.push(primary);
    for (const duplicate of rest) duplicateOf.set(String(duplicate.product._id), String(primary.product._id));
  });

  return { primaries, duplicateOf };
}

function commonTokens(tokenSets: string[][]): Set<string> {
  const common = new Set((tokenSets[0] ?? []).map((token) => token.toLowerCase()));
  for (const tokens of tokenSets.slice(1)) {
    const present = new Set(tokens.map((token) => token.toLowerCase()));
    Array.from(common).forEach((token) => {
      if (!present.has(token)) common.delete(token);
    });
  }
  return common;
}

/**
 * Some feeds drop the size suffix on one SKU of a family ("473428011" next to
 * "473428011-26"). When the only thing that sets such a name apart is a token
 * that reads as a size of the family's kind, that token is its size.
 */
function recoverSizes(members: ProductIdentity[]): ProductIdentity[] {
  const sized = members.filter((member) => member.size);
  if (sized.length === 0 || sized.length === members.length) return members;

  const kinds = new Set(sized.map((member) => (member.size as NormalizedSize).cls));
  if (kinds.size !== 1) return members;
  const kind = sized[0].size?.cls;

  const tokenSets = members.map((member) => tokenize(member.plainName));
  const common = commonTokens(tokenSets);
  const taken = new Set(sized.map((member) => (member.size as NormalizedSize).key));

  return members.map((member, index) => {
    if (member.size) return member;
    const unique = tokenSets[index].filter((token) => !common.has(token.toLowerCase()));
    const candidates = unique
      .map((token) => parseSizeToken(token))
      .filter((size): size is NormalizedSize => size !== null && size.cls === kind && !taken.has(size.key));
    if (candidates.length !== 1) return member;
    taken.add(candidates[0].key);
    return { ...member, size: candidates[0], title: stripSize(member.plainName, candidates[0]) || member.title };
  });
}

/* -------------------------------------------------------------------------- */
/*                                    Axes                                    */
/* -------------------------------------------------------------------------- */

/** An axis set is usable when every member has a value and no two members share all of them. */
function identifiesEveryMember(members: ProductIdentity[], axes: AxisKey[]): boolean {
  const seen = new Set<string>();
  for (const member of members) {
    const parts: string[] = [];
    for (const axis of axes) {
      const value = axis === "size" ? member.size?.key : member.color?.key;
      if (!value) return false;
      parts.push(value);
    }
    const tuple = parts.join("\u0000");
    if (seen.has(tuple)) return false;
    seen.add(tuple);
  }
  return true;
}

function chooseAxes(members: ProductIdentity[]): AxisKey[] {
  if (members.length < 2) return [];
  const sizeVaries = new Set(members.map((member) => member.size?.key ?? null)).size > 1;
  const colorVaries = new Set(members.map((member) => member.color?.key ?? null)).size > 1;

  const candidates: AxisKey[][] = [];
  if (sizeVaries) candidates.push(["size"]);
  if (colorVaries) candidates.push(["color"]);
  if (sizeVaries && colorVaries) candidates.push(["size", "color"]);

  return candidates.find((axes) => identifiesEveryMember(members, axes)) ?? ["variant"];
}

/**
 * Labels for groups whose members cannot be told apart by size or colour:
 * whatever differs between the names, falling back to the article number.
 * The result is always unique, so every product stays reachable.
 */
function fallbackLabels(members: ProductIdentity[]): string[] {
  const tokenSets = members.map((member) => tokenize(member.plainName));
  const common = commonTokens(tokenSets);

  const labels = members.map((member, index) => {
    const difference = tokenSets[index].filter((token) => !common.has(token.toLowerCase())).join(" ");
    const sizeLabel = member.size?.label ?? "";
    const mentionsSize = sizeLabel !== "" && difference.toLowerCase().includes(sizeLabel.toLowerCase());
    return (mentionsSize ? [difference] : [sizeLabel, difference]).filter(Boolean).join(" · ");
  });

  const unique = (list: string[]) => list.every((label) => label.length > 0) && new Set(list).size === list.length;
  if (unique(labels)) return labels;

  const withArticle = members.map((member, index) => [labels[index], member.article.raw].filter(Boolean).join(" · "));
  if (unique(withArticle)) return withArticle;

  return members.map((member, index) => `${withArticle[index] || "Варіант"} · ${String(member.product._id).slice(-4)}`);
}

function majorityColor(members: ProductIdentity[]): NormalizedColor | null {
  const counts = new Map<string, { color: NormalizedColor; count: number }>();
  for (const member of members) {
    if (!member.color) continue;
    const entry = counts.get(member.color.key) ?? { color: member.color, count: 0 };
    entry.count += 1;
    counts.set(member.color.key, entry);
  }
  let best: { color: NormalizedColor; count: number } | undefined;
  counts.forEach((entry) => {
    if (!best || entry.count > best.count) best = entry;
  });
  return best ? best.color : null;
}

/* -------------------------------------------------------------------------- */
/*                                   Groups                                   */
/* -------------------------------------------------------------------------- */

function bySizeThenArticle(a: ProductIdentity, b: ProductIdentity): number {
  return (
    compareSizes(a.size, b.size) ||
    a.article.raw.localeCompare(b.article.raw) ||
    String(a.product._id).localeCompare(String(b.product._id))
  );
}

type BuiltGroup = { group: VariantGroup; identities: ProductIdentity[] };

function buildGroup(key: string, modelKey: string | null, bucket: ProductIdentity[]): BuiltGroup {
  const { primaries: rawPrimaries, duplicateOf } = splitDuplicates(bucket);
  const primaries = recoverSizes(rawPrimaries).sort(bySizeThenArticle);
  const primaryById = new Map(primaries.map((identity) => [String(identity.product._id), identity]));

  const axisKeys = chooseAxes(primaries);
  const labels = axisKeys[0] === "variant" ? fallbackLabels(primaries) : [];
  const variantLabel = new Map(primaries.map((identity, index) => [String(identity.product._id), labels[index]]));

  const duplicates = bucket.filter((identity) => duplicateOf.has(String(identity.product._id)));
  const ordered = [...primaries, ...duplicates];

  const members: GroupMember[] = ordered.map((identity) => {
    const id = String(identity.product._id);
    const primaryId = duplicateOf.get(id);
    // A duplicate takes the place of its primary on every axis.
    const source = primaryId ? (primaryById.get(primaryId) as ProductIdentity) : identity;
    const sourceId = String(source.product._id);

    const values: Partial<Record<AxisKey, AxisValue>> = {};
    if (source.size) values.size = { key: source.size.key, label: source.size.label };
    if (source.color) values.color = { key: source.color.key, label: source.color.label };
    if (axisKeys[0] === "variant") values.variant = { key: sourceId, label: variantLabel.get(sourceId) as string };

    const member: GroupMember = {
      id,
      articleNumber: identity.article.raw,
      image: identity.product.images?.[0] ?? null,
      price: identity.product.price,
      priceToShow: identity.product.priceToShow,
      purchasable: identity.purchasable,
      values,
    };
    if (primaryId) member.duplicateOf = primaryId;
    return member;
  });

  const lead = primaries.find((identity) => identity.purchasable) ?? primaries[0];

  return {
    group: {
      key,
      modelKey,
      title: lead.title,
      color: majorityColor(primaries),
      axes: axisKeys.map((axis): VariantAxisDefinition => ({ key: axis, label: AXIS_LABELS[axis] })),
      members,
    },
    identities: ordered,
  };
}

/**
 * Families whose article numbers end in a vendor size *code* rather than the
 * size itself ("1716681-03-220" for a 140×220 curtain) land in one bucket per
 * SKU. They are one item in several sizes when they share a title, do not
 * differ in colour, and every SKU has a size of its own.
 */
function isOneItemInSizes(identities: ProductIdentity[]): boolean {
  const { primaries } = splitDuplicates(identities);
  if (primaries.length < 2) return false;

  const colors = new Set(primaries.map((identity) => identity.color?.key).filter(Boolean));
  if (colors.size > 1) return false;

  const titles = new Set(primaries.map((identity) => identity.title.toLowerCase()));
  if (titles.size > 1) return false;

  const sizes = primaries.map((identity) => identity.size?.key);
  return sizes.every(Boolean) && new Set(sizes).size === sizes.length;
}

export type GroupingResult = {
  groups: VariantGroup[];
  /** Identities per group key, in the same order as `group.members`. */
  identities: Map<string, ProductIdentity[]>;
};

/** Deterministically partitions products into variant groups. No product is ever dropped. */
export function groupProducts(products: SourceProduct[]): GroupingResult {
  const buckets = new Map<string, ProductIdentity[]>();
  const push = (key: string, identity: ProductIdentity) => {
    const bucket = buckets.get(key);
    if (bucket) bucket.push(identity);
    else buckets.set(key, [identity]);
  };

  for (const product of products) {
    const identity = resolveIdentity(product);
    push(identity.groupKey, identity);
  }

  // Second pass: fold size-coded families into the group their model key names.
  const keysByModel = new Map<string, string[]>();
  buckets.forEach((bucket, key) => {
    const modelKeys = new Set(bucket.map((identity) => identity.modelKey));
    const modelKey = modelKeys.size === 1 ? bucket[0].modelKey : null;
    if (!modelKey) return;
    const keys = keysByModel.get(modelKey);
    if (keys) keys.push(key);
    else keysByModel.set(modelKey, [key]);
  });

  const modelOfBucket = new Map<string, string | null>();
  keysByModel.forEach((keys, modelKey) => {
    if (modelKey.includes("~")) return;
    const targetExists = buckets.has(modelKey) && !keys.includes(modelKey);
    if (keys.length + (targetExists ? 1 : 0) < 2) return;

    const sources = targetExists ? [...keys, modelKey] : keys;
    const merged = sources.flatMap((key) => buckets.get(key) as ProductIdentity[]);
    if (!isOneItemInSizes(merged)) return;

    const [modelStem, word] = modelKey.split("|");
    for (const key of sources) buckets.delete(key);
    buckets.set(modelKey, merged.map((identity) => ({ ...identity, groupKey: modelKey })));
    modelOfBucket.set(modelKey, modelKeyFor(modelStem, word));
  });

  const groups: VariantGroup[] = [];
  const identities = new Map<string, ProductIdentity[]>();

  Array.from(buckets.keys())
    .sort()
    .forEach((key) => {
      const bucket = buckets.get(key) as ProductIdentity[];
      const modelKeys = new Set(bucket.map((identity) => identity.modelKey));
      const modelKey = modelOfBucket.has(key)
        ? (modelOfBucket.get(key) as string | null)
        : modelKeys.size === 1
          ? bucket[0].modelKey
          : null;
      const built = buildGroup(key, modelKey, bucket);
      groups.push(built.group);
      identities.set(key, built.identities);
    });

  return { groups, identities };
}

/* -------------------------------------------------------------------------- */
/*                               Variant lookup                               */
/* -------------------------------------------------------------------------- */

export type VariantIndex = {
  groupByProductId: Map<string, VariantGroup>;
  groupsByModel: Map<string, VariantGroup[]>;
};

export function buildVariantIndex(groups: VariantGroup[]): VariantIndex {
  const groupByProductId = new Map<string, VariantGroup>();
  const groupsByModel = new Map<string, VariantGroup[]>();

  for (const group of groups) {
    for (const member of group.members) groupByProductId.set(member.id, group);
    if (group.modelKey) {
      const siblings = groupsByModel.get(group.modelKey);
      if (siblings) siblings.push(group);
      else groupsByModel.set(group.modelKey, [group]);
    }
  }

  return { groupByProductId, groupsByModel };
}

function primariesOf(group: VariantGroup): GroupMember[] {
  return group.members.filter((member) => !member.duplicateOf);
}

function pickMember(group: VariantGroup, preferred: GroupMember): GroupMember {
  const members = primariesOf(group);
  const sizeKey = preferred.values.size?.key;
  const sameSize = sizeKey ? members.filter((member) => member.values.size?.key === sizeKey) : [];
  return (
    sameSize.find((member) => member.purchasable) ??
    members.find((member) => member.purchasable) ??
    sameSize[0] ??
    members[0]
  );
}

/**
 * How sibling groups are told apart: by colour when each has its own, else by
 * whatever is unique in each title, else by article number.
 */
function siblingLabels(siblings: VariantGroup[]): { axisLabel: string; labels: string[] } {
  const colors = siblings.map((group) => group.color?.label ?? null);
  if (colors.every(Boolean) && new Set(colors).size === colors.length) {
    return { axisLabel: "Колір", labels: colors as string[] };
  }

  const titleTokens = siblings.map((group) => tokenize(group.title));
  const common = commonTokens(titleTokens);
  const differences = titleTokens.map((tokens) => tokens.filter((token) => !common.has(token.toLowerCase())).join(" "));
  const allColored = colors.every(Boolean);

  const labels = siblings.map((group, index) => {
    if (allColored) return colors[index] as string;
    return capitalize(differences[index]) || group.color?.label || primariesOf(group)[0]?.articleNumber || "—";
  });

  // Labels taken from titles count as colours when they read as colour words.
  const looksLikeColors = labels.every((label) => (normalizeColor(label)?.swatch.length ?? 0) > 0);
  return { axisLabel: allColored || looksLikeColors ? "Колір" : "Варіант", labels };
}

/** Everything the product page needs to let a shopper switch size or colour. */
export function getProductVariants(index: VariantIndex, productId: string): ProductVariants | null {
  const group = index.groupByProductId.get(productId);
  if (!group) return null;
  const current = group.members.find((member) => member.id === productId);
  if (!current) return null;

  const members = primariesOf(group);

  const axes: VariantAxis[] = group.axes.map((axis) => {
    const otherAxes = group.axes.filter((other) => other.key !== axis.key);
    const seen = new Set<string>();
    const options: VariantAxis["options"] = [];

    for (const member of members) {
      const value = member.values[axis.key];
      if (!value || seen.has(value.key)) continue;
      seen.add(value.key);

      const selected = current.values[axis.key]?.key === value.key;
      const candidates = members.filter((candidate) => candidate.values[axis.key]?.key === value.key);
      const exact = candidates.find((candidate) =>
        otherAxes.every((other) => candidate.values[other.key]?.key === current.values[other.key]?.key),
      );
      const target = exact ?? candidates.find((candidate) => candidate.purchasable) ?? candidates[0];

      options.push({
        value: value.key,
        label: value.label,
        // The selected option always points at the page being viewed.
        productId: selected && exact ? current.id : target.id,
        selected,
        purchasable: exact ? exact.purchasable || (selected && current.purchasable) : candidates.some((candidate) => candidate.purchasable),
        exact: Boolean(exact),
      });
    }

    return { ...axis, options };
  });

  let siblingAxisLabel: string | null = null;
  let siblingOptions: SiblingOption[] = [];
  const siblings = group.modelKey ? index.groupsByModel.get(group.modelKey) ?? [] : [];
  if (siblings.length > 1) {
    const { axisLabel, labels } = siblingLabels(siblings);
    siblingAxisLabel = axisLabel;
    siblingOptions = siblings
      .map((sibling, position): SiblingOption => {
        const isCurrent = sibling.key === group.key;
        const member = isCurrent ? current : pickMember(sibling, current);
        return {
          productId: member.id,
          label: labels[position],
          image: member.image ?? sibling.members.find((candidate) => candidate.image)?.image ?? null,
          swatch: sibling.color?.swatch ?? normalizeColor(labels[position])?.swatch ?? [],
          selected: isCurrent,
          purchasable: sibling.members.some((candidate) => candidate.purchasable),
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "uk"));
  }

  return {
    groupKey: group.key,
    title: group.title,
    axes,
    siblingAxisLabel,
    siblings: siblingOptions,
    totalVariants: members.length,
    purchasableVariants: members.filter((member) => member.purchasable).length,
  };
}
