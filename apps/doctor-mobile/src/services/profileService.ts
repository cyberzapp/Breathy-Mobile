import apiClient from '../lib/apiClient';

// ---------------------------------------------------------------------------
// Profile Service — API layer for Profile Screen (Phase 4)
// ---------------------------------------------------------------------------

/** Update doctor profile fields (about, education, awards, etc.) */
export const updatePersonalDetails = (data: Record<string, any>) => {
  return apiClient.patch('/api/doctors/me/profile/personal-details', data);
};

/** Update education and specialties */
export const updateEducationAndSpecialties = (data: Record<string, any>) => {
  return apiClient.patch('/api/doctors/me/profile/education-specialties', data);
};

/** Update the full doctor profile (generic patch) */
export const updateDoctorProfile = (profileData: Record<string, any>) => {
  return apiClient.patch('/api/doctors/me/profile', profileData);
};

/** Get profile view count */
export const getProfileViewCount = () => {
  return apiClient.get('/api/doctors/me/profile/view-count');
};

/** Remove profile photo */
export const removeProfilePhoto = () => {
  return apiClient.delete('/api/doctors/me/profile/photo');
};

/** Get reference data for autocomplete */
export const getDegrees = () => apiClient.get('/api/utils/degrees');
export const getUniversities = () => apiClient.get('/api/utils/universities');

export const searchDegrees = (q: string) => apiClient.get('/api/utils/search/degrees', { params: { q } });
export const searchSpecialties = (q: string) => apiClient.get('/api/utils/search/specialties', { params: { q } });
export const searchMedicalCouncils = (q: string) => apiClient.get('/api/utils/search/councils', { params: { q } });
