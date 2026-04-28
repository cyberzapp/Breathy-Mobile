import apiClient from '../lib/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Prescription Service — API layer for prescription creation & search
// ---------------------------------------------------------------------------
// Mirrors the web's doctorService.js prescription section.
// Each function returns the data payload directly (apiClient interceptor
// strips the Axios response wrapper).
// ---------------------------------------------------------------------------

// ─── Constants ───

export const COMMON_FREQUENCIES = [
  '1-0-0',
  '0-1-0',
  '0-0-1',
  '1-1-0',
  '1-0-1',
  '0-1-1',
  '1-1-1',
  'SOS',
];

export const COMMON_DURATIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  '2 months',
  '3 months',
  'Continue',
];

// ─── Types ───

export interface Medication {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  notes: string;
  generic_name: string;
}

export interface Investigation {
  name: string;
}

export interface LabReport {
  test_name: string;
  value: string;
  unit: string;
}

export interface PrescriptionPayload {
  location_id: string;
  diagnosis: string;
  icd_code?: string;
  medications: Medication[];
  investigations: string; // Joined with \n
  advice: string;
  patientName: string;
  patientPhone: string;
  patientAge?: string;
  patientGender?: string;
  patientId?: string | null;
  appointmentId?: string | null;
  vitals?: {
    bp?: string;
    pulse?: string;
    spo2?: string;
    temp?: string;
    weight?: string;
  } | null;
  follow_up_date?: string | null;
  lab_reports?: LabReport[] | null;
  default_advice?: string | null;
  freehand_image_url?: string | null;
  ai_confidence?: number;
}

export interface DrugOption {
  brand_name: string;
  generic_name: string;
  strength: string;
  form?: string;
}

export interface TestOption {
  test_name: string;
  category?: string;
}

export interface PrescriptionLocation {
  id: string;
  location_label: string;
  clinic_name: string;
  address_line_1: string;
  is_default: boolean;
}

export interface PrescriptionTemplate {
  id: string;
  template_name: string;
  diagnosis: string;
  advice: string;
  medications: any[];
  investigations: any[];
}

// ─── Prescription CRUD ───

export const createPrescription = (data: PrescriptionPayload) => {
  return apiClient.post('/api/prescriptions', data);
};

export const fetchPrescriptionById = (prescriptionId: string) => {
  return apiClient.get(`/api/prescriptions/${prescriptionId}`);
};

// ─── Freehand Pipeline ───

export const instantFreehandExtract = (imageBase64: string) => {
  return apiClient.post(
    '/api/prescriptions/freehand/instant',
    { imageBase64 },
    { timeout: 30000 }
  );
};

export const submitFreehandScan = (scanData: any) => {
  return apiClient.post('/api/prescriptions/freehand', scanData, {
    timeout: 30000,
  });
};

export const pollFreehandJobStatus = (jobId: string) => {
  return apiClient.get(`/api/prescriptions/freehand/${jobId}/status`);
};

export const confirmFreehandPrescription = (
  jobId: string,
  prescriptionData: any
) => {
  return apiClient.post(`/api/prescriptions/freehand/${jobId}/confirm`, {
    prescriptionData,
  });
};

// ─── Search APIs ───

export const searchDrugs = (searchTerm: string = '', signal?: AbortSignal) => {
  if (searchTerm.length < 2) return Promise.resolve([]);
  return apiClient.get('/api/drugs/search', {
    params: { searchTerm },
    signal,
  }) as Promise<DrugOption[]>;
};

export const searchMedicalTests = (
  searchTerm: string = '',
  signal?: AbortSignal
) => {
  if (searchTerm.length < 2) return Promise.resolve([]);
  return apiClient.get('/api/medical-tests/search', {
    params: { searchTerm },
    signal,
  }) as Promise<TestOption[]>;
};

export const getFavoriteDrugs = (): Promise<DrugOption[]> => {
  return apiClient.get('/api/drugs/favorites') as Promise<DrugOption[]>;
};

