/**
 * Tests QA adversariaux — persistance, hydratation, migration (RG-90 → RG-94).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WORDS } from '@/data/words';
import { createInitialData } from '@/domain/learnerState';
import type { PersistedData } from '@/domain/types';

import { STORAGE_KEY, useLearnerStore } from '../useLearnerStore';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const savedState: PersistedData = {
  ...createInitialData(),
  progress: { [WORDS[0].id]: { box: 3, seenCount: 4, firstSeenAt: '2026-10-01T10:00:00.000Z', lastSeenAt: '2026-10-05T10:00:00.000Z' } },
  activeDays: ['2026-10-05'],
  cardsPerDay: { '2026-10-05': 12 },
  bestStreak: 7,
  dailyGoal: 20,
};

async function coldStartWith(raw: string | null) {
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: false });
  await flush();
  if (raw === null) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, raw);
  await useLearnerStore.persist.rehydrate();
  await flush();
}

describe('QA — hydratation et migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('migration : données en version 0 (antérieure) → reprises champ par champ', async () => {
    await coldStartWith(JSON.stringify({ state: savedState, version: 0 }));
    const s = useLearnerStore.getState();
    expect(s.hasHydrated).toBe(true);
    expect(s.progress[WORDS[0].id].box).toBe(3);
    expect(s.dailyGoal).toBe(20);
    expect(s.bestStreak).toBe(7);
  });

  it('migration : version future (2) → pas de crash, champs reconnus conservés', async () => {
    await coldStartWith(JSON.stringify({ state: { ...savedState, newField: 1 }, version: 2 }));
    const s = useLearnerStore.getState();
    expect(s.hasHydrated).toBe(true);
    expect(s.cardsPerDay).toEqual({ '2026-10-05': 12 });
  });

  it('JSON valide mais non objet ("null", "42", "[]") → démarrage vierge sans crash', async () => {
    for (const raw of ['null', '42', '[]', '"x"']) {
      await coldStartWith(raw);
      const s = useLearnerStore.getState();
      expect(s.hasHydrated).toBe(true);
      expect(s.progress).toEqual({});
    }
  });

  // BUG-03 (mineur) : une erreur de LECTURE transitoire est traitée comme « aucune donnée » ;
  // l'état vierge est alors réécrit sur disque et écrase la progression réelle.
  test.failing('BUG-03 : une lecture AsyncStorage en échec ne doit pas écraser les données stockées', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: savedState, version: 1 }));
    useLearnerStore.setState({ ...createInitialData(), hasHydrated: false });
    await flush();
    // On remet les vraies données « sur disque » (le setState ci-dessus a écrit l'état vierge).
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: savedState, version: 1 }));
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('SQLITE_BUSY'));
    await useLearnerStore.persist.rehydrate();
    await flush();
    expect(useLearnerStore.getState().hasHydrated).toBe(true);
    const onDisk = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(onDisk.state.bestStreak).toBe(7); // obtenu : 0 — progression perdue
  });

  it('réinitialisation puis redémarrage : état vierge persisté, objectif et filtres conservés', async () => {
    useLearnerStore.setState({ ...savedState, filters: { categories: ['travel'], levels: ['A1'] }, hasHydrated: true });
    useLearnerStore.getState().resetProgress();
    await flush();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    await coldStartWith(raw);
    const s = useLearnerStore.getState();
    expect(s.progress).toEqual({});
    expect(s.bestStreak).toBe(0);
    expect(s.cardsPerDay).toEqual({});
    expect(s.dailyGoal).toBe(20);
    expect(s.filters).toEqual({ categories: ['travel'], levels: ['A1'] });
  });
});
