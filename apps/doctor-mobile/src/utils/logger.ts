/**
 * Centralized Logger utility for Breathy Doctor
 * 
 * This ensures that even when we show user-friendly messages in the UI,
 * we still capture the full technical error details for debugging.
 * 
 * In the future, this is where Sentry.captureException() will be called.
 */
import { posthog } from '../config/posthog';

/**
 * Simple utility to redact PII (phone numbers, emails) from strings and objects
 */
const scrub = (data: any): any => {
  if (typeof data === 'string') {
    // Redact 10-digit phone numbers (simple regex)
    let scrubbed = data.replace(/\b\d{10}\b/g, '[REDACTED_PHONE]');
    // Redact emails
    scrubbed = scrubbed.replace(/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/g, '[REDACTED_EMAIL]');
    return scrubbed;
  }

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      return data.map(scrub);
    }
    const newObj: any = {};
    for (const key in data) {
      // Keys that likely contain PII
      if (['phone', 'phone_no', 'email', 'full_name', 'patient_name', 'name'].includes(key.toLowerCase())) {
        newObj[key] = '[REDACTED]';
      } else {
        newObj[key] = scrub(data[key]);
      }
    }
    return newObj;
  }
  return data;
};

export const Logger = {
  error: (message: string, error?: any, context?: Record<string, any>) => {
    const scrubbedMsg = scrub(message);
    const scrubbedCtx = scrub(context);

    // 1. Always log to console in development
    if (__DEV__) {
      console.error(`[ERROR] ${scrubbedMsg}`, error, scrubbedCtx);
    }

    // 2. Report to PostHog (production only)
    if (!__DEV__) {
      posthog.capture('$exception', {
        $exception_list: [{
          type: error?.name || 'Error',
          value: scrub(error?.message) || scrubbedMsg,
          stacktrace: error?.stack || '',
        }],
        $exception_source: scrubbedCtx?.source || 'Logger',
        message: scrubbedMsg,
        ...scrubbedCtx,
      });
    }

    // 3. Placeholder for Sentry / Crashlytics
    // if (Sentry.isInitialized()) {
    //   Sentry.captureException(error || new Error(message), {
    //     extra: { message, ...context },
    //   });
    // }
  },

  warn: (message: string, context?: Record<string, any>) => {
    if (__DEV__) {
      console.warn(`[WARN] ${scrub(message)}`, scrub(context));
    }
  },

  info: (message: string, context?: Record<string, any>) => {
    if (__DEV__) {
      console.log(`[INFO] ${scrub(message)}`, scrub(context));
    }
  }
};
