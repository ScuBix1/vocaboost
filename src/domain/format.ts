/**
 * Petits utilitaires de libellés français (design §4, conventions de pluriel).
 */

/** « 1 mot » / « 2 mots » ; 0 prend le pluriel (« 0 mots »). */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

/** « jour » pour 0 et 1, « jours » au-delà (design §4 : « 0 jour »). */
export function dayUnit(count: number): string {
  return count <= 1 ? 'jour' : 'jours';
}
