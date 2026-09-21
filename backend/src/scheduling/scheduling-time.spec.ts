import { intervalsOverlap, parseJakartaDateTime } from './scheduling-time';

describe('scheduling time rules', () => {
  test.each([
    ['adjacent', '09:00', '10:00', '10:00', '11:00', false],
    ['partial overlap', '09:00', '10:30', '10:00', '11:00', true],
    ['contained', '09:00', '12:00', '10:00', '11:00', true],
    ['exact match', '09:00', '11:00', '09:00', '11:00', true],
  ])('%s intervals', (_label, aStart, aEnd, bStart, bEnd, expected) => {
    const at = (time: string) => new Date(`2026-08-26T${time}:00+07:00`);
    expect(intervalsOverlap(at(aStart), at(aEnd), at(bStart), at(bEnd))).toBe(expected);
  });

  it('converts a Jakarta campus time to UTC', () => {
    expect(parseJakartaDateTime('2026-08-26', '08:30').toISOString()).toBe(
      '2026-08-26T01:30:00.000Z',
    );
  });

  it('rejects an impossible Jakarta date', () => {
    expect(() => parseJakartaDateTime('2026-02-30', '08:30')).toThrow(
      'Tanggal atau waktu tidak valid.',
    );
  });
});
