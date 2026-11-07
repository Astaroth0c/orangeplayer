# ORANGE Player — PWA (Progressive Web App)

This package turns the ORANGE Player Next.js web app into an installable, offline-capable Progressive Web App that runs on Android (Chrome), iOS (Safari), desktop (Chrome/Edge/Brave), and any environment that supports the Web App Manifest + Service Worker standards.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Web App Manifest — app name, icons, theme, shortcuts, display mode |
| `sw.js` | Service Worker — caches the app shell, network-first for `/api/*`, cache-first for static assets |

Both files must be served **from the web root** of the deployed Next.js app (i.e. `https://your-domain/manifest.json` and `https://your-domain/sw.js`). With Next.js static export, that means copying them into the `public/` folder before `next build` (or into `out/` after the build).

---

## 1. Register the Service Worker in the Next.js layout

The service worker must be registered from a client component. The cleanest approach is a small client component mounted once in `src/app/layout.tsx`.

### `src/components/pwa/register-sw.tsx` (new file)

```tsx
'use client';

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Only register in production — avoids stale caches during dev.
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // New version ready — reload once to activate it.
                window.location.reload();
              }
            });
          });
        })
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
```

### Add it to the layout

In `src/app/layout.tsx`, inside the `<body>` of the root layout:

```tsx
import { RegisterSW } from '@/components/pwa/register-sw';

// ...

<body>
  <RegisterSW />
  {/* …existing children… */}
</body>
```

---

## 2. Link the manifest and theme color

In `src/app/layout.tsx`, add the manifest link and theme-color meta inside `<head>` (Next.js App Router supports the metadata API, but the manual `<link>` also works):

### Using the Metadata API (recommended)

```tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  manifest: '/manifest.json',
  applicationName: 'ORANGE Player',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ORANGE Player',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192x192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF781F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

### Manual approach (alternative)

```tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#FF781F" />
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="ORANGE Player" />
</head>
```

---

## 3. Copy `manifest.json` and `sw.js` to `public/`

Next.js serves everything in `public/` from the web root. From the repo root:

```bash
mkdir -p public/icons public/screenshots
cp platforms/pwa/manifest.json public/manifest.json
cp platforms/pwa/sw.js public/sw.js
```

> The `platforms/pwa/` folder is the **source of truth**. Copying to `public/` is what makes them deployable. You can also symlink instead of copy if your CI supports it.

---

## 4. Generate icons from a single source PNG

You need one high-resolution source PNG (ideally `1024×1024` or larger) of the ORANGE Player logo. From there, generate every size the manifest references.

### Option A — `pwa-asset-generator` (recommended)

```bash
# from repo root
npm install -g pwa-asset-generator

# Generate all icon sizes + maskable + apple-touch + favicons
pwa-asset-generator ./branding/source-logo.png ./public/icons \
  --manifest ./public/manifest.json \
  --icon-only \
  --padding "10%" \
  --background "#101419" \
  --type png \
  --opaque false
```

This reads `manifest.json`, generates every size listed in `icons[]`, and writes them into `public/icons/`. It also generates the maskable variant with safe padding.

### Option B — `sharp` script (Node)

```js
// scripts/generate-icons.mjs
import sharp from 'sharp';

const SRC = './branding/source-logo-1024.png';
const OUT = './public/icons';
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const s of SIZES) {
  await sharp(SRC).resize(s, s).png().toFile(`${OUT}/icon-${s}x${s}.png`);
}

// Maskable variant with safe-area padding
await sharp(SRC)
  .resize({ width: 192, fit: 'contain', background: '#101419' })
  .extend({ top: 40, bottom: 40, left: 40, right: 40, background: '#101419' })
  .png()
  .toFile(`${OUT}/icon-192x192-maskable.png`);
```

Run with:

```bash
node --experimental-vm-modules scripts/generate-icons.mjs
```

### Shortcut icons

The three shortcut icons (`film.png`, `clapperboard.png`, `tv.png`) and the screenshot (`dashboard.png`) must be authored separately — they are content, not derived from the logo.

---

## 5. Lighthouse PWA audit

The PWA must pass Lighthouse's PWA category for installability.

```bash
# from repo root, after `bun run build` + `bun run start`
npx lighthouse http://localhost:3000 \
  --only-categories=pwa \
  --view \
  --output html \
  --output-path ./lighthouse-pwa-report.html
