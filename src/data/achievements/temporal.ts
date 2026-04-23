import { Achievement } from '../../types/achievement';

export const temporalAchievements: Achievement[] = [
  {
    kind: 'single',
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Meditate before 6 AM three times',
    icon: '🌅',
    category: 'temporal',
    check: (ctx) =>
      ctx.sessions.filter((s) => new Date(s.date).getHours() < 6).length >= 3,
    triggers: ['session_saved', 'app_start'],
  },
  {
    kind: 'single',
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Meditate after 10 PM three times',
    icon: '🌙',
    category: 'temporal',
    check: (ctx) =>
      ctx.sessions.filter((s) => new Date(s.date).getHours() >= 22).length >= 3,
    triggers: ['session_saved', 'app_start'],
  },
  {
    kind: 'single',
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Meditate on five weekends',
    icon: '🏕️',
    category: 'temporal',
    check: (ctx) => {
      const weekendKeys = new Set<string>();
      for (const s of ctx.sessions) {
        const d = new Date(s.date);
        const dow = d.getDay();
        if (dow === 0 || dow === 6) {
          const monday = new Date(d);
          monday.setDate(d.getDate() - ((dow + 6) % 7));
          weekendKeys.add(`${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`);
        }
      }
      return weekendKeys.size >= 5;
    },
    triggers: ['session_saved', 'app_start'],
  },
];
