/**
 * QA v1.2 : tirage de session 15 cartes, comparé à une formule RG-142 réécrite indépendamment
 * (grille complète n = 0..40, r = 0..40 et 120 graines par cellule échantillonnée).
 */
import { composeSession, MAX_NEW_PER_SESSION, SESSION_SIZE } from '../session';
import { createSeededRng } from '../random';
import type { Word } from '../types';
import { fakeWords, progressFor } from './helpers';

/** RG-142, lu dans la spec : renvoie [nouveaux, révisions] attendus. */
function expected(n: number, r: number): [number, number] {
  let newCount = Math.min(n, 5);
  let reviewCount = Math.min(r, 10);
  if (reviewCount < 10) newCount = Math.min(n, 5 + (10 - reviewCount));
  if (newCount < 5 || n <= newCount) reviewCount = Math.min(r, 15 - newCount);
  return [newCount, reviewCount];
}

describe('QA v1.2 : composeSession vs RG-142 (grille complète)', () => {
  it('constantes', () => {
    expect(SESSION_SIZE).toBe(15);
    expect(MAX_NEW_PER_SESSION).toBe(5);
  });
  it('tableau RG-142 du PM', () => {
    const rows: [number, number, number, number][] = [
      [5, 10, 5, 10], [200, 0, 15, 0], [20, 8, 7, 8], [10, 5, 10, 5], [2, 30, 2, 13], [0, 40, 0, 15], [4, 6, 4, 6], [9, 5, 9, 5], [0, 0, 0, 0],
    ];
    for (const [n, r, en, er] of rows) expect(expected(n, r)).toEqual([en, er]);
  });
  it('toutes les cellules (n, r) : taille, comptes, unicité', () => {
    for (let n = 0; n <= 40; n++) {
      for (let r = 0; r <= 40; r++) {
        const all: Word[] = fakeWords(n + r);
        const progress = progressFor(all.slice(n), 2);
        const [en, er] = expected(n, r);
        for (const seed of [1, 7, 99]) {
          const s = composeSession(all, progress, createSeededRng(seed));
          const ids = s.map((w) => w.id);
          expect(new Set(ids).size).toBe(ids.length);
          const nNew = s.filter((w) => !progress[w.id]).length;
          expect([nNew, s.length - nNew]).toEqual([en, er]);
          expect(s.length).toBe(Math.min(15, n + r));
        }
      }
    }
  });
});
