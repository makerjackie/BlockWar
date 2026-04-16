type LocalizedText = {
  en: string;
  zh: string;
};

export type HolidayRegion = 'cn' | 'us' | 'global';
export type HolidayAccent = 'ember' | 'red' | 'green' | 'blue';

type GregorianMatchRule = {
  type: 'gregorian';
  month: number;
  day: number;
};

type NthWeekdayMatchRule = {
  type: 'nth-weekday';
  month: number;
  weekday: number;
  occurrence: number | 'last';
};

type LunarMatchRule = {
  type: 'lunar';
  month: number;
  day: number;
};

type LunarNewYearsEveMatchRule = {
  type: 'lunar-new-years-eve';
};

type HolidayMatchRule =
  | GregorianMatchRule
  | NthWeekdayMatchRule
  | LunarMatchRule
  | LunarNewYearsEveMatchRule;

type HolidayEasterEggDefinition = {
  id: string;
  name: LocalizedText;
  greeting: LocalizedText;
  regions: HolidayRegion[];
  icon: string;
  accent: HolidayAccent;
  priority: number;
  match: HolidayMatchRule;
};

export type ActiveHolidayEasterEgg = {
  id: string;
  name: string;
  greeting: string;
  regions: HolidayRegion[];
  icon: string;
  accent: HolidayAccent;
};

type DisplayLocale = keyof LocalizedText;

type ChineseLunarDate = {
  month: number;
  day: number;
  isLeapMonth: boolean;
};

const chineseLunarFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
        month: 'numeric',
        day: 'numeric',
      })
    : null;

