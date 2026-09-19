import {
  createTranslator,
  DEFAULT_LOCALE,
  type MessageKey,
  type Translator,
} from "@hoflayn/i18n";

/**
 * Ids are the stored values and must never change; the labels live in the
 * dictionaries under `craft.<id>.label` / `craft.<id>.description`.
 */
export const CRAFT_CATEGORIES = [
  { id: "ceramics" },
  { id: "candle" },
  { id: "wood" },
  { id: "epoxy" },
  { id: "textile" },
  { id: "other" },
] as const;

export type CraftCategoryId = (typeof CRAFT_CATEGORIES)[number]["id"];

export function craftLabelKey(id: CraftCategoryId): MessageKey {
  return `craft.${id}.label`;
}

export function craftDescriptionKey(id: CraftCategoryId): MessageKey {
  return `craft.${id}.description`;
}

export const CRAFT_CATEGORY_IDS = CRAFT_CATEGORIES.map((c) => c.id) as [
  CraftCategoryId,
  ...CraftCategoryId[],
];

export function isCraftCategory(value: string): value is CraftCategoryId {
  return CRAFT_CATEGORY_IDS.includes(value as CraftCategoryId);
}

const MAX_CRAFT_CATEGORIES = 3;

/** Stored as comma-separated ids in tenants.craft_category. */
export function parseCraftCategories(
  value: string | null | undefined,
): CraftCategoryId[] {
  if (!value?.trim()) return [];
  const seen = new Set<CraftCategoryId>();
  for (const part of value.split(/[,|]/)) {
    const id = part.trim();
    if (isCraftCategory(id) && !seen.has(id)) seen.add(id);
    if (seen.size >= MAX_CRAFT_CATEGORIES) break;
  }
  return [...seen];
}

export function serializeCraftCategories(ids: string[]): string {
  const unique: CraftCategoryId[] = [];
  for (const id of ids) {
    if (!isCraftCategory(id)) continue;
    if (!unique.includes(id)) unique.push(id);
    if (unique.length >= MAX_CRAFT_CATEGORIES) break;
  }
  if (!unique.length) {
    throw new CraftCategoryRequiredError();
  }
  return unique.join(",");
}

/** Matched by class so callers don't depend on the localized wording. */
export class CraftCategoryRequiredError extends Error {
  readonly messageKey: MessageKey = "craft.error.required";

  constructor() {
    super("At least one craft category is required.");
    this.name = "CraftCategoryRequiredError";
  }
}

/**
 * Human-readable labels for stored category ids. These end up in AI prompts and
 * catalog exports, so they follow the content locale — not the viewer's UI
 * locale — and default to Turkish until the content-locale setting is wired up.
 */
export function craftCategoryLabels(
  value: string | null | undefined,
  t: Translator = createTranslator(DEFAULT_LOCALE),
): string {
  return parseCraftCategories(value)
    .map((id) => t(craftLabelKey(id)))
    .join(", ");
}
