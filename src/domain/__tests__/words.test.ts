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

/**
 * Traductions françaises des exemples (v1.2, RG-155 → RG-157, AC-23.1) : les 9 contrôles automatiques.
 * `checkExampleFr` renvoie la liste des contrôles en échec : vide = traduction valide.
 */
const ENGLISH_STOPWORDS = ['the', 'is', 'are', 'was', 'were', 'and', 'to', 'of', 'my', 'your', 'his', 'her', 'with', 'you', 'we'];
/**
 * Contrôle 8 : le mot anglais cible ne doit pas rester tel quel dans la traduction, sauf emprunts
 * et mots identiques en français (la comparaison ignore casse et accents) :
 * - « train » et « promotion » s'écrivent pareil dans les deux langues ;
 * - « hotel » : « hôtel » en français (même mot, sans l'accent).
 */
const SAME_WORD_WHITELIST = new Set(['train', 'promotion', 'hotel']);
const ANY_QUOTE = /^["'«“”‘’»]|["'«“”‘’»]$/;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const tokens = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean);
const lettersOnly = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');

function checkExampleFr(w: { en: string; example: string; exampleFr?: unknown }): string[] {
  const failures: string[] = [];
  const fr = w.exampleFr;
  // 1. chaîne, trim identique, non vide
  if (typeof fr !== 'string' || fr.length === 0 || fr.trim() !== fr) return ['1: chaîne non vide sans espace en bordure'];
  // 2. longueur ≤ 120
  if (fr.length > 120) failures.push('2: > 120 caractères');
  // 3. différent de l'exemple (casse, espaces, ponctuation ignorés)
  if (lettersOnly(fr) === lettersOnly(w.example)) failures.push('3: identique à l’exemple');
  // 4. pas de retour à la ligne, de double espace, de guillemet englobant
  if (/[\r\n]/.test(fr) || /\s{2}/.test(fr) || ANY_QUOTE.test(fr)) failures.push('4: forme (ligne, double espace, guillemet)');
  // 5. même caractère final que l'exemple parmi . ! ?
  const last = w.example.slice(-1);
  if (!'.!?'.includes(last) || fr.slice(-1) !== last) failures.push('5: ponctuation finale différente');
  // 6. rapport de longueur
  const ratio = fr.length / w.example.length;
  if (ratio < 0.5 || ratio > 2.5) failures.push(`6: rapport de longueur ${ratio.toFixed(2)}`);
  // 7. moins de 2 mots-outils anglais
  const stop = tokens(fr).filter((t) => ENGLISH_STOPWORDS.includes(t));
  if (stop.length >= 2) failures.push(`7: anglais résiduel (${stop.join(', ')})`);
  // 8. le mot anglais cible n'apparaît pas tel quel (hors liste blanche)
  const target = normalize(w.en).trim();
  if (!SAME_WORD_WHITELIST.has(target) && ` ${tokens(fr).join(' ')} `.includes(` ${tokens(target).join(' ')} `)) {
    failures.push('8: mot anglais cible présent');
  }
  return failures;
}

describe('Traductions des exemples (RG-155 → RG-157, AC-23.1)', () => {
  it('RG-155 : les 200 mots ont un exampleFr', () => {
    expect(WORDS.filter((w) => typeof w.exampleFr === 'string' && w.exampleFr.length > 0)).toHaveLength(200);
  });

  it('RG-157 contrôles 1 à 8 : valides pour les 200 mots', () => {
    const report = WORDS.map((w) => ({ id: w.id, failures: checkExampleFr(w) })).filter((r) => r.failures.length > 0);
    expect(report).toEqual([]);
  });

  it('RG-157 contrôle 9 : aucun doublon exact d’exampleFr', () => {
    expect(new Set(WORDS.map((w) => w.exampleFr)).size).toBe(200);
  });

  it('RG-156 : espace insécable avant « ! ? : ; », jamais d’espace ordinaire ; apostrophe typographique', () => {
    for (const w of WORDS) {
      expect(w.exampleFr).not.toMatch(/ [!?:;]/);
      expect(w.exampleFr).not.toContain("'");
      if (/[!?]$/.test(w.exampleFr)) expect(w.exampleFr).toMatch(/ [!?]$/);
    }
  });

  it('RG-156 : même nombre de chiffres que l’exemple (pas de nombre inventé)', () => {
    for (const w of WORDS) {
      expect(w.exampleFr.match(/\d+/g) ?? []).toEqual(w.example.match(/\d+/g) ?? []);
    }
  });

  describe('test négatif : les contrôles détectent les défauts (AC-23.1)', () => {
    const base = { en: 'kitchen', example: 'We usually eat breakfast in the kitchen.' };
    const good = 'Nous prenons le petit-déjeuner dans la cuisine.';

    it('une traduction correcte passe', () => {
      expect(checkExampleFr({ ...base, exampleFr: good })).toEqual([]);
    });

    it.each([
      ['absent', undefined, '1'],
      ['vide', '', '1'],
      ['espace en bordure', `${good} `, '1'],
      ['trop long', `${good.slice(0, -1)} ${'très '.repeat(30)}grande.`, '2'],
      ['copie de l’exemple', base.example, '3'],
      ['double espace', 'Nous prenons  le petit-déjeuner dans la cuisine.', '4'],
      ['guillemet englobant', `« ${good} »`, '4'],
      ['ponctuation finale différente', 'Nous prenons le petit-déjeuner dans la cuisine !', '5'],
      ['tronquée (rapport < 0,5)', 'Nous mangeons.', '6'],
      ['anglais résiduel', 'We usually eat the petit-déjeuner dans la cuisine.', '7'],
      ['mot anglais cible resté', 'Nous prenons le petit-déjeuner dans la kitchen.', '8'],
    ])('%s → contrôle %s en échec', (_label, exampleFr, check) => {
      const failures = checkExampleFr({ ...base, exampleFr });
      expect(failures.some((f) => f.startsWith(`${check}:`))).toBe(true);
    });

    it('vider un exampleFr de la banque ferait échouer le contrôle', () => {
      const w = WORDS[0];
      expect(checkExampleFr({ ...w, exampleFr: '' })).not.toEqual([]);
    });
  });
});
