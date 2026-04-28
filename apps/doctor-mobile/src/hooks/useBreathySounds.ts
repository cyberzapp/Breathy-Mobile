import { useCallback, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// ---------------------------------------------------------------------------
// useBreathySounds — Native Haptic & Audio Engine (Singleton)
// ---------------------------------------------------------------------------
// Sounds are loaded ONCE globally and shared across all consumers.
// Only haptics + playback triggers happen per-component.
// This eliminates duplicate Audio.Sound instances (was: 7×5 = 35 sounds).
// ---------------------------------------------------------------------------

// Sound asset requires (resolved at bundle time)
const SOUND_ASSETS = {
  switchOn: require('../../assets/sounds/switch-on.mp3'),
  switchOff: require('../../assets/sounds/switch-off.mp3'),
  success: require('../../assets/sounds/success.mp3'),
  pop: require('../../assets/sounds/pop.mp3'),
  error: require('../../assets/sounds/error.mp3'),
};

type SoundKey = keyof typeof SOUND_ASSETS;

// ---------------------------------------------------------------------------
// Global Singleton — sounds loaded once for entire app lifecycle
// ---------------------------------------------------------------------------
let _isInitialized = false;
let _isInitializing = false;
const _sounds: Record<SoundKey, Audio.Sound | null> = {
  switchOn: null,
  switchOff: null,
  success: null,
  pop: null,
  error: null,
};

async function initSounds() {
  if (_isInitialized || _isInitializing) return;
  _isInitializing = true;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    // Load all sounds in parallel for fastest startup
    const keys = Object.keys(SOUND_ASSETS) as SoundKey[];
    const results = await Promise.allSettled(
      keys.map((key) =>
        Audio.Sound.createAsync(SOUND_ASSETS[key], {
          shouldPlay: false,
          volume: 0.6,
        })
      )
    );

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        _sounds[keys[i]] = result.value.sound;
      }
    });

    _isInitialized = true;
  } catch {
    // Audio init failed — haptics still work
  } finally {
    _isInitializing = false;
  }
}

async function playSoundGlobal(key: SoundKey) {
  const sound = _sounds[key];
  if (!sound) return;
  try {
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Playback failed silently — haptic still fires
  }
}

// ---------------------------------------------------------------------------
// Hook — thin wrapper that triggers init (once) and returns play functions
// ---------------------------------------------------------------------------
export const useBreathySounds = () => {
  const initCalled = useRef(false);

  // Trigger lazy initialization on first hook usage (not blocking render)
  useEffect(() => {
    if (!initCalled.current) {
      initCalled.current = true;
      initSounds();
    }
  }, []);

  // 1. Live Mode ON: Energetic double-tap + switch-on sound
  const playSwitchOn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 80);
    playSoundGlobal('switchOn');
  }, []);

  // 2. Relax Mode: Single soft click + switch-off sound
  const playSwitchOff = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSoundGlobal('switchOff');
  }, []);

  // 3. Success: A triumphant pulse + success sound
  const playSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSoundGlobal('success');
  }, []);

  // 4. Pop: Very crisp, short tick + pop sound
  const playPop = useCallback(() => {
    Haptics.selectionAsync();
    playSoundGlobal('pop');
  }, []);

  // 5. Error: Heavy buzz + error sound
  const playError = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    playSoundGlobal('error');
  }, []);

  return {
    playSwitchOn,
    playSwitchOff,
    playSuccess,
    playPop,
    playError,
  };
};
