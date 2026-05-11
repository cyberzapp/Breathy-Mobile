import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// PostHog Configuration
// ---------------------------------------------------------------------------
// PostHog is DISABLED in development (__DEV__) to keep analytics clean.
// Only production builds will send events.
// ---------------------------------------------------------------------------

const apiKey = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;
const isPostHogConfigured = !!apiKey && apiKey !== 'phc_your_project_token_here';

// PostHog is active ONLY when: (1) not in dev mode, AND (2) token is configured
const isEnabled = !__DEV__ && isPostHogConfigured;

if (__DEV__) {
  console.log('[PostHog] Disabled in development mode. Events will not be sent.');
} else if (!isPostHogConfigured) {
  console.warn(
    '[PostHog] Project token not configured. Analytics will be disabled. ' +
      'Set POSTHOG_PROJECT_TOKEN in your .env file to enable analytics.'
  );
}

export const posthog = new PostHog(apiKey || 'placeholder_key', {
  host,
  disabled: !isEnabled,
  captureAppLifecycleEvents: isEnabled,
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: isEnabled,
  sendFeatureFlagEvent: isEnabled,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});
