import { describe, expect, it } from 'vitest';

import { getActiveHolidayEasterEggs } from '@/lib/holiday-easter-eggs';

function createNoonUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

describe('holiday easter eggs', () => {
  it('matches fixed Gregorian holidays and localized greetings', () => {
    const holidays = getActiveHolidayEasterEggs(
      createNoonUtcDate(2026, 5, 1),
      'zh-CN'
    );

    expect(holidays[0]).toMatchObject({
      id: 'international-workers-day',
      name: '劳动节',
      greeting: '五一劳动节快乐，祝你休息尽兴、上分顺利！',
    });
  });

  it('matches US nth-weekday holidays', () => {
    const holidays = getActiveHolidayEasterEggs(
      createNoonUtcDate(2026, 11, 26),
      'en'
    );

    expect(holidays).toContainEqual(
      expect.objectContaining({
        id: 'thanksgiving-us',
        name: 'Thanksgiving',
      })
    );
  });

  it('matches Chinese lunar holidays', () => {
    const holidays = getActiveHolidayEasterEggs(
      createNoonUtcDate(2026, 2, 17),
      'zh'
    );

    expect(holidays).toContainEqual(
      expect.objectContaining({
        id: 'spring-festival',
        name: '春节',
      })
    );
  });

  it('matches Lunar New Year Eve from the next lunar day', () => {
    const holidays = getActiveHolidayEasterEggs(
      createNoonUtcDate(2026, 2, 16),
      'en-US'
    );

    expect(holidays).toContainEqual(
      expect.objectContaining({
        id: 'lunar-new-years-eve',
        name: "Lunar New Year's Eve",
      })
    );
  });
});
