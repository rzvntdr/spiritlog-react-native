import { Achievement } from '../../types/achievement';

export const sessionAchievements: Achievement[] = [
  {
    kind: 'single',
    id: 'first_session',
    name: 'First Step',
    description: 'Complete your first meditation',
    icon: '🧘',
    category: 'sessions',
    check: (ctx) => ctx.stats.totalSessions >= 1,
    triggers: ['session_saved', 'app_start'],
  },
  {
    kind: 'tiered',
    id: 'session_master',
    name: 'Session Master',
    description: 'Complete many meditation sessions',
    icon: '🏆',
    category: 'sessions',
    metricLabel: 'sessions',
    tiers: { bronze: 10, silver: 50, gold: 200 },
    getValue: (ctx) => ctx.stats.totalSessions,
    triggers: ['session_saved', 'app_start'],
  },
];
