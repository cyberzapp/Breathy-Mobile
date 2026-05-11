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
  const dateStr = date.toISOString().split('T')[0];
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

export const getPrescriptionsForPatient = async (patientId: string) => {
  return apiClient.get(`/api/prescriptions/patient/${patientId}`);
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

export const getRecordDownloadUrl = async (recordId: string) => {
  return apiClient.get(`/api/patient-data/records/${recordId}/download-url`);
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