```

**Expected scores (all should be ✓):**

- `installable` — Manifest has `name`, `icons ≥ 192px` + `512px`, `start_url`, `display: standalone|fullscreen`.
- `offline-ready` — Service Worker controls `start_url` and at least one route.
- `maskable-icon` — At least one icon has `purpose: "maskable"`.
- `apple-touch-icon` — `192×192` icon present and linked.
- `themed-omnibox` — `theme-color` meta + `background_color` in manifest.

If `offline-ready` fails, verify `sw.js` is reachable at `/sw.js` and that `start_url: '/'` is in `ASSETS`.

### Chrome DevTools manual check

1. Open DevTools → **Application** tab.
2. **Manifest** pane — confirm no warnings.
3. **Service Workers** pane — confirm `orange-player_v1` is **activated and running**.
4. **Cache Storage** → `orange-player_v1` — confirm `/`, `/manifest.json`, `/logo.svg` are cached.
5. Toggle **Offline** in the Network pane and reload — the app shell must still load.

---

## 6. Install on each platform

### Android (Chrome / Edge / Samsung Internet)
1. Open `https://your-domain` in Chrome.
2. Tap the **⋮** menu → **Add to Home screen** (or **Install app**).
3. Confirm. The icon appears on the launcher; tapping launches in fullscreen (no browser chrome).

### iOS (Safari)
1. Open `https://your-domain` in Safari.
2. Tap the **Share** button → **Add to Home Screen**.
3. Confirm. iOS uses `apple-touch-icon` and `apple-mobile-web-app-status-bar-style`.
> iOS does not support the Service Worker install prompt — only the manual "Add to Home Screen" flow, and SW caching works only since iOS 11.3.

### Desktop (Chrome / Edge / Brave)
- Chrome 100+: an **Install** icon appears in the address bar when the installability criteria are met.
- Or use the **⋮** menu → **Install ORANGE Player…**.
- The app installs as a standalone window (PWA) listed in the OS app launcher (Windows: Start Menu; macOS: Launchpad; Linux: app grid).

### Chrome OS / Android TV / TV browsers
TV browsers with PWA support (Chrome on Android TV, Chrome on Tizen developer mode) follow the same flow as Android.

---

## 7. Make the Next.js app export-friendly (shared requirement)

For the same Next.js build to power the PWA **and** the Tizen / webOS TV shells, the app must static-export:

### `next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',                 // static export → ./out
  images: { unoptimized: true },   // no Next image optimizer when exported
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
```

### Build

```bash
bun run build      # produces ./out containing index.html + static assets
```

### Deploy options for PWA
- **Static host** (Cloudflare Pages, Netlify, Vercel static, S3+CloudFront, GitHub Pages, Caddy): upload `out/`.
- **SSR-mode fallback**: keep `output: 'standalone'` for the SSR deployment and a separate `output: 'export'` build for the PWA/TV shell. Use a build flag:
  ```bash
  NEXT_PUBLIC_TARGET=pwa bun run build
  ```
  and branch `output` on that env var if you need both modes from the same repo.

---

## 8. CI / deployment snippet

Example GitHub Actions step:

```yaml
- name: Build PWA
  run: |
    cp platforms/pwa/manifest.json public/manifest.json
    cp platforms/pwa/sw.js public/sw.js
    bun install
    bun run build

- name: Upload static export
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./out
```

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Lighthouse: "No service worker found" | Confirm `/sw.js` is served with `Content-Type: text/javascript` (or `application/javascript`). Vercel and most static hosts set this automatically; if not, add a `mime.types` entry. |
| Lighthouse: "start_url not cached by SW" | Add `'/'` to `ASSETS` in `sw.js` (already there) and ensure `start_url` in `manifest.json` is `/`. |
| Service Worker keeps old version | Bump `CACHE` constant (`orange-player_v2`, etc.). The `activate` handler deletes old caches. |
| Maskable icon shows cropped logo | Re-generate with `--padding "20%"` (safe-area). Android adaptive icons clip the outer 20%. |
| iOS "Add to Home Screen" shows blank icon | Confirm `apple-touch-icon` link (192×192 PNG, no transparency) is in `<head>`. |
| `fetch` for API cached forever | `sw.js` uses network-first for `/api/*` so API responses are never served stale. If you want stale-while-revalidate, swap the branch. |
| `display: fullscreen` ignored | Some browsers fall back to `standalone`. Add `display_override: ["fullscreen", "standalone", "minimal-ui"]` if you want progressive fallback. |

---

## 10. File layout after integration

```
public/
├── manifest.json            # copied from platforms/pwa/
├── sw.js                    # copied from platforms/pwa/
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-192x192-maskable.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── film.png             # shortcut icon
│   ├── clapperboard.png     # shortcut icon
│   └── tv.png               # shortcut icon
├── screenshots/
│   └── dashboard.png
└── logo.svg
```

---

**Source of truth**: `/home/z/my-project/platforms/pwa/` ·
**Deployed location**: `/home/z/my-project/public/` (for Next.js) ·
**Build output**: `/home/z/my-project/out/` (after `output: 'export'`).