export const HOLIDAY_EASTER_EGGS: HolidayEasterEggDefinition[] = [
  {
    id: 'new-year-day',
    name: {
      en: "New Year's Day",
      zh: '元旦',
    },
    greeting: {
      en: 'Happy New Year — may your next campaign open with a winning streak!',
      zh: '元旦快乐，愿你新的一年开局连胜！',
    },
    regions: ['global'],
    icon: '🎆',
    accent: 'blue',
    priority: 95,
    match: { type: 'gregorian', month: 1, day: 1 },
  },
  {
    id: 'lunar-new-years-eve',
    name: {
      en: "Lunar New Year's Eve",
      zh: '除夕',
    },
    greeting: {
      en: 'Happy Lunar New Year’s Eve — gather the squad and welcome a fresh map!',
      zh: '除夕快乐，愿团圆与好运一起刷新到你的地图上！',
    },
    regions: ['cn'],
    icon: '🏮',
    accent: 'red',
    priority: 100,
    match: { type: 'lunar-new-years-eve' },
  },
  {
    id: 'spring-festival',
    name: {
      en: 'Spring Festival',
      zh: '春节',
    },
    greeting: {
      en: 'Happy Spring Festival — wishing you bold moves and full-map victories!',
      zh: '新春快乐，祝你大胆扩张、好运满图！',
    },
    regions: ['cn'],
    icon: '🧨',
    accent: 'red',
    priority: 100,
    match: { type: 'lunar', month: 1, day: 1 },
  },
  {
    id: 'martin-luther-king-jr-day',
    name: {
      en: 'Martin Luther King Jr. Day',
      zh: '马丁·路德·金纪念日',
    },
    greeting: {
      en: 'Honoring courage, service, and the dream of a fairer world.',
      zh: '纪念勇气、服务，以及让世界更公平的梦想。',
    },
    regions: ['us'],
    icon: '🕊️',
    accent: 'blue',
    priority: 70,
    match: { type: 'nth-weekday', month: 1, weekday: 1, occurrence: 3 },
  },
  {
    id: 'lantern-festival',
    name: {
      en: 'Lantern Festival',
      zh: '元宵节',
    },
    greeting: {
      en: 'Happy Lantern Festival — may every scout reveal a bright path!',
      zh: '元宵节快乐，愿灯火照亮每一步进攻路线！',
    },
    regions: ['cn'],
    icon: '🏮',
    accent: 'ember',
    priority: 90,
    match: { type: 'lunar', month: 1, day: 15 },
  },
  {
    id: 'valentines-day',
    name: {
      en: "Valentine's Day",
      zh: '情人节',
    },
    greeting: {
      en: 'Happy Valentine’s Day — hope your favorite duo keeps winning together!',
      zh: '情人节快乐，愿你和喜欢的人双排连胜！',
    },
    regions: ['global'],
    icon: '💘',
    accent: 'red',
    priority: 60,
    match: { type: 'gregorian', month: 2, day: 14 },
  },
  {
    id: 'presidents-day',
    name: {
      en: 'Presidents Day',
      zh: '美国总统日',
    },
    greeting: {
      en: 'Happy Presidents Day — a good day for strategy, leadership, and bold calls.',
      zh: '总统日快乐，今天适合谋略、指挥和大胆决策。',
    },
    regions: ['us'],
    icon: '⭐',
    accent: 'blue',
    priority: 55,
    match: { type: 'nth-weekday', month: 2, weekday: 1, occurrence: 3 },
  },
  {
    id: 'international-womens-day',
    name: {
      en: "International Women's Day",
      zh: '国际妇女节',
    },
    greeting: {
      en: 'Happy International Women’s Day — celebrating every brilliant player today!',
      zh: '国际妇女节快乐，祝每一位闪耀的你都被温柔以待！',
    },
    regions: ['global', 'cn'],
    icon: '🌷',
    accent: 'red',
    priority: 70,
    match: { type: 'gregorian', month: 3, day: 8 },
  },
  {
    id: 'april-fools-day',
    name: {
      en: "April Fools' Day",
      zh: '愚人节',
    },
    greeting: {
      en: 'Happy April Fools’ Day — watch out for feints and surprise flanks!',
      zh: '愚人节快乐，小心假动作和突然偷家！',
    },
    regions: ['global'],
    icon: '🃏',
    accent: 'ember',
    priority: 50,
    match: { type: 'gregorian', month: 4, day: 1 },
  },
  {
    id: 'earth-day',
    name: {
      en: 'Earth Day',
      zh: '世界地球日',
    },
    greeting: {
      en: 'Happy Earth Day — let’s protect the only map we all share.',
      zh: '世界地球日快乐，愿我们一起守护共同的地图！',
    },
    regions: ['global'],
    icon: '🌍',
    accent: 'green',
    priority: 60,
    match: { type: 'gregorian', month: 4, day: 22 },
  },
  {
    id: 'international-workers-day',
    name: {
      en: 'International Workers’ Day',
      zh: '劳动节',
    },
    greeting: {
      en: 'Happy Labor Day / International Workers’ Day — enjoy the break and the wins!',
      zh: '五一劳动节快乐，祝你休息尽兴、上分顺利！',
    },
    regions: ['global', 'cn'],
    icon: '🛠️',
    accent: 'ember',
    priority: 85,
    match: { type: 'gregorian', month: 5, day: 1 },
  },
  {
    id: 'mothers-day',
    name: {
      en: "Mother's Day",
      zh: '母亲节',
    },
    greeting: {
      en: 'Happy Mother’s Day — sending love to the real MVPs behind every player.',
      zh: '母亲节快乐，把爱与感谢送给最温柔也最强大的她们。',
    },
    regions: ['global', 'us'],
    icon: '💐',
    accent: 'red',
    priority: 70,
    match: { type: 'nth-weekday', month: 5, weekday: 0, occurrence: 2 },
  },
  {
    id: 'memorial-day',
    name: {
      en: 'Memorial Day',
      zh: '美国阵亡将士纪念日',
    },
    greeting: {
      en: 'Remembering those who served and honoring their sacrifice.',
      zh: '铭记服务与牺牲，向守护者致敬。',
    },
    regions: ['us'],
    icon: '🎖️',
    accent: 'blue',
    priority: 70,
    match: { type: 'nth-weekday', month: 5, weekday: 1, occurrence: 'last' },
  },
  {
    id: 'childrens-day',
    name: {
      en: "Children's Day",
      zh: '儿童节',
    },
    greeting: {
      en: 'Happy Children’s Day — keep your sense of play and wonder alive!',
      zh: '六一儿童节快乐，愿你永远保留一点游戏与好奇心！',
    },
    regions: ['global', 'cn'],
    icon: '🎈',
    accent: 'blue',
    priority: 70,
    match: { type: 'gregorian', month: 6, day: 1 },
  },
  {
    id: 'dragon-boat-festival',
    name: {
      en: 'Dragon Boat Festival',
      zh: '端午节',
    },
    greeting: {
      en: 'Happy Dragon Boat Festival — race fast, strike smart, and stay united!',
      zh: '端午安康，愿你乘风破浪、操作稳准狠！',
    },
    regions: ['cn'],
    icon: '🚣',
    accent: 'green',
    priority: 90,
    match: { type: 'lunar', month: 5, day: 5 },
  },
  {
    id: 'fathers-day',
    name: {
      en: "Father's Day",
      zh: '父亲节',
    },
    greeting: {
      en: 'Happy Father’s Day — cheers to steady hands and quiet protection.',
      zh: '父亲节快乐，致敬那些沉稳守护与默默支持。',
    },
    regions: ['global', 'us'],
    icon: '🧢',
    accent: 'blue',
    priority: 70,
    match: { type: 'nth-weekday', month: 6, weekday: 0, occurrence: 3 },
  },
  {
    id: 'independence-day-us',
    name: {
      en: 'Independence Day',
      zh: '美国独立日',
    },
    greeting: {
      en: 'Happy Fourth of July — light up the sky and the scoreboard!',
      zh: '美国独立日快乐，愿烟火和战绩一样闪亮！',
    },
    regions: ['us'],
    icon: '🎇',
    accent: 'red',
    priority: 80,
    match: { type: 'gregorian', month: 7, day: 4 },
  },
  {
    id: 'qixi-festival',
    name: {
      en: 'Qixi Festival',
      zh: '七夕',
    },
    greeting: {
      en: 'Happy Qixi — may every long-distance route find its bridge.',
      zh: '七夕快乐，愿所有奔赴都有鹊桥相连！',
    },
    regions: ['cn'],
    icon: '🌌',
    accent: 'red',
    priority: 75,
    match: { type: 'lunar', month: 7, day: 7 },
  },
  {
    id: 'labor-day-us',
    name: {
      en: 'Labor Day',
      zh: '美国劳动节',
    },
    greeting: {
      en: 'Happy Labor Day — take a well-earned break before the next push.',
      zh: '美国劳动节快乐，好好休整，准备下一波推进！',
    },
    regions: ['us'],
    icon: '⚒️',
    accent: 'blue',
    priority: 75,
    match: { type: 'nth-weekday', month: 9, weekday: 1, occurrence: 1 },
  },
  {
    id: 'mid-autumn-festival',
    name: {
      en: 'Mid-Autumn Festival',
      zh: '中秋节',
    },
    greeting: {
      en: 'Happy Mid-Autumn Festival — wishing you reunion, moonlight, and clean victories!',
      zh: '中秋快乐，愿团圆、月光和胜利都如期而至！',
    },
    regions: ['cn'],
    icon: '🌕',
    accent: 'ember',
    priority: 95,
    match: { type: 'lunar', month: 8, day: 15 },
  },
  {
    id: 'national-day-cn',
    name: {
      en: 'China National Day',
      zh: '国庆节',
    },
    greeting: {
      en: 'Happy China National Day — enjoy the Golden Week and glorious wins!',
      zh: '国庆节快乐，祝假期尽兴、战绩长红！',
    },
    regions: ['cn'],
    icon: '🇨🇳',
    accent: 'red',
    priority: 90,
    match: { type: 'gregorian', month: 10, day: 1 },
  },
  {
    id: 'halloween',
    name: {
      en: 'Halloween',
      zh: '万圣节',
    },
    greeting: {
      en: 'Happy Halloween — beware the sneaky ghost army in the fog!',
      zh: '万圣节快乐，小心迷雾里突然冒出的幽灵军团！',
    },
    regions: ['global', 'us'],
    icon: '🎃',
    accent: 'ember',
    priority: 65,
    match: { type: 'gregorian', month: 10, day: 31 },
  },
  {
    id: 'veterans-day-us',
    name: {
      en: 'Veterans Day',
      zh: '美国退伍军人节',
    },
    greeting: {
      en: 'Honoring all veterans — thank you for your service.',
      zh: '向所有退伍军人致敬，感谢你们的服务。',
    },
    regions: ['us'],
    icon: '🎖️',
    accent: 'blue',
    priority: 70,
    match: { type: 'gregorian', month: 11, day: 11 },
  },
  {
    id: 'thanksgiving-us',
    name: {
      en: 'Thanksgiving',
      zh: '感恩节',
    },
    greeting: {
      en: 'Happy Thanksgiving — grateful for every ally, comeback, and shared table.',
      zh: '感恩节快乐，感谢队友、翻盘，以及每一次相聚！',
    },
    regions: ['us'],
    icon: '🦃',
    accent: 'ember',
    priority: 85,
    match: { type: 'nth-weekday', month: 11, weekday: 4, occurrence: 4 },
  },
  {
    id: 'christmas',
    name: {
      en: 'Christmas',
      zh: '圣诞节',
    },
    greeting: {
      en: 'Merry Christmas — may your lobby be warm and your victories bright!',
      zh: '圣诞快乐，愿你的大厅温暖、胜利闪闪发光！',
    },
    regions: ['global', 'us'],
    icon: '🎄',
    accent: 'green',
    priority: 85,
    match: { type: 'gregorian', month: 12, day: 25 },
  },
];

