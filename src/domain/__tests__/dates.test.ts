import { addDaysToKey, formatDateFr, formatWeekLabel, getWeekId, toLocalDateKey } from '../dates';

describe('Dates locales et semaines ISO (spec §3)', () => {
  it('date locale au format YYYY-MM-DD', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 9, 6, 0, 0))).toBe('2026-10-06');
  });

  it('addDaysToKey gère fins de mois, années bissextiles et années', () => {
    expect(addDaysToKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysToKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(addDaysToKey('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('§8 : 2026-12-31 → 2026-W53 (passage d’année)', () => {
    expect(getWeekId(new Date(2026, 11, 31, 12))).toBe('2026-W53');
  });

  it('§8 : 2027-01-04 → 2027-W01', () => {
    expect(getWeekId(new Date(2027, 0, 4, 0, 0))).toBe('2027-W01');
  });

  it('2027-01-01 à 03 appartiennent encore à 2026-W53', () => {
    expect(getWeekId(new Date(2027, 0, 3, 23, 59, 59))).toBe('2026-W53');
  });

  it('semaine 41 de 2026 : du lundi 5 octobre 00:00 au dimanche 11 octobre 23:59:59 (heure locale)', () => {
    expect(getWeekId(new Date(2026, 9, 4, 23, 59, 59))).toBe('2026-W40');
    expect(getWeekId(new Date(2026, 9, 5, 0, 0, 0))).toBe('2026-W41');
    expect(getWeekId(new Date(2026, 9, 11, 23, 59, 59))).toBe('2026-W41');
    expect(getWeekId(new Date(2026, 9, 12, 0, 0, 0))).toBe('2026-W42');
  });

  it('cas ISO classiques : 2020-12-31 → 2020-W53, 2021-01-01 → 2020-W53, 2019-12-30 → 2020-W01', () => {
    expect(getWeekId(new Date(2020, 11, 31))).toBe('2020-W53');
    expect(getWeekId(new Date(2021, 0, 1))).toBe('2020-W53');
    expect(getWeekId(new Date(2019, 11, 30))).toBe('2020-W01');
  });

  it('AC-08.1 : libellé « Semaine 41 – 2026 »', () => {
    expect(formatWeekLabel('2026-W41')).toBe('Semaine 41 – 2026');
    expect(formatWeekLabel('2027-W01')).toBe('Semaine 1 – 2027');
  });

  it('date de fin au format jj/mm/aaaa', () => {
    expect(formatDateFr(new Date(2026, 9, 6, 15).toISOString())).toBe('06/10/2026');
    expect(formatDateFr('invalide')).toBe('');
  });
});
