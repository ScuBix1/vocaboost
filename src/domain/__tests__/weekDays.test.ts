import { countActiveDaysThisWeek, getWeekDays } from '../streak';

describe('Semaine ISO courante pour WeekStrip (RG-45, RG-48, design §4.6)', () => {
  it('lundi → dimanche de la semaine contenant aujourd’hui (mardi 2026-10-06)', () => {
    const days = getWeekDays([], '2026-10-06');
    expect(days.map((d) => d.key)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(days.map((d) => d.initial).join('')).toBe('LMMJVSD');
    expect(days.map((d) => d.isToday)).toEqual([false, true, false, false, false, false, false]);
    expect(days.map((d) => d.isFuture)).toEqual([false, false, true, true, true, true, true]);
  });

  it('dimanche appartient à la semaine qui commence le lundi précédent', () => {
    const days = getWeekDays([], '2026-10-11');
    expect(days[0].key).toBe('2026-10-05');
    expect(days[6]).toMatchObject({ key: '2026-10-11', isToday: true, isFuture: false });
  });

  it('lundi est le premier jour', () => {
    expect(getWeekDays([], '2026-10-05')[0]).toMatchObject({ key: '2026-10-05', isToday: true });
  });

  it('jours actifs = dates présentes dans activeDays ; la semaine précédente est ignorée', () => {
    const active = ['2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'];
    const days = getWeekDays(active, '2026-10-06');
    expect(days.map((d) => d.active)).toEqual([true, true, false, false, false, false, false]);
    expect(countActiveDaysThisWeek(active, '2026-10-06')).toBe(2);
  });

  it('passage d’année : semaine du 2026-12-31 (jeudi) → du lundi 28/12 au dimanche 03/01', () => {
    const days = getWeekDays(['2027-01-01'], '2026-12-31');
    expect(days[0].key).toBe('2026-12-28');
    expect(days[6].key).toBe('2027-01-03');
    expect(days[4]).toMatchObject({ key: '2027-01-01', active: true, isFuture: true });
  });
});
