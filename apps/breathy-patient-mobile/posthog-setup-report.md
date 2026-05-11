<wizard-report>
# PostHog post-wizard report

The wizard has completed a foundational PostHog integration for the **Breathy Patient Mobile** Expo app. Since the app is in its early stages (boilerplate), the integration establishes the full analytics infrastructure so events are ready to fire as screens and features are built.

## What was changed

| File | Change |
|------|--------|
| `app.config.js` | Created — migrates config from `app.json` and adds PostHog `extra` fields reading `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from `.env` via `process.env` |
| `src/config/posthog.ts` | Created — PostHog client instance using `expo-constants`, disabled in `__DEV__`, with batching and retry settings |
| `App.tsx` | Updated — wrapped root view with `PostHogProvider` for autocapture (touches) |
| `.env` | Updated — added `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` |

## Events tracked

| Event | Description | File |
|-------|-------------|------|
| `Application Installed` | Auto-captured on first install (lifecycle) | `src/config/posthog.ts` |
| `Application Opened` | Auto-captured each time the app opens (lifecycle) | `src/config/posthog.ts` |
| `Application Became Active` | Auto-captured when app returns from background | `src/config/posthog.ts` |
| `Application Backgrounded` | Auto-captured when app goes to background | `src/config/posthog.ts` |
| `user_signed_in` | Patient successfully signs in — add `posthog.capture('user_signed_in', {...})` to your auth flow | Future auth screen |
| `user_signed_up` | New patient completes registration — add `posthog.capture('user_signed_up', {...})` to your sign-up flow | Future auth screen |
| `user_signed_out` | Patient signs out — add `posthog.capture('user_signed_out')` + `posthog.reset()` to your logout handler | Future auth screen |

## How to identify users

When your auth screens are ready, call this after a successful sign-in or sign-up:

```ts
import { posthog } from '../src/config/posthog';

// On sign-in / sign-up
posthog.identify(userId, {
  $set_once: { first_login_date: new Date().toISOString() },
});

// On sign-out
posthog.reset();
```

## Next steps

We've built a dashboard and insights in PostHog to monitor user behaviour from day one:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/407432/dashboard/1537993
- **Daily Active Users:** https://us.posthog.com/project/407432/insights/Zk622VfP
- **New User Installs:** https://us.posthog.com/project/407432/insights/M8sHaiHZ
- **Sign-in Funnel:** https://us.posthog.com/project/407432/insights/hEUQYZSv
- **User Retention (Week over Week):** https://us.posthog.com/project/407432/insights/VM0B3N9N
- **Sign-up vs Sign-in Trends:** https://us.posthog.com/project/407432/insights/gfiRVmYF

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
