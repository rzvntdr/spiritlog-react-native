import { Achievement } from '../../types/achievement';

export const streakAchievements: Achievement[] = [
  {
    kind: 'tiered',
    id: 'streak_keeper',
    name: 'Streak Keeper',
    description: 'Meditate on consecutive days',
    icon: '🔥',
    category: 'streaks',
    metricLabel: 'days',
    tiers: { bronze: 3, silver: 7, gold: 30 },
    getValue: (ctx) => ctx.stats.currentStreak,
    triggers: ['session_saved', 'app_start'],
  },
];
