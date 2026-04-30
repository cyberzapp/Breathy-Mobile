import apiClient from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';

// ---------------------------------------------------------------------------
// Queue Service — Native mirror of the web's doctorService.js queue endpoints
// ---------------------------------------------------------------------------
// All endpoints hit the same backend, same routes, same payloads.
// The apiClient automatically attaches the Supabase JWT.
// ---------------------------------------------------------------------------

// ─── Session Management ─────────────────────────────────────────────────────

/** Get the currently active clinic session (returns null/undefined if none) */
export const getActiveSession = (): Promise<ActiveSession | null> =>
  apiClient.get('/api/queue/active-session');

/** Get sessions available to start today */
export const getAvailableSessions = (): Promise<AvailableSession[]> =>
  apiClient.get('/api/queue/available-sessions');

/** Start a specific clinic session */
export const startClinicSession = (clinicSessionId: string): Promise<any> =>
  apiClient.post('/api/queue/start-session', { clinicSessionId });

/** End the currently active clinic session */
export const endClinicSession = (): Promise<any> =>
  apiClient.post('/api/queue/end-session');

/** Announce that the doctor is running late */
export const announceDelay = (
  clinicSessionId: string,
  delayMinutes: number
): Promise<any> =>
  apiClient.post('/api/queue/announce-delay', { clinicSessionId, delayMinutes });

// ─── Queue Operations ───────────────────────────────────────────────────────

/** Get today's queue items (both in-clinic + video) */
export const getTodaysQueue = (): Promise<QueueItem[]> =>
  apiClient.get('/api/queue/today');

/** Start consultation for a waitlist entry */
export const startConsultation = (waitlistEntryId: string): Promise<any> =>
  apiClient.post('/api/queue/start-consultation', { waitlistEntryId });

/** End consultation for a waitlist entry */
export const endConsultation = (waitlistEntryId: string): Promise<any> =>
  apiClient.post('/api/queue/end-consultation', { waitlistEntryId });

/** Update waitlist entry status (skip, check-in, etc.) */
export const updateWaitlistStatus = (
  waitlistEntryId: string,
  status: string
): Promise<any> =>
  apiClient.patch(`/api/queue/waitlist/${waitlistEntryId}/status`, { status });

/** Search patients by phone number */
export const findPatientsByPhone = async (phone: string): Promise<any[]> => {
  console.log(`[DEBUG findPatientsByPhone] Requesting for phone:`, phone);
  try {
    const rawData = await apiClient.get('/api/queue/find-patient-by-phone', { params: { phone } });
    console.log(`[DEBUG findPatientsByPhone] Raw response:`, JSON.stringify(rawData).substring(0, 500));
    return rawData as unknown as any[];
  } catch (error: any) {
    console.error(`[DEBUG findPatientsByPhone] Error:`, error.message);
    throw error;
  }
};

/** Add a walk-in patient to the queue */
export const addWalkInPatient = (data: WalkInData): Promise<any> =>
  apiClient.post('/api/queue/add-walk-in', data);

/** Check if patient already exists (to warn user during creation) */
export const checkPatientDuplicate = (name: string, dob: string): Promise<{ isDuplicate: boolean; duplicateId?: string }> => {
  if (!name || !dob) return Promise.resolve({ isDuplicate: false });
  return apiClient.get('/api/database/check-duplicate', { params: { name, dob } });
};

// ─── Video Calls ────────────────────────────────────────────────────────────

/** Get today's video appointments */
export const getTodaysVideoAppointments = (): Promise<any[]> =>
  apiClient.get('/api/queue/today/video');

// ─── Real-time Channels ─────────────────────────────────────────────────────

/** Subscribe to real-time queue changes. Returns cleanup function. */
export function subscribeToQueueChanges(onUpdate: () => void): () => void {
  const uniqueId = Date.now().toString();
  const waitlistChannel = supabase
    .channel(`native:waitlist_entries:queue:${uniqueId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'waitlist_entries' },
      () => onUpdate()
    )
    .subscribe();

  const appointmentsChannel = supabase
    .channel(`native:appointments:queue:${uniqueId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      () => onUpdate()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(waitlistChannel);
    supabase.removeChannel(appointmentsChannel);
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveSession {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  delay_minutes?: number;
  [key: string]: any;
}

export interface AvailableSession {
  id: string;
  start_time: string;
  end_time: string;
  delay_minutes: number;
  [key: string]: any;
}

export interface QueueItem {
  id: string;
  token?: number;
  patient_name: string;
  patient_id?: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  time: string;
  type: 'queue' | 'video';
  raw?: any;
}

export interface WalkInData {
  patientId?: string;
  fullName?: string;
  phone?: string;
  dob?: string;
  gender?: string;
}
