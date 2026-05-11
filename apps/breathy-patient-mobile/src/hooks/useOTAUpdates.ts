import { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Logger } from '../utils/logger';
import type { UpdatePhase } from '../components/ui/UpdateModal';

// ---------------------------------------------------------------------------
// useOTAUpdates — Production OTA update lifecycle
// ---------------------------------------------------------------------------
// Architecture:
//   1. On mount (app launch), checks Expo CDN for a newer JS bundle
//   2. If found → show modal with "Update Now" / "Not Now"
//   3. User taps "Update Now" → download with progress → restart
//   4. Force-update support: "Not Now" button is hidden
//
// The hook is a NO-OP in __DEV__ (OTA updates don't exist locally).
// ---------------------------------------------------------------------------

interface OTAState {
  visible: boolean;
  phase: UpdatePhase;
  progress: number;
  forceUpdate: boolean;
}

export function useOTAUpdates() {
  const [state, setState] = useState<OTAState>({
    visible: false,
    phase: 'idle',
    progress: 0,
    forceUpdate: false,
  });

  // ── Phase 1: Check for updates on launch ──
  useEffect(() => {
    if (__DEV__) return; // OTA updates don't work in development

    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (!cancelled && update.isAvailable) {
          // Check if this is a force update via manifest metadata
          const manifest = update.manifest as any;
          const isForced = manifest?.extra?.expoClient?.extra?.forceUpdate === true
            || manifest?.metadata?.forceUpdate === true;

          Logger.info('OTA update available', {
            source: 'useOTAUpdates',
            forced: isForced,
          });

          setState({
            visible: true,
            phase: 'available',
            progress: 0,
            forceUpdate: isForced,
          });
        }
      } catch (error: any) {
        // Silently fail — don't block the user if CDN is unreachable
        Logger.warn('OTA update check failed', {
          source: 'useOTAUpdates',
          error: error?.message,
        });
      }
    };

    // Small delay so the app doesn't stall on cold start
    const timeout = setTimeout(checkForUpdate, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  // ── Phase 2: Download the update ──
  const handleUpdate = useCallback(async () => {
    if (state.phase === 'ready') {
      // Already downloaded — restart immediately
      try {
        await Updates.reloadAsync();
      } catch (error: any) {
        Logger.error('OTA reload failed', error, { source: 'useOTAUpdates' });
      }
      return;
    }

    setState((s) => ({ ...s, phase: 'downloading', progress: 0 }));

    try {
      // expo-updates doesn't provide granular download progress in the JS API,
      // so we simulate a smooth progress bar to give the user feedback.
      let progressInterval: ReturnType<typeof setInterval> | null = null;
      let simulatedProgress = 0;

      progressInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + Math.random() * 15, 90);
        setState((s) => ({ ...s, progress: simulatedProgress }));
      }, 400);

      await Updates.fetchUpdateAsync();

      // Clear the simulation and jump to 100%
      if (progressInterval) clearInterval(progressInterval);

      setState((s) => ({
        ...s,
        phase: 'ready',
        progress: 100,
      }));

      Logger.info('OTA update downloaded successfully', { source: 'useOTAUpdates' });
    } catch (error: any) {
      Logger.error('OTA download failed', error, { source: 'useOTAUpdates' });
      setState((s) => ({ ...s, phase: 'error', progress: 0 }));
    }
  }, [state.phase]);

  // ── Dismiss ──
  const handleDismiss = useCallback(() => {
    setState((s) => ({ ...s, visible: false, phase: 'idle', progress: 0 }));
  }, []);

  // ── Retry (after error) ──
  const handleRetry = useCallback(() => {
    handleUpdate();
  }, [handleUpdate]);

  return {
    updateModalVisible: state.visible,
    updatePhase: state.phase,
    updateProgress: state.progress,
    isForceUpdate: state.forceUpdate,
    onUpdate: handleUpdate,
    onDismiss: handleDismiss,
    onRetry: handleRetry,
  };
}
