# Breathy Doctor Mobile — Coding Standards

> **This document is mandatory reading for every developer working on the Breathy Doctor mobile app.**  
> Last updated: 2026-05-02

---

## Table of Contents

1. [Error Handling & Logging](#1-error-handling--logging)
2. [User Feedback (Modals vs Alerts)](#2-user-feedback-modals-vs-alerts)
3. [Data Security & PII](#3-data-security--pii)
4. [Analytics (PostHog)](#4-analytics-posthog)
5. [Pre-Release Checklist](#5-pre-release-checklist)

---

## 1. Error Handling & Logging

### ❌ NEVER use `console.error()` in production code

`console.error()` is **invisible** to our monitoring tools (PostHog, Sentry) and **leaks technical details** to anyone with a debugger attached in production.

```typescript
// ❌ BAD — Invisible in production, leaks data
try {
  await saveData();
} catch (e) {
  console.error('Save failed:', e);
}

// ❌ BAD — Fire-and-forget with no tracking
somePromise.catch(console.error);
```

### ✅ ALWAYS use `Logger.error()` from `src/utils/logger.ts`

The centralized Logger automatically:
- Reports errors to **PostHog** as `$exception` events
- **Scrubs PII** (phone numbers, emails, patient names) before sending
- Only outputs to console in **development** (`__DEV__`)
- Future-proofs for **Sentry** integration

```typescript
import { Logger } from '../utils/logger';

// ✅ GOOD — Tracked in PostHog, PII-safe, silent in production
try {
  await saveData();
} catch (e) {
  Logger.error('Data save failed', e, { source: 'MyScreen' });
}

// ✅ GOOD — Fire-and-forget with tracking
somePromise.catch((e) => Logger.error('Background task failed', e));
```

### Logger API Reference

```typescript
// For errors that should be reported to PostHog
Logger.error(message: string, error?: any, context?: Record<string, any>)

// For development-only warnings (not sent to PostHog)
Logger.warn(message: string, context?: Record<string, any>)

// For development-only info logs (not sent to PostHog)
Logger.info(message: string, context?: Record<string, any>)
```

### The `source` Context Property

Always include a `source` property in the context object. This helps us filter errors by screen/component in PostHog.

```typescript
Logger.error('Queue fetch failed', err, { source: 'TodaysQueueWidget' });
Logger.error('API 401', err, { source: 'apiClient' });
```

---

## 2. User Feedback (Modals vs Alerts)

### ❌ NEVER use `Alert.alert()` from React Native

Native `Alert.alert()` is browser-style, ugly, and causes **z-index/layering issues** when shown over custom modals.

```typescript
// ❌ BAD — Browser-style alert
import { Alert } from 'react-native';
Alert.alert('Error', 'Something went wrong');
```

### ✅ ALWAYS use our custom modal components

Located in `src/components/ui/`:

| Component | Use Case | Required Props |
|-----------|----------|----------------|
| `SuccessModal` | Action succeeded | `visible`, `message`, `onClose` |
| `ErrorModal` | Action failed | `visible`, `message`, `onClose`, optional: `title`, `closeText` |
| `WarningModal` | Warning / validation | `visible`, `message`, `onClose` |
| `ConfirmationModal` | Destructive action confirmation | `visible`, `title`, `message`, `confirmText`, `onCancel`, `onConfirm` |
| `ActionSheetModal` | Multi-option picker | `visible`, `title`, `options`, `onCancel` |

### Standard Pattern

```tsx
// 1. Declare state
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [successMessage, setSuccessMessage] = useState<string | null>(null);

// 2. Set state in logic
try {
  await doSomething();
  setSuccessMessage('Action completed!');
} catch (err) {
  Logger.error('Action failed', err, { source: 'MyScreen' });
  setErrorMessage('Something went wrong. Please try again.');
}

// 3. Render modals at the BOTTOM of your JSX
return (
  <View>
    {/* ... your screen content ... */}

    <SuccessModal
      visible={!!successMessage}
      message={successMessage || ''}
      onClose={() => setSuccessMessage(null)}
    />
    <ErrorModal
      visible={!!errorMessage}
      message={errorMessage || ''}
      onClose={() => setErrorMessage(null)}
    />
  </View>
);
```

### User-Friendly Error Messages

**NEVER show raw backend errors to the user.** Always provide a human-readable message.

```typescript
// ❌ BAD — Exposing technical details
setErrorMessage(error.response?.data?.message);
// Shows: "relation \"doctors\" violates row-level security policy"

// ✅ GOOD — User-friendly message
Logger.error('Save failed', error, { source: 'SettingsScreen' });
setErrorMessage('Could not save your changes. Please try again.');
```

---

## 3. Data Security & PII

### Storage Rules

| Data Type | Storage | Library |
|-----------|---------|---------|
| Auth tokens, session data | **Encrypted** | `expo-secure-store` |
| Patient data (name, phone, ID) | **Encrypted** | `expo-secure-store` |
| App preferences (theme, mode) | Unencrypted OK | **MMKV** |
| Feature flags, cache | Unencrypted OK | **MMKV** |

```typescript
// ❌ BAD — Patient data in plain storage
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.setItem('patient', JSON.stringify(patientData));

// ✅ GOOD — Patient data in encrypted storage
import * as SecureStore from 'expo-secure-store';
SecureStore.setItemAsync('patient', JSON.stringify(patientData));

// ✅ GOOD — Non-sensitive app state
import { storage } from '../lib/storage';
storage.set('theme_mode', 'dark');
```

### PostHog Event Properties

**NEVER** send patient PII in PostHog event properties:

```typescript
// ❌ BAD — Sends patient name to analytics
posthog.capture('prescription_created', {
  patient_name: 'Rajesh Kumar',
  patient_phone: '9876543210',
});

// ✅ GOOD — Use anonymized IDs only
posthog.capture('prescription_created', {
  has_linked_patient: !!linkedPatientId,
  medication_count: 3,
});
```

### Environment Variables

- **Public keys** (Supabase anon key, PostHog project token): Use `EXPO_PUBLIC_` prefix
- **Secret keys** (service role keys, API secrets): **NEVER** use `EXPO_PUBLIC_` prefix — these must stay server-side only

---

## 4. Analytics (PostHog)

### Event Naming Convention

Use `snake_case` for all event names:

```typescript
// ✅ Good event names
posthog.capture('prescription_created', { ... });
posthog.capture('video_call_started', { ... });
posthog.capture('appointment_status_changed', { ... });

// ❌ Bad event names
posthog.capture('PrescriptionCreated', { ... });
posthog.capture('Prescription Created', { ... });
```

### When to Track Events

Track events for **business-critical actions** only:

| Track ✅ | Don't Track ❌ |
|----------|---------------|
| Prescription created | Button hover |
| Video call started/ended | Screen scroll position |
| Appointment status changed | UI animation complete |
| Template saved/loaded | Keyboard opened |
| Payment upgraded | Modal opened (use autocapture) |

### User Identification

User identification is handled automatically in `authStore.ts`. **Do not** call `posthog.identify()` anywhere else.

---

## 5. Pre-Release Checklist

Run these checks before every production release:

### 🔍 Automated Checks

```bash
# 1. Zero Alert.alert calls (except test files)
grep -rn "Alert\.alert" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "__tests__"
# Expected: 0 results

# 2. Zero console.error calls (except logger.ts)
grep -rn "console\.error" src/ --include="*.tsx" --include="*.ts" | grep -v "logger.ts" | grep -v "node_modules"
# Expected: 0 results

# 3. Zero console.log calls (except logger.ts)
grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" | grep -v "logger.ts" | grep -v "node_modules"
# Expected: 0 results (or only intentional __DEV__ guards)

# 4. No hardcoded secrets
grep -rn "phc_" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".env"
grep -rn "eyJ" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".env"
# Expected: 0 results

# 5. No patient PII in PostHog events
grep -rn "posthog.capture" src/ --include="*.tsx" --include="*.ts" -A 5 | grep -E "patient_name|phone_no|full_name|email"
# Expected: 0 results

# 6. No AsyncStorage for sensitive data
grep -rn "AsyncStorage" src/ --include="*.tsx" --include="*.ts" | grep -iE "patient|token|session|auth"
# Expected: 0 results
```

### ✋ Manual Checks

- [ ] `EXPO_PUBLIC_API_URL` points to **production** backend
- [ ] `EXPO_PUBLIC_SUPABASE_URL` points to **production** Supabase
- [ ] `POSTHOG_PROJECT_TOKEN` is set to the **production** project token (not `phc_your_project_token_here`)
- [ ] PostHog `debug` mode is off in production (handled automatically via `__DEV__`)
- [ ] Test a login → dashboard → prescription → logout flow on both iOS and Android
- [ ] Verify PostHog dashboard receives events from the production build
- [ ] Verify no raw error messages are shown to users (trigger errors intentionally)

### 🚀 Release Sign-Off

Before submitting to App Store / Play Store:

1. All automated checks pass with 0 results
2. All manual checks verified
3. Error boundary is in place (catches render crashes)
4. PostHog events are flowing in the production PostHog project
5. This checklist is signed off by the lead developer

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│              BREATHY DOCTOR — RULES                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  console.error()  →  Logger.error()                 │
│  console.log()    →  Logger.info()                  │
│  console.warn()   →  Logger.warn()                  │
│  Alert.alert()    →  ErrorModal / SuccessModal       │
│  AsyncStorage     →  SecureStore (for PII)          │
│  raw error msg    →  User-friendly message          │
│  patient name     →  patient ID (in analytics)      │
│                                                     │
└─────────────────────────────────────────────────────┘
```
