import { PresetTimer } from '../types/preset';
import { insertPreset } from './presetRepository';
import { generateUUID } from '../utils/uuid';

export async function seedDefaultPresets(): Promise<void> {
  const now = Date.now();

  const defaults: PresetTimer[] = [
    {
      id: generateUUID(),
      name: 'Quick 5',
      description: 'A quick 5-minute meditation',
      durations: [
        {
          type: 'NORMAL',
          durationMillis: 5 * 60 * 1000,
          name: 'Meditation',
          startSound: 1, // Bell
          endSound: 1,
          soundConfigs: [],
        },
      ],
      isFavorite: false,
      sortOrder: 0,
      lastUsed: 0,
      createdAt: now,
    },
    {
      id: generateUUID(),
      name: 'Basic 10',
      description: '30-second warm-up followed by 10-minute meditation',
      durations: [
        {
          type: 'WARMUP',
          durationMillis: 30 * 1000,
          name: 'Warm-up',
          startSound: 1,
          endSound: null,
          soundConfigs: [],
        },
        {
          type: 'NORMAL',
          durationMillis: 10 * 60 * 1000,
          name: 'Meditation',
          startSound: null,
          endSound: 1,
          soundConfigs: [],
        },
      ],
      isFavorite: false,
      sortOrder: 1,
      lastUsed: 0,
      createdAt: now - 1,
    },
    {
      id: generateUUID(),
      name: 'Deep 20',
      description: '30-second warm-up + 20-minute deep meditation with random interval bells',
      durations: [
        {
          type: 'WARMUP',
          durationMillis: 30 * 1000,
          name: 'Warm-up',
          startSound: 1,
          endSound: null,
          soundConfigs: [],
        },
        {
          type: 'NORMAL',
          durationMillis: 20 * 60 * 1000,
          name: 'Meditation',
          startSound: null,
          endSound: 1,
          soundConfigs: [
            {
              type: 'RANDOM_INTERVAL',
              soundId: 1,
              params: { minIntervalMillis: 3 * 60 * 1000, maxIntervalMillis: 7 * 60 * 1000 },
            },
          ],
        },
      ],
      isFavorite: false,
      sortOrder: 2,
      lastUsed: 0,
      createdAt: now - 2,
    },
    {
      id: generateUUID(),
      name: 'Open-ended',
      description: 'Meditate as long as you want — stop when you\'re ready',
      durations: [
        {
          type: 'INFINITE',
          durationMillis: 0,
          name: 'Meditation',
          startSound: 1,
          endSound: 1,
          soundConfigs: [],
        },
      ],
      isFavorite: false,
      sortOrder: 3,
      lastUsed: 0,
      createdAt: now - 3,
    },
    {
      id: generateUUID(),
      name: 'Multi-phase 30',
      description: 'Structured 30-minute session: warm-up, body scan, breath focus, open awareness',
      durations: [
        {
          type: 'WARMUP',
          durationMillis: 30 * 1000,
          name: 'Warm-up',
          startSound: 1,
          endSound: null,
          soundConfigs: [],
        },
        {
          type: 'NORMAL',
          durationMillis: 5 * 60 * 1000,
          name: 'Body Scan',
          startSound: 2, // Swoosh
          endSound: null,
          soundConfigs: [],
        },
        {
          type: 'NORMAL',
          durationMillis: 15 * 60 * 1000,
          name: 'Breath Focus',
          startSound: 2,
          endSound: null,
          soundConfigs: [],
        },
        {
          type: 'NORMAL',
          durationMillis: 10 * 60 * 1000,
          name: 'Open Awareness',
          startSound: 2,
          endSound: 1,
          soundConfigs: [],
        },
      ],
      isFavorite: false,
      sortOrder: 4,
      lastUsed: 0,
      createdAt: now - 4,
    },
  ];

  for (const preset of defaults) {
    await insertPreset(preset);
  }
}
