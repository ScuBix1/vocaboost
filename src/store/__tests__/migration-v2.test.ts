/**
 * Migration du store v1 → v2 (v1.2, RG-146, RG-147, AC-18.1 → AC-18.10).
 * Partie pure (`migrateLearnerData`) puis intégration avec AsyncStorage simulé et relances successives.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WORDS } from '@/data/words';
import { createInitialData, migrateLearnerData, sanitizePersistedData } from '@/domain/learnerState';
import { DAILY_GOAL_OPTIONS, DEFAULT_DAILY_GOAL } from '@/domain/types';

import { STORAGE_KEY, STORAGE_VERSION, useLearnerStore } from '../useLearnerStore';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const richState = (dailyGoal: unknown) => ({
  progress: { kitchen: { box: 3, seenCount: 2, firstSeenAt: '2026-10-05T08:00:00.000Z', lastSeenAt: '2026-10-06T08:00:00.000Z' } },
  activeDays: ['2026-10-05', '2026-10-06'],
  cardsPerDay: { '2026-10-05': 4, '2026-10-06': 10 },
  bestStreak: 3,
  testHistory: [
    { weekId: '2026-W41', finishedAt: '2026-10-06T10:00:00.000Z', total: 10, correct: 8, percent: 80, passed: true },
  ],
  filters: { categories: ['travel', 'food'], levels: ['A1', 'B2'] },
  dailyGoal,
});

describe('Constantes v1.2 (RG-146)', () => {
  it('STORAGE_VERSION = 2, défaut 15, options 10 / 15 / 20 / 30 dans l’ordre', () => {
    expect(STORAGE_VERSION).toBe(2);
    expect(DEFAULT_DAILY_GOAL).toBe(15);
    expect([...DAILY_GOAL_OPTIONS]).toEqual([10, 15, 20, 30]);
    expect(createInitialData().dailyGoal).toBe(15);
  });

  it('sanitizePersistedData accepte 10, 15, 20, 30, rejette 25 (→ 15) et ne convertit jamais 10', () => {
    for (const goal of [10, 15, 20, 30]) expect(sanitizePersistedData({ dailyGoal: goal }).dailyGoal).toBe(goal);
    for (const bad of [25, 0, -15, '15', null, undefined, NaN, 'abc']) {
      expect(sanitizePersistedData({ dailyGoal: bad }).dailyGoal).toBe(15);
    }
  });
});

describe('migrateLearnerData (pure)', () => {
  it('AC-18.4 : version 1 avec 10 → 15', () => {
    expect(migrateLearnerData(richState(10), 1).dailyGoal).toBe(15);
  });

  it('AC-18.5 : version 1 avec 20 → 20, 30 → 30, 15 → 15', () => {
    expect(migrateLearnerData(richState(20), 1).dailyGoal).toBe(20);
    expect(migrateLearnerData(richState(30), 1).dailyGoal).toBe(30);
    expect(migrateLearnerData(richState(15), 1).dailyGoal).toBe(15);
  });

  it('AC-18.5 : version 1 avec objectif absent ou invalide (25, « abc », null) → 15', () => {
    const { dailyGoal: _omit, ...withoutGoal } = richState(10);
    expect(migrateLearnerData(withoutGoal, 1).dailyGoal).toBe(15);
    for (const bad of [25, 'abc', null, '10', 10.5]) expect(migrateLearnerData(richState(bad), 1).dailyGoal).toBe(15);
  });

  it('AC-18.6 : version 1, tous les autres champs sont identiques avant / après', () => {
    const before = sanitizePersistedData(richState(10));
    const after = migrateLearnerData(richState(10), 1);
    expect({ ...after, dailyGoal: 0 }).toEqual({ ...before, dailyGoal: 0 });
    expect(after.progress.kitchen.box).toBe(3);
    expect(after.cardsPerDay).toEqual({ '2026-10-05': 4, '2026-10-06': 10 });
    expect(after.bestStreak).toBe(3);
    expect(after.testHistory).toHaveLength(1);
    expect(after.filters).toEqual({ categories: ['food', 'travel'], levels: ['A1', 'B2'] });
  });

  it('AC-18.7 : version 2 avec 10 → reste 10 (choix délibéré)', () => {
    expect(migrateLearnerData(richState(10), 2).dailyGoal).toBe(10);
  });

  it('AC-18.8 : version 3 (retour arrière d’app) → aucune conversion, aucun plantage', () => {
    expect(migrateLearnerData(richState(10), 3).dailyGoal).toBe(10);
    expect(migrateLearnerData({ ...richState(20), nouveauChamp: { a: 1 } }, 3).dailyGoal).toBe(20);
    expect(() => migrateLearnerData(richState(10), 99)).not.toThrow();
  });

  it('AC-18.8 : données corrompues (toutes versions) → état vierge, objectif 15, sans exception', () => {
    for (const version of [0, 1, 2, 3]) {
      for (const raw of [null, undefined, 42, 'x', [], true, { progress: 'x', filters: null }]) {
        expect(migrateLearnerData(raw, version)).toEqual(createInitialData());
      }
    }
  });

  it('idempotence : migrer deux fois (la 2e fois en v2) donne le même résultat', () => {
    const once = migrateLearnerData(richState(10), 1);
    expect(migrateLearnerData(once, 2)).toEqual(once);
    expect(migrateLearnerData(once, 1)).toEqual(once); // 15 n'est pas 10 : rien ne bouge non plus
    const twenty = migrateLearnerData(richState(20), 1);
    expect(migrateLearnerData(twenty, 2)).toEqual(twenty);
  });

  it('ne modifie pas l’objet reçu', () => {
    const input = richState(10);
    const copy = JSON.parse(JSON.stringify(input));
    migrateLearnerData(input, 1);
    expect(input).toEqual(copy);
  });
});

describe('Store : migration à la lecture (AsyncStorage simulé)', () => {
  const storeV1 = (dailyGoal: unknown, version = 1) =>
    JSON.stringify({ version, state: richState(dailyGoal) });

  /** Relance : mémoire vierge puis relecture du « disque ». */
  async function relaunch() {
    await flush();
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    useLearnerStore.setState({ ...createInitialData(), hasHydrated: false });
    await flush();
    if (stored === null) await AsyncStorage.removeItem(STORAGE_KEY);
    else await AsyncStorage.setItem(STORAGE_KEY, stored);
    await useLearnerStore.persist.rehydrate();
    await flush();
  }
  const onDisk = async () => JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);

  beforeEach(async () => {
    await AsyncStorage.clear();
    useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
    await flush();
  });

  it('AC-18.1 : installation neuve → objectif 15, écrit en version 2', async () => {
    await relaunch();
    expect(useLearnerStore.getState().dailyGoal).toBe(15);
    useLearnerStore.getState().evaluateCard(WORDS[0].id, true);
    await flush();
    const disk = await onDisk();
    expect(disk.version).toBe(2);
    expect(disk.state.dailyGoal).toBe(15);
  });

  it('AC-18.4 / AC-18.10 : store v1 avec 10 → 15, version 2 sur disque, compteur du jour conservé', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, storeV1(10));
    await relaunch();
    const state = useLearnerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.dailyGoal).toBe(15);
    expect(state.cardsPerDay['2026-10-06']).toBe(10); // 10 / 15 (RG-148)
    expect(state.progress.kitchen.box).toBe(3);
    expect(state.bestStreak).toBe(3);
    expect((await onDisk()).version).toBe(2);
  });

  it('AC-18.5 : store v1 avec 20 ou 30 → conservé', async () => {
    for (const goal of [20, 30]) {
      await AsyncStorage.setItem(STORAGE_KEY, storeV1(goal));
      await relaunch();
      expect(useLearnerStore.getState().dailyGoal).toBe(goal);
    }
  });

  it('AC-18.5 : store v1 avec objectif invalide (25, « abc ») → 15', async () => {
    for (const bad of [25, 'abc']) {
      await AsyncStorage.setItem(STORAGE_KEY, storeV1(bad));
      await relaunch();
      expect(useLearnerStore.getState().dailyGoal).toBe(15);
    }
  });

  it('AC-18.7 : après migration, choisir 10 puis relancer deux fois → reste 10 (ne se rejoue pas)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, storeV1(10));
    await relaunch();
    expect(useLearnerStore.getState().dailyGoal).toBe(15);
    useLearnerStore.getState().setDailyGoal(10);
    await flush();
    expect((await onDisk()).state.dailyGoal).toBe(10);
    await relaunch();
    expect(useLearnerStore.getState().dailyGoal).toBe(10);
    await relaunch();
    expect(useLearnerStore.getState().dailyGoal).toBe(10);
    expect((await onDisk()).version).toBe(2);
  });

  it('AC-18.7 : deux lancements successifs d’un store v1 donnent le même état (idempotence)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, storeV1(10));
    await relaunch();
    const first = JSON.stringify(useLearnerStore.getState().dailyGoal);
    await relaunch();
    expect(JSON.stringify(useLearnerStore.getState().dailyGoal)).toBe(first);
  });

  it('AC-18.7 : store écrit en version 2 avec 10 → reste 10', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, storeV1(10, 2));
    await relaunch();
    expect(useLearnerStore.getState().dailyGoal).toBe(10);
  });

  it('AC-18.8 : store en version 3 → pas de plantage, pas de conversion', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, storeV1(10, 3));
    await relaunch();
    const state = useLearnerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.dailyGoal).toBe(10);
    expect(state.progress.kitchen.box).toBe(3);
  });

  it('AC-18.8 : JSON corrompu → état vierge avec objectif 15, sans plantage', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{pas du json');
    await relaunch();
    const state = useLearnerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.dailyGoal).toBe(15);
    expect(state.progress).toEqual({});
  });

  it('AC-18.9 : réinitialiser la progression conserve l’objectif choisi, y compris 15', () => {
    const store = useLearnerStore.getState();
    store.evaluateCard(WORDS[0].id, true);
    useLearnerStore.getState().resetProgress();
    expect(useLearnerStore.getState().dailyGoal).toBe(15);
    useLearnerStore.getState().setDailyGoal(10);
    useLearnerStore.getState().resetProgress();
    expect(useLearnerStore.getState().dailyGoal).toBe(10);
  });
});
