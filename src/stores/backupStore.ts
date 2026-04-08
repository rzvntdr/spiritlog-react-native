import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as googleAuth from '../services/googleAuthService';
import { uploadBackup, downloadBackup } from '../services/googleDriveService';
import { exportBackupData, importBackupData } from '../services/backupService';

const BACKUP_STORAGE_KEY = '@spiritlog_backup';

interface BackupState {
  isSignedIn: boolean;
  userEmail: string | null;
  userName: string | null;
  isBackingUp: boolean;
  isRestoring: boolean;
  lastBackupTime: number | null;

  // Actions
  signIn: () => Promise<void>;
  signInSilently: () => Promise<void>;
  signOut: () => Promise<void>;
  backupToDrive: () => Promise<{ sizeKb: number }>;
  restoreFromDrive: () => Promise<{ presetCount: number; sessionCount: number } | null>;
  setBackingUp: (value: boolean) => void;
  setRestoring: (value: boolean) => void;
  setLastBackupTime: (time: number) => void;
  loadPersistedState: () => Promise<void>;
}

export const useBackupStore = create<BackupState>((set, get) => ({
  isSignedIn: false,
  userEmail: null,
  userName: null,
  isBackingUp: false,
  isRestoring: false,
  lastBackupTime: null,

  loadPersistedState: async () => {
    try {
      const stored = await AsyncStorage.getItem(BACKUP_STORAGE_KEY);
      if (stored) {
        const { lastBackupTime } = JSON.parse(stored);
        set({ lastBackupTime });
      }
    } catch {}
  },

  signIn: async () => {
    const user = await googleAuth.signIn();
    if (user) {
      set({ isSignedIn: true, userEmail: user.email, userName: user.name });
    }
  },

  signInSilently: async () => {
    const user = await googleAuth.signInSilently();
    if (user) {
      set({ isSignedIn: true, userEmail: user.email, userName: user.name });
    }
  },

  signOut: async () => {
    await googleAuth.signOut();
    set({ isSignedIn: false, userEmail: null, userName: null });
  },

  backupToDrive: async () => {
    set({ isBackingUp: true });
    try {
      const jsonData = await exportBackupData();
      const { size } = await uploadBackup(jsonData);
      const now = Date.now();
      set({ lastBackupTime: now });

      // Persist last backup time
      await AsyncStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({ lastBackupTime: now }));

      return { sizeKb: Math.round(size / 1024) };
    } finally {
      set({ isBackingUp: false });
    }
  },

  restoreFromDrive: async () => {
    set({ isRestoring: true });
    try {
      const jsonData = await downloadBackup();
      if (!jsonData) return null;

      const result = await importBackupData(jsonData);
      return result;
    } finally {
      set({ isRestoring: false });
    }
  },

  setBackingUp: (value) => set({ isBackingUp: value }),
  setRestoring: (value) => set({ isRestoring: value }),
  setLastBackupTime: (time) => set({ lastBackupTime: time }),
}));
