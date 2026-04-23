import { Achievement } from '../../types/achievement';

export const varietyAchievements: Achievement[] = [
  {
    kind: 'tiered',
    id: 'preset_explorer',
    name: 'Preset Explorer',
    description: 'Use different presets in your practice',
    icon: '🗺️',
    category: 'variety',
    metricLabel: 'presets',
    tiers: { bronze: 3, silver: 10, gold: 20 },
    getValue: (ctx) => {
      const used = new Set<string>();
      for (const s of ctx.sessions) {
        if (s.presetId) used.add(s.presetId);
      }
      return used.size;
    },
    triggers: ['session_saved', 'app_start'],
  },
];
