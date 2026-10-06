/**
 * Filtres de session par catégorie et niveau (RG-50 → RG-53, US-06).
 */
import { CATEGORY_IDS, CATEGORY_LABELS, LEVELS, type CategoryId, type Filters, type Level, type Word } from './types';

export const DEFAULT_FILTERS: Filters = {
  categories: [...CATEGORY_IDS],
  levels: [...LEVELS],
};

/** Pool d'une session : catégorie ET niveau sélectionnés (RG-51). */
export function filterPool(words: readonly Word[], filters: Filters): Word[] {
  const categories = new Set(filters.categories);
  const levels = new Set(filters.levels);
  return words.filter((w) => categories.has(w.category) && levels.has(w.level));
}

/**
 * Bascule un élément d'un groupe en conservant l'ordre canonique.
 * Le dernier élément sélectionné ne peut pas être décoché (RG-50) : la liste est alors
 * renvoyée telle quelle et `blocked` vaut true.
 */
export function toggleInGroup<T extends string>(
  selected: readonly T[],
  item: T,
  canonicalOrder: readonly T[],
): { selected: T[]; blocked: boolean } {
  const isSelected = selected.includes(item);
  if (isSelected && selected.length <= 1) {
    return { selected: [...selected], blocked: true };
  }
  const next = isSelected ? selected.filter((x) => x !== item) : [...selected, item];
  return { selected: canonicalOrder.filter((x) => next.includes(x)), blocked: false };
}

export function toggleCategory(filters: Filters, category: CategoryId) {
  const { selected, blocked } = toggleInGroup(filters.categories, category, CATEGORY_IDS);
  return { filters: { ...filters, categories: selected }, blocked };
}

export function toggleLevel(filters: Filters, level: Level) {
  const { selected, blocked } = toggleInGroup(filters.levels, level, LEVELS);
  return { filters: { ...filters, levels: selected }, blocked };
}

export function allCategoriesSelected(filters: Filters): boolean {
  return CATEGORY_IDS.every((c) => filters.categories.includes(c));
}

export function allLevelsSelected(filters: Filters): boolean {
  return LEVELS.every((l) => filters.levels.includes(l));
}

/** Un filtre est actif si au moins un élément n'est pas sélectionné (RG-53). */
export function isFilterActive(filters: Filters): boolean {
  return !allCategoriesSelected(filters) || !allLevelsSelected(filters);
}

/**
 * Niveaux formatés : plage contiguë « A1-A2 », sinon liste « A1, B1 », niveau unique « A1 »
 * (design §4.1).
 */
export function formatLevels(levels: readonly Level[]): string {
  const ordered = LEVELS.filter((l) => levels.includes(l));
  if (ordered.length === 0) return '';
  if (ordered.length === 1) return ordered[0];
  const first = LEVELS.indexOf(ordered[0]);
  const last = LEVELS.indexOf(ordered[ordered.length - 1]);
  const contiguous = last - first + 1 === ordered.length;
  return contiguous ? `${ordered[0]}-${ordered[ordered.length - 1]}` : ordered.join(', ');
}

/** Catégories formatées : nom si une seule, sinon « {n} catégories » (design §4.1). */
export function formatCategoriesCount(categories: readonly CategoryId[]): string {
  if (categories.length === 1) return CATEGORY_LABELS[categories[0]];
  if (categories.length === CATEGORY_IDS.length) return 'toutes les catégories';
  return `${categories.length} catégories`;
}

/**
 * Résumé affiché sur l'Accueil (RG-53), ex. « Filtres : 2 catégories, A1-A2 »,
 * « Filtres : Voyage, A1 ». `null` quand aucun filtre n'est actif.
 */
export function formatFilterSummary(filters: Filters): string | null {
  if (!isFilterActive(filters)) return null;
  const levels = allLevelsSelected(filters) ? 'tous niveaux' : formatLevels(filters.levels);
  return `Filtres : ${formatCategoriesCount(filters.categories)}, ${levels}`;
}

/** Ligne « Catégories : … » de l'onglet Apprendre (design §4.2). */
export function describeCategories(filters: Filters): string {
  if (allCategoriesSelected(filters)) return 'Toutes';
  if (filters.categories.length <= 3) {
    return filters.categories.map((c) => CATEGORY_LABELS[c]).join(', ');
  }
  return `${filters.categories.length} catégories`;
}

/** Ligne « Niveaux : … » de l'onglet Apprendre (design §4.2). */
export function describeLevels(filters: Filters): string {
  if (allLevelsSelected(filters)) return 'Tous';
  return LEVELS.filter((l) => filters.levels.includes(l)).join(', ');
}
