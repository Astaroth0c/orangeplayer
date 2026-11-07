# ORANGE Player — Android (TV + Mobile) Build Guide

This folder contains the **Capacitor 6** wrapper that turns the ORANGE Player
Next.js web app into a native Android APK that runs on **phones, tablets,
and Android TV / TV boxes**.

The web app (Next.js 16 + App Router + HLS.js + Zustand + TanStack Query) is
exported as static HTML/CSS/JS into `../../out/` and loaded inside a Capacitor
WebView. Native D-pad / remote-control key events, fullscreen immersive mode,
mixed-content (cleartext) HTTP for IPTV streams, and an Orange-branded splash
screen are wired up in `MainActivity.java` and `capacitor.config.ts`.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 18 LTS or newer | `node -v` must be ≥ 18 |
| **JDK** | **17** | Android Gradle Plugin 8.x requires JDK 17. Set `JAVA_HOME` to it. |
| **Android Studio** | Hedgehog (2023.1) or newer | Recommended for SDK + emulator |
| **Android SDK Platform** | **34** (Android 14) | Install via SDK Manager |
| **Android Build-Tools** | 34.0.0 | Install via SDK Manager |
| **Gradle** | 8.2 | Bundled via the wrapper — no separate install needed |
| **Bun** (optional) | latest | Faster install alternative to npm |

Verify the toolchain:

```bash
node -v          # v18.x or newer
java -version    # 17.x
echo $JAVA_HOME  # path to JDK 17
echo $ANDROID_HOME  # path to Android SDK
```

---

## 2. Install Capacitor

The `package.json` in this folder declares the Capacitor dependencies. Install
them from here:

```bash
cd /home/z/my-project/platforms/android
bun install        # or: npm install
```

This installs:

- `@capacitor/cli` (dev dependency)
- `@capacitor/core`, `@capacitor/android`
- `@capacitor/splash-screen`, `@capacitor/http`, `@capacitor/status-bar`, `@capacitor/app`

---

## 3. Configure the Next.js app for static export

