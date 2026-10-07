import AsyncStorage from '@react-native-async-storage/async-storage';

import { WORDS } from '@/data/words';
import { toLocalDateKey } from '@/domain/dates';
import { createInitialData } from '@/domain/learnerState';

import { STORAGE_KEY, STORAGE_VERSION, useLearnerStore } from '../useLearnerStore';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Simule un redémarrage : état mémoire vierge puis relecture d'AsyncStorage. */
async function restart() {
  await flush();
  // setState déclenche une écriture : on restaure ensuite le contenu stocké « sur disque ».
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  useLearnerStore.setState({ ...createInitialData(), hasHydrated: false });
  await flush();
  if (stored === null) await AsyncStorage.removeItem(STORAGE_KEY);
  else await AsyncStorage.setItem(STORAGE_KEY, stored);
  await useLearnerStore.persist.rehydrate();
}

describe('Store persistant (RG-90 → RG-94)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useLearnerStore.setState({ ...createInitialData(), hasHydrated: true });
    await flush();
  });

  it('RG-90 : clé unique versionnée, seules les données sont persistées', async () => {
    useLearnerStore.getState().evaluateCard('kitchen', true);
    await flush();
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(STORAGE_VERSION);
    expect(Object.keys(parsed.state).sort()).toEqual(
      ['activeDays', 'bestStreak', 'cardsPerDay', 'dailyGoal', 'filters', 'progress', 'testHistory'].sort(),
    );
  });

  it('AC-10.1 / RG-14 / RG-92 : 3 cartes évaluées puis redémarrage → données identiques', async () => {
    const now = new Date();
    const { evaluateCard } = useLearnerStore.getState();
    evaluateCard(WORDS[0].id, true, now);
    evaluateCard(WORDS[1].id, false, now);
    evaluateCard(WORDS[2].id, true, now);
    const before = useLearnerStore.getState();
    const snapshot = {
      progress: before.progress,
      activeDays: before.activeDays,
      cardsPerDay: before.cardsPerDay,
      bestStreak: before.bestStreak,
    };
    await flush();

    await restart();
    const after = useLearnerStore.getState();
    expect(after.hasHydrated).toBe(true);
    expect(after.progress).toEqual(snapshot.progress);
    expect(after.activeDays).toEqual(snapshot.activeDays);
    expect(after.cardsPerDay[toLocalDateKey(now)]).toBe(3);
    expect(after.bestStreak).toBe(1);
  });

  it('AC-06.3 / AC-08.3 : filtres, objectif et historique persistent après redémarrage', async () => {
    const store = useLearnerStore.getState();
    store.toggleLevel('B2');
    store.toggleCategory('house');
    store.setDailyGoal(20);
    for (const w of WORDS.slice(0, 10)) useLearnerStore.getState().evaluateCard(w.id, true);
    const record = useLearnerStore
      .getState()
      .completeTest(WORDS.slice(0, 10).map((w) => ({ wordId: w.id, correct: true })));
    expect(record).not.toBeNull();
    await flush();

    await restart();
    const after = useLearnerStore.getState();
    expect(after.filters.levels).toEqual(['A1', 'A2', 'B1']);
    expect(after.filters.categories).not.toContain('house');
    expect(after.dailyGoal).toBe(20);
    expect(after.testHistory).toEqual([record]);
  });

  it('AC-06.2 : le store refuse de décocher le dernier niveau', () => {
    const store = useLearnerStore.getState();
    expect(store.toggleLevel('A1')).toBe(true);
    expect(store.toggleLevel('A2')).toBe(true);
    expect(store.toggleLevel('B1')).toBe(true);
    expect(useLearnerStore.getState().toggleLevel('B2')).toBe(false);
    expect(useLearnerStore.getState().filters.levels).toEqual(['B2']);
  });

  it('AC-10.4 / RG-93 : JSON corrompu → démarrage sur état vierge, sans crash', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{ceci n’est pas du JSON');
    await restart();
    const state = useLearnerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.progress).toEqual({});
    expect(state.testHistory).toEqual([]);
  });

  it('AC-10.4 / RG-93 : structure inattendue → valeurs vierges', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state: { progress: 'x', dailyGoal: 'beaucoup', filters: null } }),
    );
    await restart();
    const state = useLearnerStore.getState();
    expect(state.hasHydrated).toBe(true);
    expect(state.progress).toEqual({});
    expect(state.dailyGoal).toBe(15); // défaut v1.2 (RG-146)
    expect(state.filters.levels).toHaveLength(4);
  });

  it('AC-10.2 : réinitialisation conserve objectif et filtres', () => {
    const store = useLearnerStore.getState();
    store.setDailyGoal(30);
    store.toggleLevel('A1');
    useLearnerStore.getState().evaluateCard('kitchen', true);
    useLearnerStore.getState().resetProgress();
    const state = useLearnerStore.getState();
    expect(state.progress).toEqual({});
    expect(state.bestStreak).toBe(0);
    expect(state.dailyGoal).toBe(30);
    expect(state.filters.levels).toEqual(['A2', 'B1', 'B2']);
  });

  it('BUG-03 : lecture impossible (échecs répétés) → démarrage vierge, rien n’est écrit sur le disque', async () => {
    useLearnerStore.getState().evaluateCard('kitchen', true);
    await flush();
    const onDiskBefore = await AsyncStorage.getItem(STORAGE_KEY);
    const ioError = new Error('I/O');
    // Les 3 tentatives de lecture échouent (READ_ATTEMPTS).
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(ioError)
      .mockRejectedValueOnce(ioError)
      .mockRejectedValueOnce(ioError);
    useLearnerStore.setState({ hasHydrated: false });
    await useLearnerStore.persist.rehydrate();
    expect(useLearnerStore.getState().hasHydrated).toBe(true);
    // Toute modification ultérieure reste en mémoire : les données sur disque sont intactes.
    useLearnerStore.getState().resetProgress();
    useLearnerStore.getState().evaluateCard('door', false);
    await flush();
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(onDiskBefore);
    // Lancement suivant : la lecture réussit, les données d'origine sont retrouvées et l'écriture reprend.
    await useLearnerStore.persist.rehydrate();
    expect(useLearnerStore.getState().progress.kitchen.seenCount).toBe(1);
  });
});
