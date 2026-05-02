import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { cacheProfile, getCachedProfile } from '../services/offlineCacheService';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { registerDeviceToken, unregisterDeviceToken } from '../services/notificationService';
import { posthog } from '../config/posthog';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Auth Store — Single source of truth for authentication & profile state
// ---------------------------------------------------------------------------
// This mirrors the web's profileStore.js `fetchInitialStatus` logic but is
// adapted for the native app's hybrid routing architecture.
// ---------------------------------------------------------------------------

export interface ProfileStatus {
  id?: string;
  full_name?: string;
  profile_status: string;
  profile_photo_url?: string;
  has_completed_tour?: boolean;
  [key: string]: any;
}

interface AuthState {
  session: Session | null;
  profileStatus: ProfileStatus | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  fetchProfileStatus: (silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profileStatus: null,
  isLoading: true,
  isProfileLoading: false,
  error: null,

  setSession: (session) => {
    set({ session, isLoading: false });
  },

  // ---------------------------------------------------------------------------
  // fetchProfileStatus
  // ---------------------------------------------------------------------------
  // Mirrors the web's `fetchInitialStatus()` from profileStore.js:
  //   1. Gets the authenticated user from Supabase
  //   2. Calls the `get_doctor_full_profile` RPC
  //   3. If data exists → set profileStatus from DB
  //   4. If null → new user, set profile_status to 'onboarding'
  // ---------------------------------------------------------------------------
  fetchProfileStatus: async (silent = false) => {
    if (!silent) set({ isProfileLoading: true, error: null });
    else set({ error: null });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('No authenticated user found.');
      }

      const { data, error } = await supabase.rpc('get_doctor_full_profile', {
        p_doctor_id: user.id,
      });

      if (error) throw error;

      if (data) {
        // Existing user — use DB profile status
        set({
          profileStatus: data as ProfileStatus,
          isProfileLoading: false,
        });
        // Identify user in PostHog with profile data
        posthog.identify(user.id, {
          $set: {
            name: data.full_name,
            profile_status: data.profile_status,
          },
        });
        // Cache profile for offline viewing
        await cacheProfile(data);

        // Register push token
        if (!silent) {
          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (pushToken) {
              await registerDeviceToken(user.id, pushToken);
            }
          } catch (pushErr) {
            console.log('[AuthStore] Failed to register push token:', pushErr);
          }
        }
      } else {
        // New user — needs onboarding
        set({
          profileStatus: { profile_status: 'onboarding' },
          isProfileLoading: false,
        });
      }
    } catch (error: any) {
      Logger.error('Profile status fetch failed', error, { source: 'AuthStore' });

      // Attempt to load from offline cache
      const cached = await getCachedProfile();
      if (cached) {
        Logger.info('Loaded profile from offline cache');
        set({
          profileStatus: cached as ProfileStatus,
          isProfileLoading: false,
          error: null, // Don't show error if we have cached data
        });
      } else {
        set({
          error: error.message,
          isProfileLoading: false,
          profileStatus: null,
        });
      }
    }
  },

  signOut: async () => {
    try {
      // Unregister token before signing out
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await unregisterDeviceToken(pushToken);
        }
      } catch (e) {
        Logger.warn('Failed to unregister push token', { source: 'AuthStore' });
      }

      posthog.capture('user_signed_out');
      posthog.reset();
      await supabase.auth.signOut();
      set({
        session: null,
        profileStatus: null,
        isLoading: false,
        isProfileLoading: false,
        error: null,
      });
    } catch (error: any) {
      Logger.error('Sign out failed', error, { source: 'AuthStore' });
    }
  },

  reset: () => {
    set({
      session: null,
      profileStatus: null,
      isLoading: true,
      isProfileLoading: false,
      error: null,
    });
  },
}));
