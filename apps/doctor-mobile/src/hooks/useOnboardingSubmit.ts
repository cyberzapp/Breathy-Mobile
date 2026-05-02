// src/hooks/useOnboardingSubmit.ts
// ---------------------------------------------------------------------------
import { Logger } from '../utils/logger';
// Exact port of the web's Step3_Registration.jsx `handleFinalSubmit` logic.
//
// At this point in the flow, the 'doctors' row ALREADY EXISTS because:
//   Phase 1 (WelcomeOnboardingScreen) → POST /api/doctors/me/profile
//   Which created the row with profile_status = 'in_progress'
//
// This hook handles Phase 2:
//   updateProfileStep('personal_details', personalData)     ← Step 1
//   updateProfileStep('education_specialization', eduData)  ← Step 2
//   updateProfileStep('registration_documents', regData)    ← Step 3
//   submitProfileForReview()                                ← Final
//
// All calls go through the REST API (PUT /api/doctors/me/profile { step, data })
// exactly matching the web's doctorService.js pattern.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  updateProfileStepViaApi,
  submitProfileForReview,
  STEP_PERSONAL_DETAILS,
  STEP_EDUCATION_SPECIALIZATION,
  STEP_REGISTRATION_DOCUMENTS,
} from '../services/profileService';
import { posthog } from '../config/posthog';

export function useOnboardingSubmit() {
  const fetchProfileStatus = useAuthStore((s) => s.fetchProfileStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);

  const submitProfile = async (form: any, isValid: boolean) => {
    if (!isValid) {
      setSubmitWarning('Please fill all mandatory fields.');
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitWarning(null);
    try {
      // ---------------------------------------------------------------
      // Step 1: Personal Details
      // Web: await updateProfileStep('personal_details', personalData)
      // personalData = { prefix, full_name, gender, experience_years, ... }
      // ---------------------------------------------------------------
      await updateProfileStepViaApi(STEP_PERSONAL_DETAILS, {
        full_name: form.fullName.trim(),
        gender: form.gender,
        experience_years: parseInt(form.experience, 10) || 0,
      });

      // ---------------------------------------------------------------
      // Step 2: Education & Specialization
      // Web: await updateProfileStep('education_specialization', educationData)
      // educationData = {
      //   education: [{ degree: uuid, passing_year: null }],
      //   specialties: [uuid, uuid, ...]
      // }
      // ---------------------------------------------------------------
      await updateProfileStepViaApi(STEP_EDUCATION_SPECIALIZATION, {
        education: form.degrees.map((d: any) => ({
          degree: d.id,        // UUID from the degrees table
          university: null,    // Not collected in mobile onboarding
          passing_year: null,  // Not collected in mobile onboarding
        })),
        specialties: form.specialties.map((sp: any) => sp.id), // Flat array of UUIDs
      });

      // ---------------------------------------------------------------
      // Step 3: Registration Documents
      // Web: await updateProfileStep('registration_documents', registrationData)
      // registrationData = { registration_number, council_id, ... }
      // ---------------------------------------------------------------
      await updateProfileStepViaApi(STEP_REGISTRATION_DOCUMENTS, {
        registration_number: form.registrationNumber.trim(),
        council_id: form.medicalCouncilId || null, // UUID from councils table
      });

      // ---------------------------------------------------------------
      // Final: Submit for Review
      // Web: await submitProfileForReview()
      // Server: POST /api/doctors/me/submit-review
      // ---------------------------------------------------------------
      await submitProfileForReview();

      // ---------------------------------------------------------------
      // Refresh: Pull latest profile_status into the store
      // Web: await fetchInitialStatus(true)
      // This changes profile_status to 'awaiting_review'
      // ---------------------------------------------------------------
      await fetchProfileStatus();

      posthog.capture('onboarding_profile_submitted', {
        degree_count: form.degrees.length,
        specialty_count: form.specialties.length,
        experience_years: parseInt(form.experience, 10) || 0,
      });

      return true;
    } catch (e: any) {
      Logger.error('Onboarding submission failed', e, { source: 'useOnboardingSubmit' });
      setSubmitError('Failed to save profile. Please try again later.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitProfile, isSubmitting, submitError, setSubmitError, submitWarning, setSubmitWarning };
}