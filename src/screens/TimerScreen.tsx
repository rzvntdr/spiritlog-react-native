import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useTimerStore } from '../stores/timerStore';
import { usePresetStore } from '../stores/presetStore';
import { useSessionStore } from '../stores/sessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useBackupStore } from '../stores/backupStore';
import { MeditationSession } from '../types/session';
import { generateUUID } from '../utils/uuid';
import { getPresetTotalDurationMs } from '../utils/presetBuilder';
import TimerCircle from '../components/timer/TimerCircle';
import PhaseTimeline from '../components/timer/PhaseTimeline';
import TimerControls from '../components/timer/TimerControls';
import SaveSessionDialog from '../components/timer/SaveSessionDialog';
import { soundEngine } from '../services/soundEngine';
import {
  scheduleMeditationComplete,
  cancelMeditationNotification,
  showOngoingMeditationNotification,
  dismissOngoingNotification,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Timer'>;

const TICK_INTERVAL = 100;

export default function TimerScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { presetId } = route.params;

  // Keep screen awake during meditation
  const screenAwake = useSettingsStore((s) => s.screenAwake);
  useEffect(() => {
    if (screenAwake) {
      activateKeepAwakeAsync('timer');
    }
    return () => {
      deactivateKeepAwake('timer');
    };
  }, [screenAwake]);

  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  // Stores — use stable selector to avoid infinite re-render loops
  const preset = usePresetStore(
    useCallback((s) => s.presets.find((p) => p.id === presetId), [presetId])
  );
  const markUsed = usePresetStore((s) => s.markUsed);
  const insertSession = useSessionStore((s) => s.insertSession);

  const startSession = useTimerStore((s) => s.startSession);
  const play = useTimerStore((s) => s.play);
  const pause = useTimerStore((s) => s.pause);
  const stop = useTimerStore((s) => s.stop);
  const skipToNext = useTimerStore((s) => s.skipToNext);
  const restartCurrent = useTimerStore((s) => s.restartCurrent);
  const tick = useTimerStore((s) => s.tick);
  const reset = useTimerStore((s) => s.reset);
  const clearPendingHaptic = useTimerStore((s) => s.clearPendingHaptic);

  const isActive = useTimerStore((s) => s.isActive);
  const isPaused = useTimerStore((s) => s.isPaused);
  const engineState = useTimerStore((s) => s.engineState);
  const elements = useTimerStore((s) => s.elements);
  const pendingHaptic = useTimerStore((s) => s.pendingHaptic);
  const pendingSoundId = useTimerStore((s) => s.pendingSoundId);
  const clearPendingSound = useTimerStore((s) => s.clearPendingSound);
  const pendingSoundMarker = useTimerStore((s) => s.pendingSoundMarker);
  const clearPendingSoundMarker = useTimerStore((s) => s.clearPendingSoundMarker);
  const soundMarkerFinished = useTimerStore((s) => s.soundMarkerFinished);
  const getRemainingMs = useTimerStore((s) => s.getRemainingMs);

  const [saveDialogVisible, setSaveDialogVisible] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseIndexRef = useRef(-1);
  const appStateRef = useRef(AppState.currentState);

  // Initialize sound engine + session on mount
  useEffect(() => {
    soundEngine.init();
    if (preset && !isActive) {
      startSession(preset);
      markUsed(preset.id);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      soundEngine.dispose();
      cancelMeditationNotification();
      dismissOngoingNotification();
    };
  }, []);

  // Keep refs for values used in AppState handler to avoid re-registering the listener
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const presetRef = useRef(preset);
  isActiveRef.current = isActive;
  isPausedRef.current = isPaused;
  presetRef.current = preset;

  // Handle app backgrounding / foregrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
        // Going to background — schedule notification if timer is running
        if (isActiveRef.current && !isPausedRef.current) {
          const remaining = getRemainingMs();
          if (remaining !== null && remaining > 0) {
            scheduleMeditationComplete(remaining);
          }
          if (presetRef.current) {
            showOngoingMeditationNotification(presetRef.current.name);
          }
        }
      } else if (nextState === 'active') {
        // Returning to foreground — cancel scheduled notification (timer will handle completion)
        cancelMeditationNotification();
        dismissOngoingNotification();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [getRemainingMs]);

  // Start/stop tick interval based on pause state
  useEffect(() => {
    if (!isPaused && isActive) {
      tickRef.current = setInterval(tick, TICK_INTERVAL);
      soundEngine.resumeAmbient();
    } else {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (isPaused) soundEngine.pauseAmbient();
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPaused, isActive, tick]);

  // Play pending sounds from timer engine (fire-and-forget transition sounds)
  useEffect(() => {
    if (pendingSoundId !== null) {
      soundEngine.playSound(pendingSoundId);
      clearPendingSound();
    }
  }, [pendingSoundId, clearPendingSound]);

  // Play sound marker elements — wait for the sound to finish, then advance
  useEffect(() => {
    if (pendingSoundMarker !== null) {
      clearPendingSoundMarker();
      soundEngine.playSoundAndWait(pendingSoundMarker).then(() => {
        soundMarkerFinished();
      });
    }
  }, [pendingSoundMarker, clearPendingSoundMarker, soundMarkerFinished]);

  // Start/stop interval sounds when phase changes
  useEffect(() => {
    const idx = engineState.currentElementIndex;
    if (idx === prevPhaseIndexRef.current) return;
    prevPhaseIndexRef.current = idx;

    const currentEl = elements[idx];
    if (currentEl?.kind === 'duration' && currentEl.soundConfigs.length > 0) {
      soundEngine.startIntervalSounds(currentEl.soundConfigs);
    } else {
      soundEngine.stopIntervalSounds();
    }
  }, [engineState.currentElementIndex, elements]);

  // Tick interval sounds alongside the timer (use phaseElapsedMs which always counts up)
  useEffect(() => {
    if (!isPaused && isActive && engineState.phaseType) {
      soundEngine.tick(engineState.phaseElapsedMs);
    }
  }, [engineState.phaseElapsedMs, isPaused, isActive, engineState.phaseType]);

  // Handle haptic feedback
  useEffect(() => {
    if (pendingHaptic && hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      clearPendingHaptic();
    } else if (pendingHaptic) {
      clearPendingHaptic();
    }
  }, [pendingHaptic, hapticsEnabled, clearPendingHaptic]);

  // Auto-show save dialog when complete
  useEffect(() => {
    if (engineState.isComplete && isActive) {
      pause();
      setSaveDialogVisible(true);
    }
  }, [engineState.isComplete, isActive, pause]);

  const handleStop = useCallback(() => {
    stop();
    soundEngine.stopIntervalSounds();
    cancelMeditationNotification();
    dismissOngoingNotification();
    setSaveDialogVisible(true);
  }, [stop]);

  const handleBack = useCallback(() => {
    if (isActive && !engineState.isComplete) {
      Alert.alert('End Meditation?', 'Your progress will be lost if you go back without saving.', [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'End & Save',
          onPress: () => {
            stop();
            setSaveDialogVisible(true);
          },
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            cancelMeditationNotification();
            dismissOngoingNotification();
            reset();
            navigation.goBack();
          },
        },
      ]);
    } else {
      reset();
      navigation.goBack();
    }
  }, [isActive, engineState.isComplete, stop, reset, navigation]);

  const handleSaveSession = useCallback(
    async (durationMinutes: number) => {
      try {
        const session: MeditationSession = {
          id: generateUUID(),
          duration: durationMinutes,
          date: Date.now(),
          presetId: preset?.id ?? null,
          notes: null,
        };
        await insertSession(session);

        // Auto-backup after session if enabled and signed in
        const autoBackup = useSettingsStore.getState().autoBackupAfterSession;
        if (autoBackup) {
          const { isSignedIn, backupToDrive } = useBackupStore.getState();
          if (isSignedIn) {
            backupToDrive().catch(() => {}); // fire-and-forget
          }
        }

        setSaveDialogVisible(false);
        reset();
        navigation.goBack();
      } catch (e: any) {
        Alert.alert('Save Error', e?.message ?? 'Failed to save session');
      }
    },
    [preset, insertSession, reset, navigation]
  );

  const handleDiscard = useCallback(() => {
    setSaveDialogVisible(false);
    reset();
    navigation.goBack();
  }, [reset, navigation]);

  if (!preset) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: c.onSurface }}>Preset not found</Text>
      </SafeAreaView>
    );
  }

  const presetTotalMinutes = Math.round(getPresetTotalDurationMs(preset) / 60000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={handleBack} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text
          style={{ flex: 1, textAlign: 'center', fontSize: 18, color: c.onBackground }}
          numberOfLines={1}
        >
          {preset.name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Timer Circle */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TimerCircle
          displayTimeMs={engineState.displayTimeMs}
          progress={engineState.phaseProgress}
          phaseName={engineState.phaseName}
          phaseType={engineState.phaseType}
        />
      </View>

      {/* Phase Timeline */}
      <View style={{ marginBottom: 24 }}>
        <PhaseTimeline elements={elements} currentIndex={engineState.currentElementIndex} />
      </View>

      {/* Controls */}
      <View style={{ paddingBottom: 32 }}>
        <TimerControls
          isPaused={isPaused}
          onPlay={play}
          onPause={pause}
          onStop={handleStop}
          onRestart={restartCurrent}
          onSkip={skipToNext}
        />
      </View>

      {/* Save Session Dialog */}
      <SaveSessionDialog
        visible={saveDialogVisible}
        elapsedMs={engineState.elapsedMeditationMs}
        presetTotalMinutes={presetTotalMinutes}
        onSave={handleSaveSession}
        onDiscard={handleDiscard}
      />
    </SafeAreaView>
  );
}
