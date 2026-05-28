import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { posthog } from '../config/posthog';
import {
  claimPatientProfile,
  registerDeviceToken
} from '../services/patientService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// ---------------------------------------------------------------------------
// Auth Store — Single source of truth for patient authentication & profile state
// ---------------------------------------------------------------------------

export interface PatientProfile {
  id: string;
  full_name: string;
  email?: string;
  phone_no?: string;
  profile_photo_url?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  city?: string;
  allergies?: string;
  current_medications?: string;
  [key: string]: any;
}

interface AuthState {
  session: Session | null;
  profile: PatientProfile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  needsOnboarding: boolean;
  error: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  completeOnboarding: (fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  needsOnboarding: false,
  error: null,

  setSession: (session) => {
    set({ session, isLoading: false });
    if (session?.user) {
      get().fetchProfile();
    }
  },

  fetchProfile: async () => {
    set({ isProfileLoading: true, error: null });

    try {
      const userId = get().session?.user?.id;
      const userPhone = get().session?.user?.phone;

      if (!userId) {
        throw new Error('No authenticated user found.');
      }

      // ---------------------------------------------------------------
      // EXACT WEB PARITY: Use direct Supabase query with maybeSingle()
      // This is how the web's dashboard/page.js checks the profile.
      // It gracefully handles "no rows" without a 404 error.
      // ---------------------------------------------------------------
      const { data: patientProfile, error: queryError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      // --- CASE 1: No profile row at all (brand new user) ---
      if (!patientProfile) {
        console.log('[AuthStore] No patient profile found. Onboarding required.');
        set({
          profile: null,
          isProfileLoading: false,
          needsOnboarding: true,
        });
        return;
      }

      // --- CASE 2: Profile exists but name is invalid ---
      // Web checks: full_name exists AND full_name !== user.phone
      const hasValidName =
        patientProfile.full_name &&
        patientProfile.full_name !== userPhone;

      if (!hasValidName) {
        console.log('[AuthStore] Profile exists but name is invalid. Onboarding required.');
        set({
          profile: patientProfile as PatientProfile,
          isProfileLoading: false,
          needsOnboarding: true,
        });
        return;
      }

      // --- CASE 3: Profile exists with valid name (returning user) ---
      set({
        profile: patientProfile as PatientProfile,
        isProfileLoading: false,
        needsOnboarding: false,
      });

      // Identify user in PostHog
      posthog.identify(userId, {
        $set: {
          name: patientProfile.full_name,
          email: patientProfile.email || null,
          user_type: 'patient',
        },
      });
    } catch (error: any) {
      console.error('[AuthStore] Profile fetch failed:', error.message);
      set({
        error: error.message,
        isProfileLoading: false,
        profile: null,
      });
    }
  },

  completeOnboarding: async (fullName: string) => {
    const session = get().session;
    if (!session?.user) {
      throw new Error('No authenticated user for onboarding.');
    }

    // Call the backend's claim endpoint — same as web's claimPatientProfile()
    const profile = (await claimPatientProfile({
      userId: session.user.id,
      fullName,
      phone: session.user.phone || '',
    })) as unknown as PatientProfile;

    set({
      profile,
      needsOnboarding: false,
    });

    // Identify in PostHog
    posthog.identify(session.user.id, {
      $set: {
        name: fullName,
        user_type: 'patient',
      },
    });

    posthog.capture('onboarding_completed', { fullName });
  },

  signOut: async () => {
    try {
      posthog.capture('user_signed_out');
      posthog.reset();
      await supabase.auth.signOut();
      set({
        session: null,
        profile: null,
        isLoading: false,
        isProfileLoading: false,
        needsOnboarding: false,
        error: null,
      });
    } catch (error: any) {
      console.error('[AuthStore] Sign out failed:', error.message);
    }
  },

  reset: () => {
    set({
      session: null,
      profile: null,
      isLoading: true,
      isProfileLoading: false,
      needsOnboarding: false,
      error: null,
    });
  },
}));

