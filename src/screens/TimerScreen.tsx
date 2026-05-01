import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, Alert, AppState, AppStateStatus, Platform, Switch } from 'react-native';
import Slider from '@react-native-community/slider';
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
import { useAchievementStore } from '../stores/achievementStore';
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
} from '../services/notificationService';
import * as Dnd from '../../modules/dnd';
import * as MeditationService from '../../modules/meditationService';

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
  const dndEnabled = useSettingsStore((s) => s.dndEnabled);
  const setDndEnabled = useSettingsStore((s) => s.setDndEnabled);
  const ambientVolume = useSettingsStore((s) => s.ambientVolume);
  const setAmbientVolume = useSettingsStore((s) => s.setAmbientVolume);
  const [dndActive, setDndActive] = useState(false);

  // Stores — use stable selector to avoid infinite re-render loops
  const preset = usePresetStore(
    useCallback((s) => s.presets.find((p) => p.id === presetId), [presetId])
  );
  const insertSession = useSessionStore((s) => s.insertSession);

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
  const hasStarted = useTimerStore((s) => s.hasStarted);

  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const isExitingRef = useRef(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseIndexRef = useRef(-1);
  const appStateRef = useRef(AppState.currentState);
  const dndActiveRef = useRef(dndActive);
  dndActiveRef.current = dndActive;

  // Initialize sound engine + session. Depends on presetId so it re-runs if the
  // screen is reused with a different preset (e.g. navigate() mid-swipe-back animation).
  useEffect(() => {
    soundEngine.init();
    const currentPreset = usePresetStore.getState().presets.find((p) => p.id === presetId);
    if (currentPreset) {
      useTimerStore.getState().startSession(currentPreset);
      usePresetStore.getState().markUsed(currentPreset.id);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      soundEngine.dispose();
      cancelMeditationNotification();
      MeditationService.stop();
      // Disable DND only if WE turned it on (tracked via dndActive),
      // regardless of the current preference value. Otherwise DND stays
      // stuck on the OS when the user toggles the preference off mid-session.
      if (dndActiveRef.current && Platform.OS === 'android') {
        Dnd.disableDnd();
      }
      useTimerStore.getState().reset();
    };
  }, [presetId]);

  // Keep refs for values used in AppState handler to avoid re-registering the listener
  const isActiveRef = useRef(isActive);
  const isPausedRef = useRef(isPaused);
  const presetRef = useRef(preset);
  isActiveRef.current = isActive;
  isPausedRef.current = isPaused;
  presetRef.current = preset;

  // Schedule a fallback completion notification when going to background.
  // The foreground service handles the persistent ongoing notification.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && nextState.match(/inactive|background/)) {
        if (isActiveRef.current && !isPausedRef.current) {
          const remaining = getRemainingMs();
          if (remaining !== null && remaining > 0) {
            scheduleMeditationComplete(remaining);
          }
        }
      } else if (nextState === 'active') {
        cancelMeditationNotification();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [getRemainingMs]);

  // Enable/disable DND based on play state.
  // The condition for DND to be ON is: dndEnabled (preference) && playing && active.
  // For any other state, if we previously turned DND on (dndActive), turn it off.
  // Tracking dndActive separately from dndEnabled lets the user toggle the preference
  // mid-session without leaving DND stuck on.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const shouldBeActive = dndEnabled && !isPaused && isActive;
    if (shouldBeActive && !dndActive && Dnd.isAccessGranted()) {
      Dnd.enableDnd();
      setDndActive(true);
    } else if (!shouldBeActive && dndActive) {
      Dnd.disableDnd();
      setDndActive(false);
    }
  }, [isPaused, isActive, dndEnabled, dndActive]);

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
      MeditationService.stop();
      setSaveDialogVisible(true);
    }
  }, [engineState.isComplete, isActive, pause]);

  // Foreground service: start when user first hits play, stop on cleanup.
  // Updates pushed every second so the notification timer counts down.
  useEffect(() => {
    if (!hasStarted || Platform.OS !== 'android' || !preset) return;

    const presetTotalMs = getPresetTotalDurationMs(preset);

    const buildState = (): MeditationService.MeditationState => {
      const store = useTimerStore.getState();
      const remaining = store.getRemainingMs() ?? 0;
      const state = store.engineState;
      const els = store.elements;
      return {
        presetName: preset.name,
        phaseName: state.phaseName || preset.name,
        isPaused: store.isPaused,
        remainingMs: remaining,
        totalMs: presetTotalMs,
        canSkip: state.currentElementIndex < els.length - 1,
      };
    };

    MeditationService.start(buildState());
    const interval = setInterval(() => {
      MeditationService.update(buildState());
    }, 1000);

    return () => {
      clearInterval(interval);
      MeditationService.stop();
    };
  }, [hasStarted, preset]);

  // Push immediate update when pause-state or phase changes (don't wait for interval tick)
  useEffect(() => {
    if (!hasStarted || Platform.OS !== 'android' || !preset) return;
    const store = useTimerStore.getState();
    const remaining = store.getRemainingMs() ?? 0;
    const totalMs = getPresetTotalDurationMs(preset);
    MeditationService.update({
      presetName: preset.name,
      phaseName: engineState.phaseName || preset.name,
      isPaused,
      remainingMs: remaining,
      totalMs,
      canSkip: engineState.currentElementIndex < elements.length - 1,
    });
  }, [isPaused, engineState.currentElementIndex, engineState.phaseName, hasStarted, preset, elements.length]);

  // Listen for notification button presses
  useEffect(() => {
    const subs = [
      MeditationService.addActionListener('restart', () => {
        useTimerStore.getState().restartCurrent();
      }),
      MeditationService.addActionListener('pausePlay', () => {
        const store = useTimerStore.getState();
        if (store.isPaused) store.play(); else store.pause();
      }),
      MeditationService.addActionListener('stop', () => {
        useTimerStore.getState().stop();
        soundEngine.stopIntervalSounds();
        cancelMeditationNotification();
        MeditationService.stop();
        setSaveDialogVisible(true);
      }),
      MeditationService.addActionListener('skip', () => {
        useTimerStore.getState().skipToNext();
      }),
    ];
    return () => subs.forEach((s) => s?.remove());
  }, []);

  // Intercept swipe-back / hardware back button
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isActive || engineState.isComplete || !hasStarted || isExitingRef.current) return;

      e.preventDefault();

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
            isExitingRef.current = true;
            cancelMeditationNotification();
            MeditationService.stop();
            reset();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, isActive, engineState.isComplete, hasStarted, stop, reset]);

  const handleStop = useCallback(() => {
    stop();
    soundEngine.stopIntervalSounds();
    cancelMeditationNotification();
    MeditationService.stop();
    setSaveDialogVisible(true);
  }, [stop]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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

        useAchievementStore.getState().triggerCheck({ type: 'session_saved', data: session });

        // Auto-backup after session if enabled and signed in
        const autoBackup = useSettingsStore.getState().autoBackupAfterSession;
        if (autoBackup) {
          const { isSignedIn, backupToDrive } = useBackupStore.getState();
          if (isSignedIn) {
            backupToDrive().catch(() => {}); // fire-and-forget
          }
        }

        isExitingRef.current = true;
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
    isExitingRef.current = true;
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

  const currentEl = elements[engineState.currentElementIndex];
  const hasAmbient =
    currentEl?.kind === 'duration' &&
    currentEl.soundConfigs.some((sc) => sc.type === 'AMBIENT');

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

      {/* DND Toggle */}
      {Platform.OS === 'android' && (
        <View style={{ marginHorizontal: 24, marginBottom: 12 }}>
          <Pressable
            onPress={() => {
              if (!dndEnabled && !Dnd.isAccessGranted()) {
                Alert.alert(
                  'Permission Required',
                  'SpiritLog needs Do Not Disturb access to silence notifications during meditation.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Open Settings',
                      onPress: () => {
                        Dnd.requestAccess();
                        const sub = AppState.addEventListener('change', (state) => {
                          if (state === 'active') {
                            sub.remove();
                            if (Dnd.isAccessGranted()) {
                              setDndEnabled(true);
                            }
                          }
                        });
                      },
                    },
                  ]
                );
                return;
              }
              setDndEnabled(!dndEnabled);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: c.surface,
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 14 }}>{dndEnabled ? '🔕' : '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.onBackground }}>
                Do Not Disturb
              </Text>
              <Text style={{ fontSize: 12, color: c.onSurface, marginTop: 1 }}>
                {dndEnabled
                  ? dndActive ? 'Active — notifications silenced' : 'Will activate when timer runs'
                  : 'Tap to enable during sessions'}
              </Text>
            </View>
            <Switch
              value={dndEnabled}
              onValueChange={() => {
                if (!dndEnabled && !Dnd.isAccessGranted()) {
                  Alert.alert(
                    'Permission Required',
                    'SpiritLog needs Do Not Disturb access to silence notifications during meditation.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => {
                          Dnd.requestAccess();
                          const sub = AppState.addEventListener('change', (state) => {
                            if (state === 'active') {
                              sub.remove();
                              if (Dnd.isAccessGranted()) {
                                setDndEnabled(true);
                              }
                            }
                          });
                        },
                      },
                    ]
                  );
                  return;
                }
                setDndEnabled(!dndEnabled);
              }}
              trackColor={{ false: c.surfaceVariant, true: c.primaryContainer }}
              thumbColor={dndEnabled ? c.primary : c.onSurface}
            />
          </Pressable>
        </View>
      )}

      {/* Timer Circle */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TimerCircle
          displayTimeMs={engineState.displayTimeMs}
          progress={engineState.phaseProgress}
          phaseName={engineState.phaseName}
          phaseType={engineState.phaseType}
          isPlayingSound={engineState.currentElementKind === 'sound'}
        />
      </View>

      {/* Ambient volume slider — visible only when current phase has ambient sound */}
      {hasAmbient && (
        <View style={{ marginHorizontal: 24, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔉</Text>
            <Text style={{ flex: 1, fontSize: 13, color: c.onSurface }}>Ambient Volume</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.onBackground }}>
              {Math.round(ambientVolume * 100)}%
            </Text>
          </View>
          <Slider
            minimumValue={0.05}
            maximumValue={1}
            step={0.05}
            value={ambientVolume}
            onValueChange={(v) => {
              setAmbientVolume(v);
              soundEngine.setAmbientVolume(v);
            }}
            minimumTrackTintColor={c.primary}
            maximumTrackTintColor={c.surfaceVariant}
            thumbTintColor={c.primary}
          />
        </View>
      )}

      {/* Phase Timeline */}
      <View style={{ marginBottom: 16 }}>
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
