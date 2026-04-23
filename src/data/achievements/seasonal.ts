import { AchievementContext, SeasonalTemplate } from '../../types/achievement';

function sessionOnDay(ctx: AchievementContext, date: Date): boolean {
  return ctx.sessions.some((s) => {
    const d = new Date(s.date);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });
}

function endOfDay(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 23, 59, 59);
}

// Meeus/Jones/Butcher Gregorian Easter algorithm
function computeEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

export const seasonalTemplates: SeasonalTemplate[] = [
  {
    kind: 'seasonal',
    baseId: 'new_year',
    name: (y) => `New Year ${y}`,
    description: (y) => `Meditate on January 1, ${y}`,
    icon: '🎆',
    firstEligibleYear: 2025,
    check: (ctx, y) => sessionOnDay(ctx, new Date(y, 0, 1)),
    windowEnd: (y) => endOfDay(y, 0, 1),
  },
  {
    kind: 'seasonal',
    baseId: 'easter',
    name: (y) => `Easter ${y}`,
    description: (y) => `Meditate on Easter Sunday, ${y}`,
    icon: '🐰',
    firstEligibleYear: 2025,
    check: (ctx, y) => {
      const e = computeEaster(y);
      return sessionOnDay(ctx, new Date(y, e.month, e.day));
    },
    windowEnd: (y) => {
      const e = computeEaster(y);
      return endOfDay(y, e.month, e.day);
    },
  },
  {
    kind: 'seasonal',
    baseId: 'yoga_day',
    name: (y) => `Yoga Day ${y}`,
    description: (y) => `Meditate on June 21, ${y} (International Yoga Day)`,
    icon: '🧘‍♀️',
    firstEligibleYear: 2025,
    check: (ctx, y) => sessionOnDay(ctx, new Date(y, 5, 21)),
    windowEnd: (y) => endOfDay(y, 5, 21),
  },
  {
    kind: 'seasonal',
    baseId: 'summer_solstice',
    name: (y) => `Summer Solstice ${y}`,
    description: (y) => `Meditate on June 21, ${y}`,
    icon: '☀️',
    firstEligibleYear: 2025,
    check: (ctx, y) => sessionOnDay(ctx, new Date(y, 5, 21)),
    windowEnd: (y) => endOfDay(y, 5, 21),
  },
  {
    kind: 'seasonal',
    baseId: 'winter_solstice',
    name: (y) => `Winter Solstice ${y}`,
    description: (y) => `Meditate on December 21, ${y}`,
    icon: '❄️',
    firstEligibleYear: 2025,
    check: (ctx, y) => sessionOnDay(ctx, new Date(y, 11, 21)),
    windowEnd: (y) => endOfDay(y, 11, 21),
  },
  {
    kind: 'seasonal',
    baseId: 'christmas',
    name: (y) => `Christmas ${y}`,
    description: (y) => `Meditate on December 25, ${y}`,
    icon: '🎄',
    firstEligibleYear: 2025,
    check: (ctx, y) => sessionOnDay(ctx, new Date(y, 11, 25)),
    windowEnd: (y) => endOfDay(y, 11, 25),
  },
];
