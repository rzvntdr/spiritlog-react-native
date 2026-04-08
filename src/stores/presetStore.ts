import { create } from 'zustand';
import { PresetTimer } from '../types/preset';
import * as repo from '../db/presetRepository';
import { seedDefaultPresets } from '../db/seed';

interface PresetState {
  presets: PresetTimer[];
  isLoaded: boolean;

  // Actions
  loadPresets: () => Promise<void>;
  createPreset: (preset: PresetTimer) => Promise<void>;
  updatePreset: (preset: PresetTimer) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reorder: (section: 'favorites' | 'all', fromIndex: number, toIndex: number) => Promise<void>;
  markUsed: (id: string) => Promise<void>;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  isLoaded: false,

  loadPresets: async () => {
    // Seed defaults if empty
    const count = await repo.getPresetCount();
    if (count === 0) {
      await seedDefaultPresets();
    }
    const presets = await repo.getAllPresets();
    set({ presets, isLoaded: true });
  },

  createPreset: async (preset) => {
    await repo.insertPreset(preset);
    const presets = await repo.getAllPresets();
    set({ presets });
  },

  updatePreset: async (preset) => {
    await repo.updatePreset(preset);
    const presets = await repo.getAllPresets();
    set({ presets });
  },

  deletePreset: async (id) => {
    await repo.deletePreset(id);
    const presets = await repo.getAllPresets();
    set({ presets });
  },

  toggleFavorite: async (id) => {
    await repo.toggleFavorite(id);
    const presets = await repo.getAllPresets();
    set({ presets });
  },

  reorder: async (section, fromIndex, toIndex) => {
    const { presets } = get();
    const favorites = presets.filter((p) => p.isFavorite);
    const nonFavorites = presets.filter((p) => !p.isFavorite);
    const list = section === 'favorites' ? [...favorites] : [...nonFavorites];

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    // Update sort_order for all items in the reordered section
    for (let i = 0; i < list.length; i++) {
      await repo.updatePresetOrder(list[i].id, i);
    }

    const all = await repo.getAllPresets();
    set({ presets: all });
  },

  markUsed: async (id) => {
    await repo.updateLastUsed(id);
    const presets = await repo.getAllPresets();
    set({ presets });
  },
}));

// Derived selectors
export const selectFavorites = (state: PresetState) =>
  state.presets.filter((p) => p.isFavorite);

export const selectNonFavorites = (state: PresetState) =>
  state.presets.filter((p) => !p.isFavorite);
