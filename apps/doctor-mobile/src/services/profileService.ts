import apiClient from '../lib/apiClient';
import { isFuzzyMatch } from '../utils/stringDiff';
import { Logger } from '../utils/logger';

export const createDoctorProfile = (profileData: { prefix: string; fullName: string }) => {
  return apiClient.post('/api/doctors/me/profile', profileData);
};
/** Update doctor profile fields (about, education, awards, etc.) */
export const updatePersonalDetails = (data: Record<string, any>) => {
  return apiClient.patch('/api/doctors/me/profile/personal-details', data);
};

export const updateAdditionalDetails = (data: Record<string, any>) => {
  return apiClient.patch('/api/doctors/me/profile', data);
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

// --- In-Memory Cache for Reference Data ---
let cachedDegrees: any[] | null = null;
let cachedSpecialties: any[] | null = null;
let cachedCouncils: any[] | null = null;

// ===========================================================================
// UTILITY: Safely Extract String (Prevents crashes if API shape changes)
// ===========================================================================
const getVal = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.name || item.title || item.label || item.value || '';
};

// ===========================================================================
// UTILITY: Clean Acronyms (Converts "M.B.B.S." to "mbbs")
// ===========================================================================
const cleanForSearch = (str: string) => {
  return getVal(str).replace(/[\.\-]/g, '').toLowerCase().trim();
};

// ===========================================================================
// UTILITY: Normalize Data (Ensures AsyncAutocomplete always gets objects)
// ===========================================================================
const normalizeData = (data: any[]) => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((item) => {
    // 1. If it's a flat string array: ['MBBS'] -> { name: 'MBBS' }
    if (typeof item === 'string') {
      return { name: item };
    }

    // 2. If it's an object, force a 'name' property using your safe extractor
    return {
      ...item,
      name: getVal(item) // This safely pulls from name || title || label || value
    };
  });
};

// ===========================================================================
// UTILITY: Smart Sort (Prioritizes words that strictly start with the query)
// ===========================================================================
const sortPrioritizingPrefix = (results: any[], searchTerm: string) => {
  const term = cleanForSearch(searchTerm);

  return results.sort((a, b) => {
    const nameA = cleanForSearch(getVal(a));
    const nameB = cleanForSearch(getVal(b));

    const aStarts = nameA.startsWith(term);
    const bStarts = nameB.startsWith(term);

    // If A starts with the term but B doesn't, push A to the top
    if (aStarts && !bStarts) return -1;

    // If B starts with the term but A doesn't, push B to the top
    if (!aStarts && bStarts) return 1;

    // If both start with it (or neither do), fallback to alphabetical sorting
    return nameA.localeCompare(nameB);
  });
};

// ---------------------------------------------------------------------------
// 1. Degrees Search
// ---------------------------------------------------------------------------
export const searchDegrees = async (searchTerm: string = '') => {
  // Wait for at least 2 characters to prevent massive DB queries
  if (!searchTerm || searchTerm.length < 2) return [];

  try {
    // 1. Hit the EXACT same server-side search endpoint as the Web App
    const res: any = await apiClient.get('/api/utils/search/degrees', {
      params: { q: searchTerm }
    });

    const rawData = Array.isArray(res) ? res : res.data || [];

    // 2. Map the data so AsyncAutocomplete's dataKey="name" can read it
    return rawData.map((item: any) => {
      if (typeof item === 'string') return { name: item };

      return {
        ...item,
        // The backend uses 'degrees', so we map it to 'name' here
        name: item.degrees || getVal(item)
      };
    });

  } catch (error) {
    Logger.error('Degree search failed', error, { source: 'profileService' });
    return [];
  }
};

// ---------------------------------------------------------------------------
// 1.5. Universities Search
// ---------------------------------------------------------------------------
export const searchUniversities = async (searchTerm: string) => {
  if (!searchTerm || searchTerm.length < 2) return [];

  try {
    const res: any = await apiClient.get('/api/utils/search/universities', {
      params: { q: searchTerm }
    });

    const rawData = Array.isArray(res) ? res : res.data || [];

    return rawData.map((item: any) => {
      if (typeof item === 'string') return { name: item };
      return {
        ...item,
        name: item.name || getVal(item)
      };
    });
  } catch (error) {
    Logger.error('University search failed', error, { source: 'profileService' });
    return [];
  }
};

// ---------------------------------------------------------------------------
// 2. Specialties Search
// ---------------------------------------------------------------------------
export const searchSpecialties = async (searchTerm: string = '') => {
  if (!cachedSpecialties) {
    const res: any = await apiClient.get('/api/utils/specialties');
    const rawData = Array.isArray(res) ? res : res.data || [];
    cachedSpecialties = normalizeData(rawData);
  }

  const specialties = cachedSpecialties || [];
  if (!searchTerm || searchTerm.trim() === '') return specialties.slice(0, 10);

  const cleanTerm = cleanForSearch(searchTerm);
  const filtered = specialties.filter((specialty) => {
    const cleanSpecialty = cleanForSearch(getVal(specialty));
    return isFuzzyMatch(cleanSpecialty, cleanTerm, 2);
  });

  return sortPrioritizingPrefix(filtered, searchTerm).slice(0, 10);
};

// ---------------------------------------------------------------------------
// 3. Medical Councils Search
// ---------------------------------------------------------------------------
export const searchMedicalCouncils = async (searchTerm: string = '') => {
  if (!cachedCouncils) {
    const res: any = await apiClient.get('/api/utils/councils');
    const rawData = Array.isArray(res) ? res : res.data || [];
    cachedCouncils = normalizeData(rawData);
  }

  const councils = cachedCouncils || [];
  if (!searchTerm || searchTerm.trim() === '') return councils.slice(0, 10);

  const cleanTerm = cleanForSearch(searchTerm);
  const filtered = councils.filter((council) => {
    const cleanCouncil = cleanForSearch(getVal(council));
    return isFuzzyMatch(cleanCouncil, cleanTerm, 2);
  });

  return sortPrioritizingPrefix(filtered, searchTerm).slice(0, 10);
};

// ---------------------------------------------------------------------------
// Onboarding Step Constants
// ---------------------------------------------------------------------------
export const STEP_PERSONAL_DETAILS = 'personal_details';
export const STEP_EDUCATION_SPECIALIZATION = 'education_specialization';
export const STEP_REGISTRATION_DOCUMENTS = 'registration_documents';

// ---------------------------------------------------------------------------
// REST API — Profile Step Update
// ---------------------------------------------------------------------------
// Exact match of web's doctorService.js:
//   export const updateProfileStep = ({ step, data }) =>
//     apiClient.put('/api/doctors/me/profile', { step, data });
//
// Server: doctorProfileController.js updateDoctorProfile() routes to
//         supabase.rpc('update_doctor_profile_step', { p_doctor_id, p_step_name, p_step_data })
// ---------------------------------------------------------------------------
export const updateProfileStepViaApi = (step: string, data: any) => {
  return apiClient.put('/api/doctors/me/profile', { step, data });
};

// ---------------------------------------------------------------------------
// REST API — Submit Profile for Review
// ---------------------------------------------------------------------------
// Exact match of web's doctorService.js:
//   export const submitProfileForReview = () =>
//     apiClient.post('/api/doctors/me/submit-review');
// ---------------------------------------------------------------------------
export const submitProfileForReview = () => {
  return apiClient.post('/api/doctors/me/submit-review');
};
