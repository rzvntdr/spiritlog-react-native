import { MeditationSession } from './session';
import { PresetTimer } from './preset';
import { ReminderConfig } from '../stores/settingsStore';

export type Tier = 'bronze' | 'silver' | 'gold' | 'single';

export type EventType =
  | 'session_saved'
  | 'backup_completed'
  | 'signin'
  | 'preset_created'
  | 'reminder_enabled'
  | 'dnd_enabled'
  | 'app_start';

export type AchievementCategory =
  | 'sessions'
  | 'streaks'
  | 'duration'
  | 'backup'
  | 'variety'
  | 'temporal'
  | 'seasonal';

export interface AchievementStats {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  avgDuration: number;
  currentStreak: number;
}

export interface AchievementBackupState {
  isSignedIn: boolean;
  lastBackupTime: number | null;
  userEmail: string | null;
}

export interface AchievementSettings {
  reminder: ReminderConfig;
  dndEnabled: boolean;
}

export interface AchievementContext {
  stats: AchievementStats;
  sessions: MeditationSession[];
  presets: PresetTimer[];
  backupState: AchievementBackupState;
  settings: AchievementSettings;
  unlocked: Map<string, Set<Tier>>;
  event: { type: EventType; data?: unknown };
}

interface AchievementBase {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  triggers: EventType[];
}

export interface TieredAchievement extends AchievementBase {
  kind: 'tiered';
  metricLabel: string;
  tiers: { bronze: number; silver: number; gold: number };
  getValue: (ctx: AchievementContext) => number;
}

export interface SingleAchievement extends AchievementBase {
  kind: 'single';
  check: (ctx: AchievementContext) => boolean;
  seasonalWindowEnd?: Date;
}

export type Achievement = TieredAchievement | SingleAchievement;

export interface SeasonalTemplate {
  kind: 'seasonal';
  baseId: string;
  name: (year: number) => string;
  description: (year: number) => string;
  icon: string;
  firstEligibleYear: number;
  check: (ctx: AchievementContext, year: number) => boolean;
  windowEnd: (year: number) => Date;
  triggers?: EventType[];
}

export interface UnlockedRecord {
  id: string;
  tier: Tier;
  unlockedAt: number;
}
