import apiClient from '../lib/apiClient';

// Replicates searchPublicDirectory from the web app
export const searchPublicDirectory = async (filters: Record<string, string> = {}) => {
  const params = new URLSearchParams(filters);
  return apiClient.get(`/api/public/directory/search?${params.toString()}`);
};

export const getSpecialties = async () => {
  return apiClient.get('/api/utils/specialties');
};

export const getTrendingSpecialties = async () => {
  return apiClient.get('/api/public/specialties/trending');
};

export const getDoctorPublicProfile = async (doctorId: string) => {
  return apiClient.get(`/api/public/doctors/${doctorId}/profile`);
};

export const getDoctorAvailability = async (doctorId: string) => {
  return apiClient.get(`/api/public/doctors/${doctorId}/schedules`);
};

export const getDoctorBookingMetadata = async (doctorId: string, date: Date) => {
  // Correctly adjust for local timezone offset before converting to ISO string to avoid date drift
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  const dateStr = localDate.toISOString().split('T')[0];
  return apiClient.get(`/api/public/doctors/${doctorId}/booking-metadata?date=${dateStr}`);
};

export const createPaymentOrder = async (orderData: any) => {
  return apiClient.post('/api/payments/orders', orderData);
};

export const verifyPaymentAndBook = async (verificationData: any) => {
  return apiClient.post('/api/payments/verify', verificationData);
};

export const getDailyVideoToken = async (appointmentId: string) => {
  return apiClient.post('/api/video/provision-room', { appointmentId });
};

// --- Phase 3 Extended Parity ---

export const getPrescriptionsForPatient = async (patientId: string, page: number = 0) => {
  return apiClient.get(`/api/prescriptions/patient/${patientId}?page=${page}`);
};

export const getHealthRecords = async () => {
  return apiClient.get('/api/patient-data/records');
};

export const getRecordUploadUrl = async (fileDetails: any) => {
  return apiClient.post('/api/patient-data/records/upload-url', fileDetails);
};

export const createRecordMetadata = async (metadata: any) => {
  return apiClient.post('/api/patient-data/records', metadata);
};

export const deleteHealthRecord = async (recordId: string) => {
  return apiClient.delete(`/api/patient-data/records/${recordId}`);
};

export const updateHealthRecord = async (recordId: string, data: any) => {
  return apiClient.patch(`/api/patient-data/records/${recordId}`, data);
};


export const getRecordDownloadUrl = async (recordId: string) => {
  return apiClient.get(`/api/patient-data/records/${recordId}/download-url`);
};

export const updateProfile = async (data: any) => {
  return apiClient.patch('/api/patient-data/profile', data);
};

export const registerDeviceToken = async (device_token: string, device_type: string = 'android') => {
  return apiClient.post('/api/notifications/register-device', { device_token, device_type });
};

export const analyzeLabReport = async (imageBase64: string) => {
  return apiClient.post('/api/analysis/lab-report', { imageBase64 });
};

export const getPublicClinicProfile = async (shortId: string) => {
  return apiClient.get(`/api/public/clinics/${shortId}/profile`);
};

// ---------------------------------------------------------------------------
// Profile Management (mirrors web's patientService.js)
// ---------------------------------------------------------------------------

export const claimPatientProfile = async (data: {
  userId: string;
  fullName: string;
  phone: string;
}) => {
  return apiClient.post('/api/patient-data/profile/claim', data);
};

export const getPatientProfile = async () => {
  return apiClient.get('/api/patient-data/profile');
};

export const updatePatientProfile = async (data: Record<string, any>) => {
  return apiClient.patch('/api/patient-data/profile', data);
};

export const getAvatarUploadUrl = async (fileDetails: {
  fileName: string;
  fileType: string;
}) => {
  return apiClient.post('/api/patient-data/profile/avatar-upload-url', fileDetails);
};

export const getMyTreatmentPlans = async () => {
  return apiClient.get('/api/patient-data/treatment-plans');
};

// ---------------------------------------------------------------------------
// Phase 1: Booking Flow — Missing Endpoints (mirrors web's patientService.js)
// ---------------------------------------------------------------------------

export const getCalendarEvents = async (params: {
  doctorId: string;
  startStr: string;
  endStr: string;
}) => {
  const qs = new URLSearchParams({
    startDate: params.startStr,
    endDate: params.endStr,
  });
  return apiClient.get(
    `/api/public/doctors/${params.doctorId}/calendar-events?${qs.toString()}`
  );
};

export const reserveVideoSlot = async (data: {
  doctorId: string;
  slotTime: string;
  sessionUuid: string;
}) => {
  return apiClient.post('/api/public/slots/reserve', data);
};

