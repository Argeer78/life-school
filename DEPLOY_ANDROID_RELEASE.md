# Lifeschool Android Release (TWA via Bubblewrap)

This guide prepares an Android production release from the existing Lifeschool PWA.

Scope:
- uses Trusted Web Activity (TWA) + Bubblewrap,
- reuses existing web app and PWA assets,
- produces deployment documentation and templates only.

Non-goals:
- no React Native,
- no Flutter,
- no curriculum changes,
- no learner behavior changes.

## 1. Release Architecture

Lifeschool Android release path:
1. existing web app (served from `https://lifesh.app`),
2. existing PWA (`manifest.webmanifest`, `sw.js`, icons, offline shell),
3. Bubblewrap-generated Android package (AAB/APK),
4. Play Console rollout.

## 2. Android Package Definition

Use these production identifiers (adjust only if legal/brand constraints require it):

| Field | Value |
| --- | --- |
| Package ID | `org.lifeschool.app` |
| App name | `Lifeschool` |
| Launcher name | `Lifeschool` |
| Start URL | `https://lifesh.app/` |
| Host | `lifesh.app` |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 35 (Android 15) |
| Compile SDK | 35 |

Before release submission, confirm Play policy has not advanced the required target SDK beyond 35.

## 3. Bubblewrap Configuration

Template file:
- [docs/developer/android/bubblewrap.config.template.json](docs/developer/android/bubblewrap.config.template.json)

Recommended flow:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://lifesh.app/manifest.webmanifest
```

Then merge values from the template into the generated Bubblewrap config.

Build commands:

```bash
bubblewrap build
bubblewrap doctor
```

Release artifacts are generated as Android app bundle (`.aab`) and/or apk depending on build targets.

## 4. Digital Asset Links

Template file:
- [docs/developer/android/assetlinks.template.json](docs/developer/android/assetlinks.template.json)

Production steps:
1. get release keystore SHA-256 certificate fingerprint,
2. replace fingerprint and package name in template,
3. publish as:
   - `https://lifesh.app/.well-known/assetlinks.json`
4. verify reachable over HTTPS with no redirect rewrite issues.

Validation command:

```bash
curl -i https://lifesh.app/.well-known/assetlinks.json
```

## 5. Deep Links

Required deep-link coverage for Android App Links:
- `/`
- `/courses`
- `/learn`
- `/about`
- `/privacy`
- `/terms`
- `/contact`
- `/courses/*`

All must open inside TWA when verified; if verification fails, links may open in browser.

## 6. Launcher Icons and Adaptive Icons

Use existing PWA icon sources and ensure Android-specific outputs are present in the generated app:

- Launcher icon source: `/pwa/icon-512.png`
- Adaptive/maskable icon source: `/pwa/icon-maskable-512.png`

Checklist:
- foreground icon remains legible in circular/squircle masks,
- no clipped edges in adaptive icon safe zone,
- icon readable on light and dark launchers,
- monochrome compatibility acceptable for themed icons.

## 7. Splash Screen

Use existing asset:
- `/pwa/apple-splash-2048x2732.png` as design reference.

Android splash readiness checklist:
- brand mark centered and balanced,
- background color aligned with manifest/theme (`#1e3a8a` and dark mode path),
- no text critical to understanding on splash,
- startup transition under expected device cold-start conditions.

## 8. Play Integrity Compatibility

TWA/Play readiness checks:
- package signed with release keystore,
- Play App Signing enabled in Play Console,
- app bundle uploaded with consistent package ID,
- Digital Asset Links deployed and verified,
- Play Integrity API enabled for the project,
- integrity verdict handling documented for backend enforcement if later required.

## 9. Notification Readiness

Current status recommendation:
- release with `enableNotifications: false` unless push backend and user-consent path are production-ready.

If enabling notifications later, require:
- explicit user permission UX,
- lawful basis and clear purpose text,
- token lifecycle management,
- unsubscribe/disable control in app settings,
- privacy-policy updates.

## 10. Play Store Assets Checklist

Store listing assets:
- app name,
- short description,
- full description,
- privacy policy URL,
- support contact email,
- app icon 512x512,
- feature graphic 1024x500,
- phone screenshots (min 2, max 8),
- 7-inch and 10-inch tablet screenshots (recommended),
- category and tags,
- content rating questionnaire,
- data safety form,
- target audience declaration.

Release media quality checks:
- screenshots from real app flows (`/`, `/courses`, `/learn`),
- no placeholder text,
- no debug overlays,
- localization consistency for EN/EL as published.

## 11. Privacy Checklist (Android Release)

- privacy policy URL is public and accurate,
- data safety answers match actual collection/processing,
- no analytics/advertising cookies claim remains consistent with web behavior,
- consent surfaces (cookie/storage choice) remain functional in TWA,
- contact-processing disclosures remain present,
- OpenAI processing disclosure remains present,
- no hidden tracking SDKs added in Android wrapper.

## 12. Release Checklist

Pre-build:
- PWA production host is healthy (`/health`, `/manifest.webmanifest`, `/sw.js`),
- `/.well-known/assetlinks.json` deployed with release fingerprint,
- Bubblewrap config reviewed and secrets removed from source control.

Build/sign:
- build passes with current Java/Android toolchain,
- target/compile SDK are current (35 baseline),
- release keystore and alias verified,
- generated `.aab` signed successfully.

Validation:
- clean install on Android physical device,
- deep links open inside app,
- offline behavior works for homepage and previously visited curriculum pages,
- offline Steward request fails gracefully (no crash, user-safe error behavior),
- install prompt and app launch work as expected.

Play Console:
- internal test track upload,
- pre-launch report reviewed,
- policy warnings resolved,
- staged rollout configured,
- rollback version strategy prepared.

Post-release:
- monitor crashes/ANRs,
- monitor web uptime and TLS validity,
- confirm Digital Asset Links remain valid after certificate rotations.

## 13. Deployment Notes for This Repository

- Keep Android wrappers and release metadata under docs/release tooling, not curriculum sources.
- Do not modify lesson/module definitions for mobile packaging work.
- Keep package/deeplink/privacy changes traceable in release PR notes.
