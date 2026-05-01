import apiClient from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import short from 'short-uuid';

// ---------------------------------------------------------------------------
// Settings Service — Mirrors web's doctorService.js endpoints exactly
// ---------------------------------------------------------------------------

// --- Availability & Schedules ---

/** GET /api/schedules → Returns { clinics: [...], videoSchedules: [...] } */
export const getSchedules = () => {
  return apiClient.get('/api/schedules');
};

/** PUT /api/schedules → Saves { p_organization_schedules, p_video_schedules } */
export const updateSchedules = (scheduleData: any) => {
  return apiClient.put('/api/schedules', scheduleData);
};

/** PATCH /api/doctors/me/SearchVisibility → { is_visible: boolean } */
export const updateSearchVisibility = (data: { is_visible: boolean }) => {
  return apiClient.patch('/api/doctors/me/SearchVisibility', data);
};

// --- Prescription Style ---

/** GET /api/doctors/me/prescription-style */
export const getPrescriptionStyle = () => {
  return apiClient.get('/api/doctors/me/prescription-style');
};

/** PUT /api/doctors/me/prescription-style */
export const updatePrescriptionStyle = (styleData: any) => {
  return apiClient.put('/api/doctors/me/prescription-style', styleData);
};

/** POST /api/utils/parse-gmaps-url — parses a Google Maps URL into structured address */
export const parseGmapsUrl = (url: string) => {
  return apiClient.post('/api/utils/parse-gmaps-url', { url });
};

// --- Prescription Locations ---

/** GET /api/locations */
export const getPrescriptionLocations = () => {
  return apiClient.get('/api/locations');
};

/** POST /api/locations */
export const addPrescriptionLocation = (locationData: any) => {
  return apiClient.post('/api/locations', locationData);
};

/** DELETE /api/locations/:id */
export const deletePrescriptionLocation = (id: string) => {
  return apiClient.delete(`/api/locations/${id}`);
};

/** POST /api/locations/set-default/:id */
export const setDefaultPrescriptionLocation = (id: string) => {
  return apiClient.post(`/api/locations/set-default/${id}`);
};

// --- Logo Upload (Direct Supabase — same as web) ---

export const uploadPrescriptionLogo = async (uri: string, mimeType: string = 'image/png') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Read file as blob from RN (uri is a local file://... path from image picker)
  const response = await fetch(uri);
  const blob = await response.blob();

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filePath = `${user.id}/logo-${short.generate()}.${ext}`;

  const { error } = await supabase.storage
    .from('doctor-logos')
    .upload(filePath, blob, { contentType: mimeType, upsert: true });

  if (error) throw error;
  return filePath;
};

// --- Signature ---

export const getSignatureUrl = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('doctors').select('signature_url').eq('id', user.id).single();
  if (!data?.signature_url) return null;

  try {
    const { data: urlData, error } = await supabase.storage
      .from('doctor-signatures')
      .createSignedUrl(data.signature_url, 3600);
    if (error) throw error;
    return urlData.signedUrl;
  } catch {
    const { data: publicData } = supabase.storage
      .from('doctor-signatures')
      .getPublicUrl(data.signature_url);
    return publicData.publicUrl;
  }
};

// --- Fast Setup Checker ---

export const checkPrescriptionSetupStatus = async (): Promise<{ hasSignature: boolean, hasLocations: boolean }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasSignature: false, hasLocations: false };

  try {
    // Check signature without generating a signed URL
    const docReq = supabase
      .from('doctors')
      .select('signature_url')
      .eq('id', user.id)
      .single();

    // Check locations count directly
    const locReq = supabase
      .from('prescription_locations')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', user.id);

    const [docRes, locRes] = await Promise.all([docReq, locReq]);

    return {
      hasSignature: !!docRes.data?.signature_url,
      hasLocations: (locRes.count ?? 0) > 0,
    };
  } catch {
    // If it fails, fallback to true to not block the user
    return { hasSignature: true, hasLocations: true };
  }
};

// --- Templates ---

export const listTemplates = () => {
  return apiClient.get('/api/templates');
};

export const deleteTemplate = (templateId: string) => {
  return apiClient.delete(`/api/templates/${templateId}`);
};

// --- Doctor Profile (show_generic_names toggle) ---

export const updateDoctorProfile = (data: any) => {
  return apiClient.put('/api/doctors/me/profile', { step: 'settings', data });
};

// --- Receptionists ---

export const createReceptionist = (data: any) => {
  return apiClient.post('/api/receptionist/create', data);
};
