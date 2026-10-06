import { TOTAL_WORDS, WORDS, WORDS_BY_ID } from '@/data/words';

import { CATEGORY_IDS, CATEGORY_LABELS, LEVELS } from '../types';

describe('Banque de mots (RG-01 → RG-06)', () => {
  it('RG-01 : contient exactement 200 mots', () => {
    expect(WORDS).toHaveLength(200);
    expect(TOTAL_WORDS).toBe(200);
  });

  it('RG-02 : chaque mot a tous ses champs valides', () => {
    for (const w of WORDS) {
      expect(w.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(w.en.trim()).toBe(w.en);
      expect(w.en.length).toBeGreaterThan(0);
      expect(w.fr.trim()).toBe(w.fr);
      expect(w.fr.length).toBeGreaterThan(0);
      expect(CATEGORY_IDS).toContain(w.category);
      expect(LEVELS).toContain(w.level);
    }
  });

  it('RG-02 : la phrase d’exemple contient le mot et fait au plus 120 caractères', () => {
    for (const w of WORDS) {
      expect(w.example.length).toBeLessThanOrEqual(120);
      expect(w.example.toLowerCase()).toContain(w.en.toLowerCase());
    }
  });

  it('RG-03 : aucun doublon d’id, de mot anglais ni de traduction', () => {
    const unique = (values: string[]) => new Set(values.map((v) => v.toLowerCase())).size;
    expect(unique(WORDS.map((w) => w.id))).toBe(200);
    expect(unique(WORDS.map((w) => w.en))).toBe(200);
    expect(unique(WORDS.map((w) => w.fr))).toBe(200);
    expect(WORDS_BY_ID.size).toBe(200);
  });

  it('RG-04 : 10 catégories de 20 mots, libellés français', () => {
    expect(CATEGORY_IDS).toHaveLength(10);
    for (const c of CATEGORY_IDS) {
      expect(WORDS.filter((w) => w.category === c)).toHaveLength(20);
    }
    expect(Object.values(CATEGORY_LABELS)).toEqual([
      'Maison',
      'Nourriture',
      'Voyage',
      'Travail',
      'École',
      'Corps & santé',
      'Nature & animaux',
      'Émotions & personnalité',
      'Temps & calendrier',
      'Verbes courants',
    ]);
  });

  it('RG-05 : A1 = 50, A2 = 60, B1 = 50, B2 = 40, chaque catégorie couvre les 4 niveaux', () => {
    const count = (level: string) => WORDS.filter((w) => w.level === level).length;
    expect(count('A1')).toBe(50);
    expect(count('A2')).toBe(60);
    expect(count('B1')).toBe(50);
    expect(count('B2')).toBe(40);
    for (const c of CATEGORY_IDS) {
      for (const l of LEVELS) {
        expect(WORDS.some((w) => w.category === c && w.level === l)).toBe(true);
      }
    }
  });

  it('RG-02 : ids stables dérivés du mot anglais', () => {
    expect(WORDS_BY_ID.get('kitchen')?.fr).toBe('cuisine');
    expect(WORDS_BY_ID.get('jet-lag')?.en).toBe('jet lag');
  });
});
