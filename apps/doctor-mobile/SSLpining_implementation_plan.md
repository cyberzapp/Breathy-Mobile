# Phase 6: Resilience & Security Hardening

This phase focuses on making the Breathy Doctor Mobile app enterprise-ready by ensuring it can survive flaky networks, prevent Man-in-the-Middle (MITM) attacks, and gracefully recover from unexpected crashes.

## User Review Required
> [!IMPORTANT]
> **SSL Pinning configuration requires custom native builds (EAS Build).** `react-native-ssl-public-key-pinning` intercepts all native networking to prevent unauthorized certificate usage. You will need to build a custom development client (`eas build --profile development`) to test this locally. Expo Go does not support this plugin.

## Open Questions
> [!WARNING]
> 1. **SSL Pins:** What are the exact backend domains and their corresponding Base64 SHA-256 public key hashes you want to pin? (I will use placeholders in `app.json` for now, which you can replace later).
> 2. **Build System:** Can you confirm you are using EAS Build and custom dev clients for this project?

## Proposed Changes

### 1. Dependencies
#### [MODIFY] [package.json](file:///Users/suman/Documents/GitHub/Breathy-mobile/Breathy-Mobile/apps/doctor-mobile/package.json)
- Install `axios-retry` for transient network failures.
- Install `react-error-boundary` for React-level crash recovery.
- Install `react-native-ssl-public-key-pinning` for certificate pinning.

### 2. Configuration
#### [MODIFY] [app.json](file:///Users/suman/Documents/GitHub/Breathy-mobile/Breathy-Mobile/apps/doctor-mobile/app.json)
- Inject the `react-native-ssl-public-key-pinning` plugin into the Expo configuration array with placeholder domains and SHA-256 keys.

### 3. API Resilience
#### [MODIFY] [apiClient.ts](file:///Users/suman/Documents/GitHub/Breathy-mobile/Breathy-Mobile/apps/doctor-mobile/src/lib/apiClient.ts)
- Configure `axios-retry` to automatically retry requests up to 3 times on network errors (e.g., timeout, offline drops) or server 5xx errors, using exponential backoff (e.g., 1s, 2s, 4s).

### 4. Crash Prevention & Telemetry
#### [NEW] [GlobalErrorBoundary.tsx](file:///Users/suman/Documents/GitHub/Breathy-mobile/Breathy-Mobile/apps/doctor-mobile/src/components/GlobalErrorBoundary.tsx)
- Create a user-friendly fallback screen that displays when a fatal React error occurs. It will include a "Restart App" button to clear state and recover, while silently sending the crash stack trace to `Logger.error()`.

#### [MODIFY] [App.tsx](file:///Users/suman/Documents/GitHub/Breathy-mobile/Breathy-Mobile/apps/doctor-mobile/App.tsx)
- Wrap the `RootNavigator` with the new `<GlobalErrorBoundary>`.
- Hook into React Native's `ErrorUtils.setGlobalHandler` and `promise/setimmediate/rejection-tracking` to ensure that any native crash or unhandled promise rejection is caught, logged via `Logger`, and handled without silently swallowing the error.

## Verification Plan
### Automated Tests
- Introduce artificial `throw new Error()` into a component to verify the Error Boundary renders correctly.
- Test API retries by pointing to a mock endpoint that returns a 503 before a 200.

### Manual Verification
- You will need to run an EAS build (`npx expo run:android` or `eas build`) to verify that the SSL pinning plugin applies correctly at the native layer without blocking legitimate API traffic.
