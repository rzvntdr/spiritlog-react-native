import { Achievement } from '../../types/achievement';

export const durationAchievements: Achievement[] = [
  {
    kind: 'tiered',
    id: 'time_invested',
    name: 'Time Invested',
    description: 'Accumulate meditation minutes',
    icon: '⏳',
    category: 'duration',
    metricLabel: 'minutes',
    tiers: { bronze: 60, silver: 600, gold: 3000 },
    getValue: (ctx) => ctx.stats.totalMinutes,
    triggers: ['session_saved', 'app_start'],
  },
  {
    kind: 'tiered',
    id: 'long_session',
    name: 'Deep Dive',
    description: 'Meditate for an extended single session',
    icon: '🌊',
    category: 'duration',
    metricLabel: 'minutes',
    tiers: { bronze: 10, silver: 20, gold: 45 },
    getValue: (ctx) =>
      ctx.sessions.reduce((max, s) => Math.max(max, s.duration), 0),
    triggers: ['session_saved', 'app_start'],
  },
];
