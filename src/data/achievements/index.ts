import { Achievement, SingleAchievement } from '../../types/achievement';
import { sessionAchievements } from './sessions';
import { streakAchievements } from './streaks';
import { durationAchievements } from './duration';
import { varietyAchievements } from './variety';
import { temporalAchievements } from './temporal';
import { featureAchievements } from './features';
import { seasonalTemplates } from './seasonal';

export function getAllAchievements(): Achievement[] {
  const statics: Achievement[] = [
    ...sessionAchievements,
    ...streakAchievements,
    ...durationAchievements,
    ...varietyAchievements,
    ...temporalAchievements,
    ...featureAchievements,
  ];

  const currentYear = new Date().getFullYear();
  const seasonal: Achievement[] = [];
  for (const t of seasonalTemplates) {
    for (let y = t.firstEligibleYear; y <= currentYear; y++) {
      const year = y;
      const achievement: SingleAchievement = {
        kind: 'single',
        id: `${t.baseId}_${year}`,
        name: t.name(year),
        description: t.description(year),
        icon: t.icon,
        category: 'seasonal',
        check: (ctx) => t.check(ctx, year),
        triggers: t.triggers ?? ['session_saved', 'app_start'],
        seasonalWindowEnd: t.windowEnd(year),
      };
      seasonal.push(achievement);
    }
  }

  return [...statics, ...seasonal];
}