export function getActiveHolidayEasterEggs(
  date = new Date(),
  locale = 'en'
): ActiveHolidayEasterEgg[] {
  const displayLocale = resolveDisplayLocale(locale);

  return HOLIDAY_EASTER_EGGS.filter((holiday) =>
    matchesHoliday(date, holiday.match)
  )
    .slice()
    .sort((first, second) => {
      const regionRank =
        getRegionRank(first.regions, displayLocale) -
        getRegionRank(second.regions, displayLocale);

      if (regionRank !== 0) {
        return regionRank;
      }

      return second.priority - first.priority;
    })
    .map((holiday) => ({
      id: holiday.id,
      name: holiday.name[displayLocale],
      greeting: holiday.greeting[displayLocale],
      regions: holiday.regions,
      icon: holiday.icon,
      accent: holiday.accent,
    }));
}

function resolveDisplayLocale(locale: string): DisplayLocale {
  return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function getRegionRank(
  regions: HolidayRegion[],
  displayLocale: DisplayLocale
) {
  const localeRegionPriority: HolidayRegion[] =
    displayLocale === 'zh' ? ['cn', 'global', 'us'] : ['us', 'global', 'cn'];

  return Math.min(
    ...regions.map((region) => localeRegionPriority.indexOf(region))
  );
}

function matchesHoliday(date: Date, rule: HolidayMatchRule) {
  switch (rule.type) {
    case 'gregorian':
      return matchesGregorianDate(date, rule.month, rule.day);
    case 'nth-weekday':
      return matchesNthWeekday(
        date,
        rule.month,
        rule.weekday,
        rule.occurrence
      );
    case 'lunar':
      return matchesChineseLunarDate(date, rule.month, rule.day);
    case 'lunar-new-years-eve':
      return matchesLunarNewYearsEve(date);
    default:
      return false;
  }
}

function matchesGregorianDate(date: Date, month: number, day: number) {
  return date.getMonth() + 1 === month && date.getDate() === day;
}

function matchesNthWeekday(
  date: Date,
  month: number,
  weekday: number,
  occurrence: number | 'last'
) {
  if (date.getMonth() + 1 !== month || date.getDay() !== weekday) {
    return false;
  }

  if (occurrence === 'last') {
    const nextWeek = new Date(date);
    nextWeek.setDate(date.getDate() + 7);
    return nextWeek.getMonth() !== date.getMonth();
  }

  return Math.floor((date.getDate() - 1) / 7) + 1 === occurrence;
}

function matchesChineseLunarDate(date: Date, month: number, day: number) {
  const lunarDate = getChineseLunarDate(date);

  return (
    lunarDate !== null &&
    !lunarDate.isLeapMonth &&
    lunarDate.month === month &&
    lunarDate.day === day
  );
}

function matchesLunarNewYearsEve(date: Date) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + 1);

  const lunarDate = getChineseLunarDate(date);
  const nextLunarDate = getChineseLunarDate(nextDate);

  return (
    lunarDate !== null &&
    !lunarDate.isLeapMonth &&
    nextLunarDate !== null &&
    !nextLunarDate.isLeapMonth &&
    nextLunarDate.month === 1 &&
    nextLunarDate.day === 1
  );
}

function getChineseLunarDate(date: Date): ChineseLunarDate | null {
  if (!chineseLunarFormatter) {
    return null;
  }

  try {
    const parts = chineseLunarFormatter.formatToParts(date);
    const monthValue = parts.find((part) => part.type === 'month')?.value;
    const dayValue = parts.find((part) => part.type === 'day')?.value;

    if (!monthValue || !dayValue) {
      return null;
    }

    const monthMatch = monthValue.match(/\d+/);
    const day = Number(dayValue);

    if (!monthMatch || Number.isNaN(day)) {
      return null;
    }

    return {
      month: Number(monthMatch[0]),
      day,
      isLeapMonth: monthValue.includes('闰') || monthValue.includes('bis'),
    };
  } catch {
    return null;
  }
}