export const getMyProfile = async () => {
  return apiClient.get('/api/patients/me');
};

// ---------------------------------------------------------------------------
// Phase 2: Connect Hub, AI Analyzer, Translations
// ---------------------------------------------------------------------------
import { supabase } from '../lib/supabase';

// Helper to format appointment data similar to web
const transformAppointmentData = (appointment: any) => {
  return {
    ...appointment,
    doctor: appointment.doctors,
    patient: appointment.patients,
    clinic: appointment.clinics,
    organization: appointment.clinics
  };
};

export const getUpcomingAppointments = async (userId: string) => {
  if (!userId) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctors:doctor_id (
        id, full_name, prefix, profile_photo_url, city,
        doctor_specialties (
           specialties ( name, id )
        )
      ),
      clinics:organization_id (id, name, latitude, longitude),
      patients:patient_id (full_name, email, phone_no),
      payments (*)
    `)
    .eq('patient_id', userId)
    .gte('start_time', startOfToday)
    .neq('status', 'cancelled')
    .neq('status', 'completed')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data.map(transformAppointmentData);
};

export const getPastAppointments = async ({ pageParam = 0, userId }: { pageParam: number, userId: string }) => {
  if (!userId) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.toISOString();

  const PAGE_SIZE = 10;
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      doctors:doctor_id (
        id, full_name, prefix, profile_photo_url, city,
        doctor_specialties (
           specialties ( name, id )
        )
      ),
      clinics:organization_id (id, name, latitude, longitude),
      patients:patient_id (full_name, email, phone_no),
      payments (*)
    `)
    .eq('patient_id', userId)
    .or(`start_time.lt.${startOfToday},status.eq.completed,status.eq.cancelled`)
    .order('start_time', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data.map(transformAppointmentData);
};

export const getActiveChatSessions = async () => {
  return apiClient.get('/api/chats/sessions');
};

export const translateText = async (text: string, targetLanguage: string) => {
  return apiClient.post('/api/ai/translate', { text, targetLanguage });
};

export const getAnalysisUsage = async () => {
  return apiClient.get('/api/analysis/usage');
};

export const getClinicDetails = async (clinicId: string, doctorId?: string) => {
  const queryStr = doctorId ? `?doctorId=${doctorId}` : '';
  try {
    const data = await apiClient.get(`/api/public/check-in/${clinicId}/details${queryStr}`);
    return data as any;
  } catch (error: any) {
    console.error('[API Error] getClinicDetails:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to get clinic details');
  }
};

export const selfCheckIn = async (data: any) => {
  try {
    const result = await apiClient.post(`/api/public/check-in/self`, data);
    return result as any;
  } catch (error: any) {
    console.error('[API Error] selfCheckIn:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to check in');
  }
};

// --- Health Tracker APIs ---

export const getDailyHealthMetrics = async (date: string) => {
  return apiClient.get(`/api/patient-health/daily/${date}`);
};

export const updateDailyHealthMetrics = async (date: string, data: any) => {
  return apiClient.patch(`/api/patient-health/daily/${date}`, data);
};

export const scanFoodImage = async (imageUri: string, mimeType: string = 'image/jpeg') => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: mimeType,
    name: 'food_scan.jpg',
  } as any);

  return apiClient.post('/api/patient-health/food/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const logFoodItem = async (data: any) => {
  return apiClient.post('/api/patient-health/food/log', data);
};

export const deleteFoodLog = async (logId: string) => {
  return apiClient.delete(`/api/patient-health/food/log/${logId}`);
};

export const searchFoodDatabase = async (query: string = '') => {
  return apiClient.get(`/api/patient-health/food/search?query=${encodeURIComponent(query)}`);
};

export const getCustomFoods = async () => {
  return apiClient.get('/api/patient-health/food/custom');
};

export const createCustomFood = async (foodData: any) => {
  return apiClient.post('/api/patient-health/food/custom', foodData);
};

export const getHealthProgress = async () => {
  return apiClient.get('/api/patient-health/progress');
};

// --- Tara AI Coach APIs ---

export const sendTaraMessage = async (message: string, sessionId?: string) => {
  return apiClient.post('/api/patient-tara/chat', { message, sessionId });
};

export const submitTaraFeedback = async (context: string, action: 'accepted' | 'declined' | 'modified', reason?: string) => {
  return apiClient.post('/api/patient-tara/feedback', { context, action, reason });
};

export const getTaraSessions = async () => {
  return apiClient.get('/api/patient-tara/sessions');
};

export const getTaraSessionHistory = async (sessionId: string) => {
  return apiClient.get(`/api/patient-tara/sessions/${sessionId}`);
};
