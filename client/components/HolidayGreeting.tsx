import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'next-i18next';

import {
  getActiveHolidayEasterEggs,
  type HolidayAccent,
} from '@/lib/holiday-easter-eggs';

type HolidayGreetingProps = {
  className?: string;
};

const accentStyles: Record<
  HolidayAccent,
  { borderColor: string; background: string; color: string }
> = {
  ember: {
    borderColor: 'color-mix(in srgb, var(--bw-ember) 62%, transparent)',
    background:
      'color-mix(in srgb, var(--bw-panel-strong) 80%, var(--bw-ember) 20%)',
    color: 'var(--bw-ember)',
  },
  red: {
    borderColor: 'color-mix(in srgb, var(--bw-red) 62%, transparent)',
    background:
      'color-mix(in srgb, var(--bw-panel-strong) 82%, var(--bw-red) 18%)',
    color: 'var(--bw-red)',
  },
  green: {
    borderColor: 'color-mix(in srgb, var(--bw-green) 62%, transparent)',
    background:
      'color-mix(in srgb, var(--bw-panel-strong) 82%, var(--bw-green) 18%)',
    color: 'var(--bw-green)',
  },
  blue: {
    borderColor: 'color-mix(in srgb, var(--bw-blue) 62%, transparent)',
    background:
      'color-mix(in srgb, var(--bw-panel-strong) 82%, var(--bw-blue) 18%)',
    color: 'var(--bw-blue)',
  },
};

function getMillisecondsUntilNextLocalDay() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 5, 0);

  return Math.max(nextDay.getTime() - now.getTime(), 1000);
}

function HolidayGreeting(props: HolidayGreetingProps) {
  const { className } = props;
  const { i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const isChinese = locale.toLowerCase().startsWith('zh');

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextDay = () => {
      timeoutId = window.setTimeout(() => {
        setCurrentDate(new Date());
        scheduleNextDay();
      }, getMillisecondsUntilNextLocalDay());
    };

    setCurrentDate(new Date());
    scheduleNextDay();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const activeHolidays = useMemo(
    () =>
      currentDate
        ? getActiveHolidayEasterEggs(currentDate, locale)
        : [],
    [currentDate, locale]
  );

  if (activeHolidays.length === 0) {
    return null;
  }

  const containerClassName = `menu-container overflow-hidden p-3 sm:p-4 ${
    className ?? ''
  }`;

  return (
    <aside className={containerClassName} aria-live='polite'>
      <div className='mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-500'>
        <Sparkles size={14} strokeWidth={2.4} />
        {isChinese ? '今日节日彩蛋' : 'Holiday greetings'}
      </div>
      <div className='grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]'>
        {activeHolidays.map((holiday) => {
          const accentStyle = accentStyles[holiday.accent];

          return (
            <article
              key={holiday.id}
              className='border px-3 py-2.5'
              style={{
                borderColor: accentStyle.borderColor,
                background: accentStyle.background,
              }}
            >
              <div
                className='flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]'
                style={{ color: accentStyle.color }}
              >
                <span className='text-base leading-none'>{holiday.icon}</span>
                <span>{holiday.name}</span>
              </div>
              <p
                className='mt-1.5 text-sm font-semibold leading-6'
                style={{ color: 'var(--bw-ink)' }}
              >
                {holiday.greeting}
              </p>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

export default HolidayGreeting;
