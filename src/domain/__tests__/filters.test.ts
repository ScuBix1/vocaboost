import {
  DEFAULT_FILTERS,
  describeCategories,
  describeLevels,
  formatFilterSummary,
  formatLevels,
  isFilterActive,
  toggleCategory,
  toggleLevel,
} from '../filters';
import { CATEGORY_IDS, LEVELS } from '../types';

describe('Filtres de session (RG-50 → RG-53)', () => {
  it('RG-50 : par défaut tout est sélectionné', () => {
    expect(DEFAULT_FILTERS.categories).toEqual([...CATEGORY_IDS]);
    expect(DEFAULT_FILTERS.levels).toEqual([...LEVELS]);
    expect(isFilterActive(DEFAULT_FILTERS)).toBe(false);
  });

  it('AC-06.2 : impossible de décocher le dernier élément d’un groupe', () => {
    const onlyA1 = { ...DEFAULT_FILTERS, levels: ['A1' as const] };
    const result = toggleLevel(onlyA1, 'A1');
    expect(result.blocked).toBe(true);
    expect(result.filters.levels).toEqual(['A1']);

    const onlyTravel = { ...DEFAULT_FILTERS, categories: ['travel' as const] };
    expect(toggleCategory(onlyTravel, 'travel').blocked).toBe(true);
  });

  it('RG-50 : cocher/décocher conserve l’ordre canonique', () => {
    let filters = toggleLevel(DEFAULT_FILTERS, 'A2').filters;
    expect(filters.levels).toEqual(['A1', 'B1', 'B2']);
    filters = toggleLevel(filters, 'A2').filters;
    expect(filters.levels).toEqual(['A1', 'A2', 'B1', 'B2']);
  });

  it('AC-06.5 / RG-53 : résumé de l’accueil', () => {
    expect(formatFilterSummary(DEFAULT_FILTERS)).toBeNull();
    expect(formatFilterSummary({ categories: ['travel', 'food'], levels: ['A1', 'A2'] })).toBe(
      'Filtres : 2 catégories, A1-A2',
    );
    expect(formatFilterSummary({ categories: ['travel'], levels: ['A1'] })).toBe('Filtres : Voyage, A1');
    expect(formatFilterSummary({ categories: [...CATEGORY_IDS], levels: ['A1', 'B1'] })).toBe(
      'Filtres : toutes les catégories, A1, B1',
    );
    expect(formatFilterSummary({ categories: ['travel', 'food'], levels: [...LEVELS] })).toBe(
      'Filtres : 2 catégories, tous niveaux',
    );
  });

  it('design §4.1 : niveaux contigus « A1-B1 », sinon liste', () => {
    expect(formatLevels(['A1', 'A2', 'B1'])).toBe('A1-B1');
    expect(formatLevels(['A2', 'B2'])).toBe('A2, B2');
    expect(formatLevels(['B2'])).toBe('B2');
  });

  it('design §4.2 : descriptions de l’onglet Apprendre', () => {
    expect(describeCategories(DEFAULT_FILTERS)).toBe('Toutes');
    expect(describeLevels(DEFAULT_FILTERS)).toBe('Tous');
    expect(describeCategories({ categories: ['travel', 'work'], levels: ['A1'] })).toBe('Voyage, Travail');
    expect(describeLevels({ categories: ['travel'], levels: ['A1', 'B2'] })).toBe('A1, B2');
  });
});