export const getFavoriteTests = (): Promise<TestOption[]> => {
  return apiClient.get('/api/medical-tests/favorites') as Promise<TestOption[]>;
};

// ─── Patient Lookup ───

export const findPatientsByPhone = (phone: string) => {
  return apiClient.get('/api/queue/find-patient-by-phone', { params: { phone } });
};

export const searchCommonNames = async (searchTerm: string): Promise<{ name?: string; surname?: string }[]> => {
  if (searchTerm.length < 2) return [];
  const res: any = await apiClient.get('/api/patient-data/common-names', {
    params: { searchTerm },
  });
  return Array.isArray(res) ? res : (res.data || []);
};

export const searchSurnames = async (searchTerm: string): Promise<{ name?: string; surname?: string }[]> => {
  if (searchTerm.length < 2) return [];
  const res: any = await apiClient.get('/api/patient-data/surnames', {
    params: { searchTerm },
  });
  return Array.isArray(res) ? res : (res.data || []);
};

export const getCountryCodes = () => {
  return apiClient.get('/api/patient-data/country-codes');
};

// ─── Locations ───

export const getPrescriptionLocations = (): Promise<PrescriptionLocation[]> => {
  return apiClient.get(
    '/api/locations'
  ) as Promise<PrescriptionLocation[]>;
};

// ─── Templates ───

export const listTemplates = (): Promise<PrescriptionTemplate[]> => {
  return apiClient.get('/api/templates') as Promise<PrescriptionTemplate[]>;
};

export const getTemplateById = (templateId: string) => {
  return apiClient.get(`/api/templates/${templateId}`);
};

export const createTemplate = (data: {
  template_name: string;
  diagnosis: string;
  advice: string;
  medications: any[];
  investigations: any[];
}) => {
  return apiClient.post('/api/templates', data);
};

// ─── Signature ───

export const uploadSignature = (signatureImage: string) => {
  return apiClient.post('/api/prescriptions/signature', { signatureImage });
};

// ─── Recent Prescriptions (Dashboard widget) ───

export const getRecentPrescriptions = (): Promise<any[]> => {
  return apiClient.get('/api/doctor-dashboard/recent-prescriptions') as Promise<any[]>;
};

export const getPrescriptionEmailDetails = (prescriptionId: string) => {
  return apiClient.get(`/api/prescriptions/${prescriptionId}/email-details`);
};

export const sendPrescriptionEmail = (data: {
  prescriptionId: string;
  recipientEmail: string;
  patientName: string;
}) => {
  return apiClient.post('/api/prescriptions/email', data);
};

// ─── Offline Favorites Cache ───
// Cache favorite drugs/tests to AsyncStorage for instant offline access

const CACHE_FAVORITE_DRUGS = 'cache_favorite_drugs';
const CACHE_FAVORITE_TESTS = 'cache_favorite_tests';

export async function cacheFavoriteDrugs(drugs: DrugOption[]) {
  try {
    await AsyncStorage.setItem(CACHE_FAVORITE_DRUGS, JSON.stringify(drugs));
  } catch {}
}

export async function getCachedFavoriteDrugs(): Promise<DrugOption[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_FAVORITE_DRUGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function cacheFavoriteTests(tests: TestOption[]) {
  try {
    await AsyncStorage.setItem(CACHE_FAVORITE_TESTS, JSON.stringify(tests));
  } catch {}
}

export async function getCachedFavoriteTests(): Promise<TestOption[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_FAVORITE_TESTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Phase 5 Additions (AI Suggest, Style)
// ---------------------------------------------------------------------------

export const getAISuggestions = async (data: any) => {
  const res = await apiClient.post('/api/ai/suggest-prescription', data);
  return res;
};

export const getPrescriptionStyle = async () => {
  const res = await apiClient.get('/api/doctors/me/prescription-style');
  return res;
};
