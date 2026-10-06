/**
 * Dates locales et semaines ISO 8601 (spec PM §3).
 * Toutes les fonctions reçoivent la date en paramètre : aucune horloge cachée.
 */

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** Date locale de l'appareil au format `YYYY-MM-DD`. */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Interprète une clé `YYYY-MM-DD` comme minuit local. */
export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Décale une clé de date locale de `days` jours calendaires (gère les changements d'heure). */
export function addDaysToKey(key: string, days: number): string {
  const date = parseLocalDateKey(key);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

export interface IsoWeek {
  year: number;
  week: number;
}

/**
 * Semaine ISO 8601 de la date, calculée sur la date LOCALE
 * (lundi 00:00 → dimanche 23:59:59 heure locale).
 */
export function getIsoWeek(date: Date): IsoWeek {
  // On reporte la date calendaire locale dans un Date UTC pour un calcul sans DST.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // lundi = 1 … dimanche = 7
  // Le jeudi de la semaine courante détermine l'année ISO.
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { year, week };
}

/** Identifiant de semaine `YYYY-Www` (ex. `2026-W41`). */
export function getWeekId(date: Date): string {
  const { year, week } = getIsoWeek(date);
  return `${year}-W${pad(week)}`;
}

/** « Semaine 41 – 2026 » à partir d'un identifiant `2026-W41` (AC-08.1). */
export function formatWeekLabel(weekId: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) return weekId;
  return `Semaine ${Number(match[2])} – ${match[1]}`;
}

/** Date locale `jj/mm/aaaa` d'un horodatage ISO. */
export function formatDateFr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
