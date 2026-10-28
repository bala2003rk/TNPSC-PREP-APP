const { getExamAvailability } = require('./examAvailability');

describe('getExamAvailability', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');

  test('allows an exam with no availability window', () => {
    expect(getExamAvailability({}, now)).toMatchObject({
      isUpcoming: false,
      isExpired: false,
      isAvailable: true,
    });
  });

  test('does not open an exam before its start time', () => {
    expect(getExamAvailability({
      availableFrom: '2026-10-27T12:01:00.000Z',
      availableTill: '2026-10-27T13:00:00.000Z',
    }, now)).toMatchObject({
      isUpcoming: true,
      isExpired: false,
      isAvailable: false,
    });
  });

  test('opens the exam at its start and closes it at its end', () => {
    const exam = {
      availableFrom: '2026-10-27T12:00:00.000Z',
      availableTill: '2026-10-27T13:00:00.000Z',
    };

    expect(getExamAvailability(exam, now).isAvailable).toBe(true);
    expect(getExamAvailability(exam, new Date('2026-10-27T13:00:00.000Z'))).toMatchObject({
      isExpired: true,
      isAvailable: false,
    });
  });

  test('uses the legacy scheduledAt field as the start time', () => {
    expect(getExamAvailability({
      scheduledAt: '2026-10-27T12:01:00.000Z',
    }, now).isUpcoming).toBe(true);
  });
});
