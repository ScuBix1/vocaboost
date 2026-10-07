/**
 * Mots du jour et passes de révision (v1.1 : RG-100 → RG-115, US-11 → US-13).
 * Logique pure, lecture seule : aucune fonction ne modifie l'état persisté (RG-120).
 * La date (`now`) et le hasard (`rng`) sont injectables.
 */
import { toLocalDateKey } from './dates';
import { shuffle, type Rng } from './random';
import type { ProgressMap, Word, WordProgress } from './types';

/** État affiché sur une ligne de la liste, dérivé de la boîte (RG-105, D-03). */
export type DailyStatus = 'known' | 'toReview';

export interface DailyWord {
  word: Word;
  progress: WordProgress;
  status: DailyStatus;
}

/** `box = 0` → « À revoir », sinon « Su » (RG-105). */
export function dailyStatus(progress: WordProgress): DailyStatus {
  return progress.box === 0 ? 'toReview' : 'known';
}

/** Mot du jour : vu au moins une fois ET `lastSeenAt` valide à la date locale de `now` (RG-100). */
export function isDailyWord(progress: WordProgress | undefined, now: Date): boolean {
  if (!progress || !(progress.seenCount >= 1) || !progress.lastSeenAt) return false;
  const seenAt = new Date(progress.lastSeenAt);
  if (Number.isNaN(seenAt.getTime())) return false;
  return toLocalDateKey(seenAt) === toLocalDateKey(now);
}

/**
 * Ordre total déterministe (RG-106) : « À revoir » d'abord, puis boîte croissante,
 * puis `lastSeenAt` décroissant, puis mot anglais alphabétique (puis id).
 */
export function compareDailyWords(a: DailyWord, b: DailyWord): number {
  if (a.status !== b.status) return a.status === 'toReview' ? -1 : 1;
  if (a.progress.box !== b.progress.box) return a.progress.box - b.progress.box;
  const timeA = new Date(a.progress.lastSeenAt ?? 0).getTime();
  const timeB = new Date(b.progress.lastSeenAt ?? 0).getTime();
  if (timeA !== timeB) return timeB - timeA;
  if (a.word.en !== b.word.en) return a.word.en < b.word.en ? -1 : 1;
  return a.word.id < b.word.id ? -1 : a.word.id > b.word.id ? 1 : 0;
}

export function sortDailyWords(items: readonly DailyWord[]): DailyWord[] {
  return [...items].sort(compareDailyWords);
}

/**
 * Mots du jour triés (RG-100 → RG-104, RG-106). Les filtres de session ne s'appliquent pas
 * (RG-104). Un id absent de la banque est ignoré (RG-103) ; un mot n'apparaît qu'une fois (RG-101).
 */
export function getTodayWords(words: readonly Word[], progress: ProgressMap, now: Date): DailyWord[] {
  const items: DailyWord[] = [];
  for (const word of words) {
    const p = progress[word.id];
    if (p && isDailyWord(p, now)) items.push({ word, progress: p, status: dailyStatus(p) });
  }
  return sortDailyWords(items);
}

/**
 * Ordre d'une passe (RG-111) : groupes par boîte croissante (boîte 0 d'abord),
 * mélange à l'intérieur de chaque groupe avec `rng`. Chaque mot apparaît une fois (AC-12.4).
 */
export function buildReviewQueue(words: readonly Word[], progress: ProgressMap, rng: Rng): Word[] {
  const groups = new Map<number, Word[]>();
  for (const word of words) {
    const box = progress[word.id]?.box ?? 0;
    const group = groups.get(box);
    if (group) group.push(word);
    else groups.set(box, [word]);
  }
  return [...groups.keys()]
    .sort((a, b) => a - b)
    .flatMap((box) => shuffle(groups.get(box) ?? [], rng));
}

export type ReviewMode = 'daily' | 'hard';

/** Passe de révision en cours : entièrement en mémoire, jamais persistée (RG-120). */
export interface ReviewPass {
  mode: ReviewMode;
  /** Instantané ordonné des mots de la passe, figé au démarrage (RG-102). */
  queue: readonly Word[];
  /** Nombre de cartes déjà traitées (= indice de la carte courante). */
  index: number;
  retainedIds: readonly string[];
  /** Mots marqués « À revoir encore » pendant cette passe (RG-114). */
  hardIds: readonly string[];
}

export function startReviewPass(
  words: readonly Word[],
  progress: ProgressMap,
  mode: ReviewMode,
  rng: Rng,
): ReviewPass {
  return { mode, queue: buildReviewQueue(words, progress, rng), index: 0, retainedIds: [], hardIds: [] };
}

export function isPassDone(pass: ReviewPass): boolean {
  return pass.index >= pass.queue.length;
}

export function currentCard(pass: ReviewPass): Word | undefined {
  return pass.queue[pass.index];
}

/** Enregistre le choix sur la carte courante et passe à la suivante (RG-112, pas de retour arrière). */
export function answerReviewCard(pass: ReviewPass, retained: boolean): ReviewPass {
  const card = currentCard(pass);
  if (!card) return pass;
  return {
    ...pass,
    index: pass.index + 1,
    retainedIds: retained ? [...pass.retainedIds, card.id] : pass.retainedIds,
    hardIds: retained ? pass.hardIds : [...pass.hardIds, card.id],
  };
}

/** Sous-ensemble « À revoir encore » de la passe, dans l'ordre de la passe (RG-114). */
export function hardWords(pass: ReviewPass): Word[] {
  const marked = new Set(pass.hardIds);
  return pass.queue.filter((w) => marked.has(w.id));
}
