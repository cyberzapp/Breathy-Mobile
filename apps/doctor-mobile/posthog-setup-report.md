<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Breathy Doctor React Native (Expo) app. Here is a summary of all changes made:

**New files created:**
- `app.config.js` — replaces `app.json` as the Expo config entry point; reads `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from `.env` and exposes them via `Constants.expoConfig.extra`
- `src/config/posthog.ts` — instantiates and exports the PostHog client using `expo-constants`
- `.env` — contains `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` (gitignored)

**Modified files:**
- `App.tsx` — wrapped the app tree with `<PostHogProvider>` (autocapture of touches enabled, screen autocapture disabled in favour of manual tracking)
- `src/screens/LoginScreen.tsx` — captures `otp_requested` and `otp_verified`; calls `posthog.identify()` on successful login
- `src/store/authStore.ts` — calls `posthog.identify()` with doctor profile data after profile load; captures `user_signed_out` and calls `posthog.reset()` on sign-out
- `src/hooks/useOnboardingSubmit.ts` — captures `onboarding_profile_submitted` after profile review submission
- `src/screens/prescription/DigitalPrescriptionForm.tsx` — captures `prescription_created`, `prescription_template_loaded`, `prescription_template_saved`, `ai_suggestions_requested`; captures `$exception` on prescription submission errors
- `src/screens/VideoModuleScreen.tsx` — captures `video_call_started`, `video_call_ended`, `video_call_upgraded_to_paid`; captures `$exception` on Daily.co call errors
- `src/screens/CalendarScreen.tsx` — captures `appointment_status_changed` and `offline_booking_created`
- `src/screens/apps/BillingScreen.tsx` — captures `consultation_fee_updated`
- `src/screens/HomeScreen.tsx` — captures `dashboard_section_tapped`

**Packages installed:**
- `posthog-react-native` ^4.44.0
- `react-native-svg` ^15.15.4 (required peer dependency)

---

| Event | Description | File |
|-------|-------------|------|
| `otp_requested` | Doctor submits phone number to receive OTP | `src/screens/LoginScreen.tsx` |
| `otp_verified` | Doctor successfully verifies OTP; user identified | `src/screens/LoginScreen.tsx` |
| `onboarding_profile_submitted` | New doctor submits medical credentials for review | `src/hooks/useOnboardingSubmit.ts` |
| `prescription_created` | Doctor signs and sends a digital prescription | `src/screens/prescription/DigitalPrescriptionForm.tsx` |
| `prescription_template_loaded` | Doctor loads a saved prescription template | `src/screens/prescription/DigitalPrescriptionForm.tsx` |
| `prescription_template_saved` | Doctor saves current form as a reusable template | `src/screens/prescription/DigitalPrescriptionForm.tsx` |
| `ai_suggestions_requested` | Doctor requests AI-generated medication suggestions | `src/screens/prescription/DigitalPrescriptionForm.tsx` |
| `video_call_started` | Doctor successfully joins a video consultation room | `src/screens/VideoModuleScreen.tsx` |
| `video_call_ended` | Doctor manually ends a video call | `src/screens/VideoModuleScreen.tsx` |
| `video_call_upgraded_to_paid` | Doctor continues video call past the free limit | `src/screens/VideoModuleScreen.tsx` |
| `appointment_status_changed` | Doctor updates an appointment status | `src/screens/CalendarScreen.tsx` |
| `offline_booking_created` | Doctor creates a walk-in / offline appointment | `src/screens/CalendarScreen.tsx` |
| `consultation_fee_updated` | Doctor saves a new video consultation fee | `src/screens/apps/BillingScreen.tsx` |
| `user_signed_out` | Doctor signs out of the app | `src/store/authStore.ts` |
| `dashboard_section_tapped` | Doctor taps a quick-action tile on the home screen | `src/screens/HomeScreen.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/357153/dashboard/1535461
- **Login Funnel: OTP Requested → Verified:** https://us.posthog.com/project/357153/insights/McIiGAUT
- **Prescriptions Created (Daily):** https://us.posthog.com/project/357153/insights/VuFkh9ot
- **Video Call Usage (Daily):** https://us.posthog.com/project/357153/insights/tPF3jMTc
- **Appointment Status Changes Breakdown:** https://us.posthog.com/project/357153/insights/h1gdexzV
- **Doctor Onboarding Completion Funnel:** https://us.posthog.com/project/357153/insights/OpPSo0Wv

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