Capacitor can only bundle a **static export** of the web app. Edit the root
`/home/z/my-project/next.config.ts` so it exports the site to an `out/`
folder:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — required for Capacitor bundling
  output: "export",

  // No Node.js server inside the APK → disable the image optimizer
  images: {
    unoptimized: true,
  },

  // The APK is served from a local file URL; trailing slashes keep
  // client-side routing stable inside the WebView.
  trailingSlash: true,

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
```

> ⚠️ The Prisma + SQLite catalog lives in `src/lib/db.ts` and the
> `/api/*` route handlers. These run **server-side only** — there is no
> Node.js runtime inside the APK. See **Section 8 — Backend options** below
> to handle the data layer before exporting.

Then build the static site:

```bash
cd /home/z/my-project
bun run build      # or: npm run build / npx next build
```

This produces `/home/z/my-project/out/` — the folder `capacitor.config.ts`
points at (`webDir: '../../out'`).

---

## 4. Add the Android platform

The `capacitor.config.ts` is already in this folder. From here:

```bash
cd /home/z/my-project/platforms/android

# Create the native android/ project (uses capacitor.config.ts)
npx cap add android
```

Capacitor generates the standard `android/` Gradle project. **Then overlay the
template files from this folder onto the generated project** (the files here
are the production-ready versions with TV + Leanback + fullscreen support):

```bash
# AndroidManifest.xml
cp android/app/src/main/AndroidManifest.xml android/app/src/main/AndroidManifest.xml.orig 2>/dev/null || true
# (use the template in this repo's platforms/android/android/app/src/main/AndroidManifest.xml)

# MainActivity.java
mkdir -p android/app/src/main/java/com/orangeplayer/app
cp ../android/android/app/src/main/java/com/orangeplayer/app/MainActivity.java \
   android/app/src/main/java/com/orangeplayer/app/MainActivity.java

# Resources
mkdir -p android/app/src/main/res/values \
         android/app/src/main/res/drawable \
         android/app/src/main/res/mipmap-anydpi-v26
cp ../android/android/app/src/main/res/values/styles.xml    android/app/src/main/res/values/styles.xml
cp ../android/android/app/src/main/res/values/colors.xml    android/app/src/main/res/values/colors.xml
cp ../android/android/app/src/main/res/drawable/ic_launcher_foreground.xml \
   android/app/src/main/res/drawable/ic_launcher_foreground.xml
cp ../android/android/app/src/main/res/drawable/ic_launcher_background.xml \
   android/app/src/main/res/drawable/ic_launcher_background.xml
cp ../android/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml \
   android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
cp ../android/android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml \
   android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml

# Gradle files (merge app-level build.gradle manually if you already have plugins
# configured; otherwise replace wholesale)
cp ../android/android/app/build.gradle            android/app/build.gradle
cp ../android/android/app/proguard-rules.pro     android/app/proguard-rules.pro
cp ../android/android/app/capacitor.build.gradle  android/app/capacitor.build.gradle
cp ../android/android/build.gradle                android/build.gradle
cp ../android/android/settings.gradle             android/settings.gradle
cp ../android/android/gradle.properties           android/gradle.properties
mkdir -p android/gradle/wrapper
cp ../android/android/gradle/wrapper/gradle-wrapper.properties \
   android/gradle/wrapper/gradle-wrapper.properties
```

> **Tip:** If you'd rather not overlay the templates by hand, just delete the
> generated `android/` folder and replace it entirely with the `android/`
> subtree from this repo. Capacitor only needs `capacitor.config.ts` and the
> `package.json` to know where things live.

### `capacitor.config.ts` recap

```ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.orangeplayer.app',
  appName: 'ORANGE Player',
  webDir: '../../out',                 // Next.js static export output
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,            // IPTV streams are often http://
    backgroundColor: '#101419',
    webContentsDebuggingEnabled: true,  // flip to false for production
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#101419',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#FF781F',
    },
    CapacitorHttp: {
      enabled: true,                    // allow http:// for IPTV streams
    },
  },
};

export default config;
```

---

## 5. Copy web assets into the Android project

After every change to the web app, re-export and sync:

```bash
cd /home/z/my-project/platforms/android

# 1. Rebuild the static site (run from repo root)
(cd ../.. && bun run build)

# 2. Copy out/ → android/app/src/main/assets/public and update native plugins
npx cap copy android      # fast — only copies assets
# or
npx cap sync android      # also updates native plugin Gradle deps
```

---

## 6. Open in Android Studio

```bash
npx cap open android
```

This launches Android Studio with the project open. Let Gradle sync finish
(it will download AGP 8.2 + Capacitor 6 + AndroidX deps the first time).

If Gradle sync fails, check:

- `JAVA_HOME` points to **JDK 17** (not 11 or 21).
- Android SDK Platform 34 + Build-Tools 34 are installed.
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` env vars are set.

---

## 7. Build the APK

### 7.1 Debug APK (quick, signed with debug key)

```bash
cd /home/z/my-project/platforms/android/android
./gradlew assembleDebug
```

Output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device / emulator:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 7.2 Release APK (production)

```bash
cd /home/z/my-project/platforms/android/android
./gradlew assembleRelease
```

Output:

```
android/app/build/outputs/apk/release/app-release.apk
```

> The included `app/build.gradle` signs the **release** build with the
> **debug** keystore so you can produce a release APK out of the box. For
> real distribution, follow Section 9 to sign with your own key.

### 7.3 App Bundle (for Play Store)

```bash
cd /home/z/my-project/platforms/android/android
./gradlew bundleRelease
```

Output:

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 8. Backend / data layer — pick a strategy

The Next.js app ships with **Prisma + SQLite** (`prisma/schema.prisma`,
`src/lib/db.ts`) and **`/api/*` route handlers** for catalog, profiles,
favorites, history, EPG, and search. These all require a running Node.js
process — there is **no Node.js runtime inside an APK**.

Choose one:

### Option A — Remote PWA mode (simplest, recommended for v1)

1. Deploy the Next.js app to a server (Vercel / Fly.io / your own VPS with
   `next start` + Prisma + SQLite or Postgres).
2. In `capacitor.config.ts`, point the WebView at the **hosted URL** instead
   of the local static export:

   ```ts
   server: {
     url: 'https://app.orangeplayer.example.com',
     cleartext: true,
     androidScheme: 'https',
   },
   webDir: 'www',   // unused in remote mode but must exist
   ```

3. Re-run `npx cap sync android` and rebuild. The APK becomes a thin
   wrapper around the live PWA — all data goes through the remote API.

### Option B — Embedded HTTP server (advanced)

Bundle a tiny HTTP server inside the APK (e.g. **Ktor** + SQLite via
**Android's Room** or a bundled `sqlite-jdbc`) that exposes the same
`/api/*` REST surface. The WebView's fetch calls hit `http://127.0.0.1:8080`.

- Replace `src/lib/db.ts` with calls to `http://127.0.0.1:8080/api/*` via
  `fetch` (works because of `allowMixedContent: true`).
- Configure the server to start in `MainActivity.onCreate` and stop in
  `onDestroy`.
- Ship `data.db` in `assets/` and copy it to internal storage on first run.

This gives a fully offline-capable APK but is significantly more work.

### Option C — Talk to an external IPTV provider directly (demo mode)

For a quick demo APK that doesn't need the local catalog at all:

- Have the web app call the **Xtream Codes / M3U provider's** JSON API
  directly from the browser (`src/lib/xtream.ts` already does this).
- Replace Prisma-backed reads (`src/lib/db.ts`) with in-memory Zustand
  stores persisted to `localStorage` / Capacitor Preferences.
- The `/api/*` routes are simply not called (or return mock data).

Then export statically — no server needed anywhere.

---

## 9. Sign the release APK for distribution

### 9.1 Generate a keystore (one-time)

```bash
keytool -genkey -v -keystore orangeplayer.keystore \
  -alias orangeplayer -keyalg RSA -keysize 2048 -validity 10000
```

Keep `orangeplayer.keystore` **safe and private** — you need the same key for
every future update.

### 9.2 Wire it into Gradle

Create `android/keystore.properties` (DO NOT commit it):

```properties
storeFile=../orangeplayer.keystore
storePassword=********
keyAlias=orangeplayer
keyPassword=********
```

Update `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(rootProject.file("keystore.properties")))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Then:

```bash
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

### 9.3 Align + verify (optional, manual)

```bash
zipalign -v -p 4 app-release-unsigned.apk app-release.apk
apksigner verify --verbose app-release.apk
```

---

## 10. Android TV features (Leanback + D-pad)

The `AndroidManifest.xml` template already includes everything needed for
Android TV:

```xml
<!-- Optional on phones, required=false so the APK installs on both -->
<uses-feature android:name="android.software.leanback" android:required="false" />
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />

<activity android:name=".MainActivity" android:exported="true"
          android:screenOrientation="fullUser"
          android:configChanges="...|uiMode|navigation">

    <!-- Phone / tablet launcher -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Android TV home launcher -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
    </intent-filter>
</activity>
```

- The **`LEANBACK_LAUNCHER`** intent filter makes the app show up in the
  Android TV home screen on TV boxes / Google TV.
- `touchscreen not required` lets the APK install on TV-only devices.
- `MainActivity.onKeyDown` forwards D-pad / media keys (`DPAD_UP/DOWN/LEFT/
  RIGHT/CENTER`, `MEDIA_PLAY_PAUSE`, `MEDIA_NEXT`, `MEDIA_PREVIOUS`,
  `MEDIA_STOP`, `BACK`, `MENU`) to the WebView, where the web app's
  `use-spatial-nav.ts` hook handles focus movement.
- `screenOrientation="fullUser"` allows all four orientations on mobile,
  while TVs are naturally locked to landscape by the platform.

### Banner icon for TV (optional but recommended)

Drop a 320×180px `android:banner` PNG at
`android/app/src/main/res/drawable/tv_banner.png` and add
`android:banner="@drawable/tv_banner"` to the `<application>` tag so the TV
home screen shows a nice wide tile.

### D-pad focus handling on the web side

The web app already includes `src/hooks/use-spatial-nav.ts` which maps D-pad
arrow events to focus movement across focusable elements. Make sure every
interactive element has `tabIndex={0}` and a visible `:focus-visible` ring so
D-pad navigation is discoverable.

---

## 11. Splash screen

The `@capacitor/splash-screen` plugin is configured in `capacitor.config.ts`:

- Background `#101419` (graphite)
- Spinner color `#FF781F` (orange brand)
- 2-second launch duration, `CENTER_CROP` scale

For a custom branded splash image, drop `splash.png` into
`android/app/src/main/res/drawable-*/` (the plugin ships a default one and
you override per-density). Re-run `npx cap sync android` after changing
splash resources.

---

## 12. Local HTTP API server (embedded) — quick recipe

If you go with **Option B** (embedded server), the minimal sketch is:

1. Add Ktor to `app/build.gradle`:
   ```gradle
   implementation "io.ktor:ktor-server-core:2.3.7"
   implementation "io.ktor:ktor-server-netty:2.3.7"
   implementation "io.ktor:ktor-server-content-negotiation:2.3.7"
   implementation "io.ktor:ktor-serialization-kotlinx-json:2.3.7"
   ```
2. In `MainActivity.onCreate`, start a background thread running an
   embeddedServer on `127.0.0.1:8080` with routes mirroring the Next.js
   `/api/*` surface (catalog, providers, favorites, history, search).
3. Ship a seeded `data.db` in `assets/`; copy to
   `getFilesDir()/data.db` on first launch and have Ktor read it via
   `sqlite-jdbc` or wrap with Room.
4. In the WebView, change the API base URL to `http://127.0.0.1:8080`
   (allowed because of `allowMixedContent: true` + `usesCleartextTraffic="true"`
   in the manifest).
5. Stop the server in `MainActivity.onDestroy`.

---

## 13. Common commands cheat sheet

```bash
# --- Web ---
cd /home/z/my-project
bun run dev                   # dev server on :3000 (browser)
bun run build                 # static export → /home/z/my-project/out

# --- Capacitor sync ---
cd /home/z/my-project/platforms/android
npx cap copy android          # fast copy of out/ into android/app/src/main/assets/public
npx cap sync android          # copy + update native plugin deps
npx cap open android          # open in Android Studio

# --- Gradle build (run from android/android) ---
cd android
./gradlew assembleDebug       # → app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease      # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease         # → app/build/outputs/bundle/release/app-release.aab
./gradlew clean                # clean build dirs

# --- Device install / debug ---
adb devices
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb logcap | grep -i "orangeplayer\|chromium\|capacitor"
```

---

## 14. Project layout

```
platforms/android/
├── README.md                       ← you are here
├── capacitor.config.ts             ← Capacitor config (webDir, plugins, server)
├── package.json                     ← Capacitor deps + npm scripts
└── android/                         ← native Gradle project (template)
    ├── build.gradle                 ← project-level
    ├── settings.gradle
    ├── gradle.properties
    ├── gradle/wrapper/gradle-wrapper.properties
    └── app/
        ├── build.gradle              ← app-level (compileSdk 34, minSdk 22)
        ├── proguard-rules.pro
        ├── capacitor.build.gradle    ← generated by Capacitor (don't edit)
        └── src/main/
            ├── AndroidManifest.xml   ← TV + Mobile manifest (Leanback launcher)
            ├── java/com/orangeplayer/app/MainActivity.java
            └── res/
                ├── values/styles.xml   ← dark AppTheme + SplashTheme
                ├── values/colors.xml   ← orange/graphite/surface palette
                ├── drawable/ic_launcher_foreground.xml  ← orange hex
                ├── drawable/ic_launcher_background.xml  ← graphite bg
                └── mipmap-anydpi-v26/
                    ├── ic_launcher.xml      ← adaptive icon
                    └── ic_launcher_round.xml
```

---

## 15. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Unsupported class file major version` | JDK is wrong. Use **JDK 17**, set `JAVA_HOME`. |
| `SDK location not found` | Set `ANDROID_HOME` / `ANDROID_SDK_ROOT`, or create `android/local.properties` with `sdk.dir=/path/to/Android/Sdk`. |
| Gradle sync stuck | Check internet (Maven Central / Google), then `File → Invalidate Caches`. |
| WebView shows blank page | Run `bun run build` in repo root, then `npx cap copy android`. Make sure `out/` exists. |
| IPTV stream doesn't play (http://) | Confirm `allowMixedContent: true` + `usesCleartextTraffic="true"` are set. |
| D-pad doesn't move focus | Inspect `use-spatial-nav.ts` and ensure elements have `tabIndex` + visible focus ring. |
| `app-release.apk` won't install | It's signed with the debug key — generate your own keystore (Section 9). |
| Prisma errors in the WebView | There's no Node.js in the APK. Use Option A / B / C from Section 8. |

---

## 16. License & branding

ORANGE Player — Orange Glass UI. Brand color `#FF781F` on graphite `#101419`.
All template files in this folder are production-ready and safe to ship once
signed with your own keystore.
