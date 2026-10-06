import {
  BOX_WEIGHTS,
  boxWeight,
  getWordProgress,
  isMastered,
  isSeen,
  nextBox,
  recordEvaluation,
} from '../leitner';

describe('Boîtes de Leitner (RG-10 → RG-13)', () => {
  const now = new Date('2026-10-06T08:30:00.000Z');

  it('RG-10 : un mot inconnu démarre en boîte 0 avec seenCount = 0', () => {
    const p = getWordProgress({}, 'kitchen');
    expect(p).toEqual({ box: 0, seenCount: 0, firstSeenAt: null, lastSeenAt: null });
    expect(isSeen(p)).toBe(false);
  });

  it('AC-03.4 / RG-11 : « Je savais » boîte 2 → 3, boîte 5 reste 5', () => {
    expect(nextBox(2, true)).toBe(3);
    expect(nextBox(5, true)).toBe(5);
  });

  it('AC-03.5 / RG-12 : « Je ne savais pas » boîte 4 → 0 et le mot n’est plus maîtrisé', () => {
    const before = { kitchen: { box: 4, seenCount: 3, firstSeenAt: 'x', lastSeenAt: 'x' } };
    expect(isMastered(before.kitchen)).toBe(true);
    const after = recordEvaluation(before, 'kitchen', false, now);
    expect(after.kitchen.box).toBe(0);
    expect(isMastered(after.kitchen)).toBe(false);
  });

  it('RG-13 : chaque évaluation incrémente seenCount, fixe lastSeenAt et firstSeenAt la 1re fois', () => {
    const first = recordEvaluation({}, 'door', true, now);
    expect(first.door).toEqual({
      box: 1,
      seenCount: 1,
      firstSeenAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
    });
    const later = new Date('2026-10-07T09:00:00.000Z');
    const second = recordEvaluation(first, 'door', true, later);
    expect(second.door.seenCount).toBe(2);
    expect(second.door.firstSeenAt).toBe(now.toISOString());
    expect(second.door.lastSeenAt).toBe(later.toISOString());
  });

  it('recordEvaluation est immuable', () => {
    const before = {};
    recordEvaluation(before, 'door', true, now);
    expect(before).toEqual({});
  });

  it('RG-24 : poids 16/8/4/2/1/0,5 (boîte 0 = 32 × boîte 5)', () => {
    expect(BOX_WEIGHTS).toEqual([16, 8, 4, 2, 1, 0.5]);
    expect(boxWeight(0) / boxWeight(5)).toBe(32);
  });

  it('spec §3 : maîtrisé = vu et boîte ≥ 4', () => {
    expect(isMastered({ box: 3, seenCount: 2, firstSeenAt: null, lastSeenAt: null })).toBe(false);
    expect(isMastered({ box: 4, seenCount: 2, firstSeenAt: null, lastSeenAt: null })).toBe(true);
  });
});
