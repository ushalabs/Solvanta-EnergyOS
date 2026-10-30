# Firebase Authentication integration

Solvanta uses the Firebase Web SDK for Email/Password, verification/reset email and Firebase credential exchange. Native Google Sign-In remains provided by the existing Expo plugin and native SDK. This correction does not start the offline migration, GUI overhaul or AR work.

## Initialization and persistence

`src/auth/firebase.ts` exports lazy `getFirebaseAuth()` / `requireFirebaseAuth()` functions. Importing modules creates no Firebase app or Auth instance. Server-side web rendering returns no Auth instance even when configuration exists. Missing configuration leaves client startup and the existing local guest path usable; cloud actions report a configuration error instead of crashing the application.

The AuthProvider restores guest state before considering Firebase. On configured clients it subscribes to Auth state in an effect and cleans up the observer on unmount. Native first initialization calls `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` before any `getAuth(app)` call. Only `auth/already-initialized` permits reuse during fast refresh. Other errors propagate rather than silently creating a memory-only session. Browsers use the SDK's platform-default Auth initialization after hydration.

This ordering follows the [Firebase Auth API](https://firebase.google.com/docs/reference/js/auth#initializeauth): `getAuth` creates an instance when none exists, while `initializeAuth` accepts explicit persistence. The installed AsyncStorage v2 uses its default storage adapter.

## Web SDK build configuration

Use the real Web app configuration from Firebase Console → Project settings → Your apps. These values are supplied through environment variables, with no invented API key or project fallback:

| Variable | Purpose |
|---|---|
| EXPO_PUBLIC_FIREBASE_API_KEY | Firebase Web API key |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | Authorized Firebase Auth domain |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | Project identifier |
| EXPO_PUBLIC_FIREBASE_APP_ID | Registered Web app identifier |
| EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET | Storage configuration, when used |
| EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Sender configuration, when used |
| EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID | Analytics configuration, when used |
| EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID | Google OAuth Web client ID used by native sign-in |

The first four fields are required to enable cloud Auth. Local development uses ignored `mobile/.env`. The existing real local values were preserved. The generic `.env.example` lists empty fields, not placeholder keys. Firebase/Google JSON example files are removed and ignored.

GitHub Actions repository variables with these exact names are configured from the existing local Web SDK settings. The workflow injects them only for the configured export. A separate export strips Firebase/Google variables entirely. Both use `EXPO_NO_DOTENV=1` and the same `mobile/scripts/export-web.cjs` entry point. The configured mode fails clearly when required build values are absent; the unconfigured mode proves static rendering remains safe.

`EXPO_PUBLIC_*` values are embedded in client bundles; they are not suitable for private credentials. Firebase documents [Web SDK API keys as public project identifiers](https://firebase.google.com/docs/projects/api-keys), with authorization enforced separately. No OAuth client secret, service-account key or Admin SDK credential belongs in the app or Actions public variables.

## Native Google Sign-In

The Android package `com.solvanta.energyos`, native Google Sign-In Expo plugin and `googleServicesFile` reference remain unchanged. `mobile/google-services.json` stays available locally and excluded from Git. It is a Firebase Android client configuration, not a service account. Native builds must receive it through local/secure build provisioning.

Use the OAuth **Web client ID**, not the Android client ID, for `GoogleSignin.configure`. The configured Web ID was checked against the local Android JSON. The existing Expo Go/web boundary remains intact. Missing Web ID now returns an explicit configuration error rather than continuing with an unconfigured native SDK. Email/Password and the local guest path remain available according to build configuration.

No physical-device Google account picker, email delivery or real-account sign-in was performed as part of this correction. Existing registration/login/reset/verification/Google exchange flows are retained and covered by unit tests; no test accounts or emails were created.

## Verification

- A fresh clone and `npm ci --legacy-peer-deps`, with no local dotenv files, reproduced the original `auth/invalid-api-key` export failure.
- The corrected source exported successfully both without configuration and with the real Web configuration injected into the clean process environment.
- TypeScript passed. All 69 Jest tests passed, including new SSR/import safety, native persistence ordering, fast-refresh reuse, failure propagation, missing configuration, guest startup and Firebase session restoration tests.
- Real Firebase project-configuration endpoint returned HTTP 200; native Web client ID matched local Android configuration. No credential values were logged.
- `scripts/check-source-security.py`, UTF-8 and whitespace checks passed. The source scan rejects private-key blocks, OAuth client secrets and service-account payloads. The local Android file is untracked and unchanged.

The dependency audit reports existing Expo/Zod and Firebase Firestore/gRPC advisories (production dependency entries: 6 low, 7 high). These are recorded rather than hidden; resolving the Firestore constraint or changing Expo/Firebase versions is separate from this initialization fix. No secret-scanning alerts are dismissed. See `docs/evidence/firebase-auth-fix/verification.json` for the redacted reproduction record and final CI run reported with the correction.
