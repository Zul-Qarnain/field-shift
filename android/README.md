# Field Shift — Android Farmer Mobile Application

Field Shift provides two complementary mobile distribution paths designed specifically for farmers and agricultural extension officers across rural Bangladesh:

## Option 1: Instant Android Install (PWA — Recommended for Farmers)
No Google Play Store account or high-speed connection required:
1. Open **Field Shift** in Chrome or any browser on an Android device: `https://field-shift-tan.vercel.app`
2. Tap the browser menu (`⋮`) or the **"Install App" (অ্যাপ ইনস্টল)** button.
3. Tap **"Add to Home Screen"** or **"Install"**.
4. The Field Shift icon will appear on the Android home screen like any native app.
5. **Features:**
   - Fullscreen standalone mode without a browser address bar.
   - Built-in offline service worker (`sw.js`) that caches crop rotations and recommendations.
   - Works in 2G/3G rural networks with offline SMS advisory text generation.

## Option 2: Native Android Wrapper (APK)
This directory contains the production-ready Android Studio native wrapper project.

### Architecture:
- **Language:** Kotlin 1.9 / Java 8
- **Target SDK:** Android 14 (API 34)
- **Minimum SDK:** Android 7.0 Nougat (API 24) — covering 98.6% of active Android devices in Bangladesh.
- **Engine:** Android `WebView` with hardware acceleration, DOM storage, and offline caching.
- **Offline Resilience:** Auto-recovers from network disconnections with an interactive Bangla retry screen.

### Building the APK:
```bash
cd android
./gradlew assembleDebug
# The debug APK will be generated at:
# android/app/build/outputs/apk/debug/app-debug.apk
```
