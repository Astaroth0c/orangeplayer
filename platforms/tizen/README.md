# ORANGE Player — Samsung Smart TV (Tizen)

This package wraps the ORANGE Player Next.js web app as a Samsung Smart TV (Tizen) widget (`.wgt`). The widget loads the static-exported Next.js app in an iframe and translates Tizen remote-control keys into standard keyboard events the web app already handles.

## Files

| File | Purpose |
| --- | --- |
| `config.xml` | Tizen widget descriptor — app id, privileges, CSP, profile, settings |
| `index.html` | Tizen entry point — loads `index-export.html` (the Next.js export) in an iframe + `app.js` |
| `app.js` | Tizen key-bridge — maps Samsung remote key codes to standard browser key events |
| `styles.css` | Reset + fullscreen black canvas for the Tizen shell |
| `package.json` | Optional CLI build/install scripts (uses `tizen` and `sdb` from Tizen Studio) |

The Tizen widget **id** is `com.orangeplayer.app` and the package is `orangeplayer`.

---

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Tizen Studio | 5.0+ | IDE + SDK + packaging tools (`tizen`, `sdb` CLI) |
| Tizen TV SDK (TV extension) | latest | Adds the TV-2019/2020/2021/2022/2023/2024 emulators + `tizen.tvinputdevice` API |
| Samsung Developer Account | — | Required to create the certificate for installing on consumer TVs |
| Node.js | 18+ | Only needed to build the Next.js static export |
| `bun` (or npm) | latest | To run `bun run build` for the Next.js export |
| A Samsung Smart TV (2019+) **or** the Tizen TV emulator | — | To install & test the `.wgt` |

**Install Tizen Studio:** <https://developer.tizen.org/development/tizen-studio/download>

After installing, make sure the `tizen` and `sdb` binaries are on your `PATH` (Tizen Studio → Preferences → CLI tools, or add `$TIZEN_STUDIO/tools/ide/bin` and `$TIZEN_STUDIO/tools` to your `PATH`).

---

## 2. Make the Next.js app export-friendly (shared requirement)

The TV shells expect a **static export** of the Next.js app.

### Edit `/home/z/my-project/next.config.ts`

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',                 // static export → ./out
  images: { unoptimized: true },     // no Next image optimizer when exported
  reactStrictMode: false,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
```

> **Note on `output: 'standalone'` vs `export`:** the current repo has `output: 'standalone'` (SSR-friendly). For the Tizen build you need `export`. Either switch the field per build, or branch on an env var:
>
> ```ts
> const nextConfig: NextConfig = {
>   output: process.env.NEXT_PUBLIC_TARGET === 'tv' ? 'export' : 'standalone',
>   images: { unoptimized: process.env.NEXT_PUBLIC_TARGET === 'tv' },
>   // …
> };
> ```

### Build the static export

```bash
cd /home/z/my-project
bun run build      # produces ./out containing index.html + _next/ + assets
```

---

## 3. Create a Tizen web app project

Two paths.

### Path A — Use this folder as the project root

This `platforms/tizen/` folder already contains a valid `config.xml` and entry HTML. You can import it directly into Tizen Studio:

1. **Tizen Studio → File → Import → Tizen → Tizen Project → Existing Project**.
2. Point it at `/home/z/my-project/platforms/tizen/`.
3. Tizen Studio recognises `config.xml` and creates the project.

### Path B — Create from the Tizen Studio wizard (clean start)

1. **File → New → Tizen Project → Web App → Basic**.
2. Pick the **TV** profile (e.g. TV-6.0 or higher).
3. Name it `orange-player`.
4. Tizen Studio creates `config.xml`, `index.html`, `js/main.js`, `css/style.css`.

Either way, **end state** must be:

```
platforms/tizen/
├── config.xml
├── index.html           # our shell, loads iframe → index-export.html
├── app.js               # key bridge
├── styles.css
├── icon.png             # app icon (512×512 PNG)
├── index-export.html    # ← Next.js export's index.html, RENAMED
├── _next/               # ← copied from ./out/
└── (any other static assets from ./out/)
```

---

## 4. Copy the Next.js static export into the Tizen project

The Tizen shell's `index.html` loads `index-export.html` inside an iframe. The Next.js export produces its own `index.html` at the root of `out/`, so we **rename** it to `index-export.html` to avoid clashing with the Tizen shell's `index.html`.

```bash
# from /home/z/my-project
SRC=./out
DST=./platforms/tizen

# Copy everything from the static export
cp -r "$SRC/." "$DST/"

# Rename the Next.js entry so it does not overwrite our Tizen shell
mv "$DST/index.html" "$DST/index-export.html"
```

> The iframe isolates the Next.js app from Tizen's widget CSP. The widget's CSP (`config.xml`) governs the shell; the iframe's documents inherit per-page CSP from the Next.js export, so HTTP streams, blobs, and inline scripts work the way the web app expects.

### Why the iframe?

- The Tizen shell's `config.xml` CSP is strict and applies to the widget's top document. Putting the Next.js export inside an iframe gives it a fresh browsing-context CSP (effectively the page's own `<meta http-equiv="Content-Security-Policy">` or the default), so the exported app behaves the same as in a normal browser.
- `app.js` runs in the shell document and translates remote keys globally — keyboard events bubble into the iframe.

### Alternative: no iframe

If you'd rather avoid the iframe, simply copy `./out/index.html` over `platforms/tizen/index.html` and merge `app.js` and `styles.css` into the page. The trade-off: the strict `config.xml` CSP then applies to the Next.js app, which can break inline scripts and HTTP streams. Choose this only if you've relaxed the CSP in `config.xml` accordingly.

---

## 5. Configure `config.xml`

The provided `config.xml` already declares:

- **App id**: `com.orangeplayer.app`
- **Profile**: `tv`
- **View mode**: `maximized` (1920×1080 full-screen)
- **Privileges**:
  - `internet` — network for IPTV streams
  - `application.launch` — launch other Tizen apps (optional)
  - `tv.inputdevice` — receive remote-control keys
  - `tv.display` — manage display / resolution
  - `mediacapture` — (optional) camera/mic for future features
- **CSP**: permissive enough for HTTP HLS/MPEG-DASH streams + WSS + inline scripts/styles.
- **Settings**: landscape orientation, auto install location, etc.

> If you change the app id, also update the package name and the id used in `sdb shell 0 debug <id>` calls below.

### App icon

Place a 512×512 PNG at `platforms/tizen/icon.png` (referenced by `<icon src="icon.png"/>`). For the launcher, also provide:
- `icon.png` — 512×512 (main)
- `preview-1080x1920.png` — optional store preview (when submitting to Samsung Apps)

### Splash / launch image (optional)

Tizen TV shows a default launcher splash. To customise:

```xml
<tizen:splash-image src="splash.png"/>
```

and drop a `splash.png` (1920×1080) into `platforms/tizen/`.

---

## 6. Build the widget

### From Tizen Studio (GUI)

1. Right-click the `orange-player` project → **Build** (compiles `src/`).
2. Right-click → **Package → Package** (produces `orange-player.wgt` in the project root).

### From the CLI

```bash
cd /home/z/my-project/platforms/tizen
tizen package -t wgt -s orange-player -- src/
# produces ./orange-player.wgt
```

`-s orange-player` is the **certificate profile** name you create in step 7. Omit `-s` for an unsigned widget (only installable on the emulator, not on real TVs).

---

## 7. Sign the widget (Samsung certificate)

Real Samsung TVs reject unsigned widgets. You need a **Samsung certificate** (Distributor + Author).

### Create the certificate

1. **Tools → Certificate Manager → + → Samsung → TV**.
2. Sign in with your Samsung Developer account.
3. Create a new **Author certificate** + **Distributor certificate** (DUID list = your TV's DUID, fetched via the TV's Settings → About → Device unique ID, or via Device Manager).
4. Save the profile as `orange-player` (matches `-s orange-player` above).

### From the CLI

The CLI equivalent uses the same profile; you only need to do the GUI flow once to create the profile, then `tizen package -s orange-player` uses it.

> Distributor certificate DUIDs are limited per developer account. For wider testing (e.g. QA devices) you can request a "DUID group" certificate from the Samsung TV Developer Office.

---

## 8. Install on the TV

### Option A — Device Manager (GUI)

1. **Window → Perspective → Device Manager**.
2. Connect your TV (same Wi-Fi network, or via USB with the TV in Developer Mode).
3. Right-click the TV → **Install** → select `orange-player.wgt`.

### Option B — `sdb` CLI

```bash
# Connect the TV (replace IP with your TV's IP)
sdb connect 192.168.0.10:26101

# Install
sdb install orange-player.wgt

# Or use the package.json helper:
cd /home/z/my-project/platforms/tizen
bun run install:tv        # runs: sdb install orange-player.wgt
```

### Enable Developer Mode on a consumer TV

1. On the TV: **Settings → General → Network → Smart Hub → Reset** (Smart Hub account creation screen).
2. Press `12345` on the remote quickly to enter **Developer Mode**.
3. Enter your Samsung Developer account email → **On**.
4. Reboot the TV → the TV now accepts `sdb install`.

---

## 9. Run on the TV

### From the GUI

Tizen Studio → Device Manager → right-click the installed app → **Run**.

### From the CLI

```bash
sdb shell 0 debug orange-player
```

Or via the package.json helper:

```bash
cd /home/z/my-project/platforms/tizen
bun run run:tv         # runs: sdb shell 0 debug orange-player
```

> Note: the original spec called the binary `amyr orange-player` — that's a typo. The correct command is `sdb shell 0 debug orange-player` (or `sdb shell 0 execute orange-player` for non-debug run).

### View logs

```bash
sdb dlog | grep -i orange
# or, in Tizen Studio: Log View → filter by "orangeplayer"
```

---

## 10. Remote control key map

`app.js` registers the media keys with Tizen and translates remote buttons into standard DOM `KeyboardEvent.key` values the web app already listens to:

| Samsung Remote | Tizen KeyCode | Translated `e.key` |
| --- | --- | --- |
| OK / Center | 13 | `Enter` |
| Return | 10009 | `Escape` |
| Play | 415 | `Space` |
| Pause | 19 | `Space` |
| Play/Pause | 10252 | `Space` |
| Stop | 413 | `Escape` |
| Rewind | 412 | `ArrowLeft` |
| Fast Forward | 417 | `ArrowRight` |
| ◀ (Left) | 37 | `ArrowLeft` |
| ▲ (Up) | 38 | `ArrowUp` |
| ▶ (Right) | 39 | `ArrowRight` |
| ▼ (Down) | 40 | `ArrowDown` |
| Exit | 10109 | `Escape` |

The web app's spatial navigation (`use-spatial-nav.ts`) and player controls respond to these standard keys.

---

## 11. Iterative development

### Live-reload during TV development

You don't need to repack the `.wgt` for every change. Two options:

**Option 1 — Host the Next.js export on your dev machine and have the iframe point to it.**

Edit `platforms/tizen/index.html`:

```html
<iframe src="http://192.168.0.50:3000/" …></iframe>
```

Then run `bun dev` (or `bun run start` after `bun run build`) on your dev machine. Reload the iframe on the TV with `sdb shell 0 debug orange-player`.

**Option 2 — Use the Tizen TV emulator** (no certificate needed). The emulator runs the unsigned `.wgt` and you can repack with `tizen package` after each change.

### Hot reload

For Tizen-only shell changes (e.g. `app.js`, `styles.css`), use Tizen Studio's **Remote Inspector** (right-click project → **Debug As → Tizen Web Application**). It opens Chrome DevTools connected to the TV.

---

## 12. Submitting to Samsung Apps TV

Once the widget works on a real TV:

1. Create a Seller account: <https://seller.tv.samsungapps.com>.
2. Register a new app → select the TV model group → upload the signed `.wgt`.
3. Provide screenshots (1920×1080 PNGs), a content rating, and a privacy policy URL.
4. Submit for certification. Samsung typically certifies within 3–5 business days.

> Distributor certificates from a personal Samsung Developer account **cannot** be used to publish to Samsung Apps. You must use the **Seller** account's Distributor certificate (re-issue the cert in Certificate Manager while logged into the Seller account).

---

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `sdb install` → `FAILED` | TV not in Developer Mode, or the Distributor certificate DUID doesn't include this TV. Re-create the certificate with the TV's DUID. |
| App launches to blank screen | `index-export.html` missing — copy `out/index.html` to `platforms/tizen/index-export.html`. |
| Remote keys do nothing | `tvinputdevice` privilege missing in `config.xml`, or `app.js` not loaded (check the iframe is rendered before the script runs). |
| HTTP streams fail (mixed content) | CSP `media-src` and `connect-src` must include `http:` and `ws:`. Already in `config.xml`. |
| `tizen: package not found` | Add `$TIZEN_STUDIO/tools/ide/bin` to `PATH`. |
| `tizen package` errors on `sign` | Wrong certificate profile name. Use `-s <profile>` matching the one created in Certificate Manager. |
| `e.key` is not translated | Tizen's `keydown` is `cancelable` but `e.key` is read-only on some versions. Patch `e.key` BEFORE the Next.js app's handler — `app.js` runs in the shell; to forward translated keys into the iframe, dispatch a synthetic event on `iframe.contentWindow.document`. See note below. |

### Cross-iframe key dispatch

If key translation isn't reaching the iframe, replace the listener in `app.js` with:

```js
document.addEventListener('keydown', (e) => {
  const mapped = TV_KEYS[e.keyCode];
  if (!mapped) return;

  const iframe = document.querySelector('iframe');
  const iframeDoc = iframe?.contentDocument;
  if (!iframeDoc) return;

  iframeDoc.dispatchEvent(new KeyboardEvent('keydown', {
    key: mapped, code: mapped, keyCode: e.keyCode, bubbles: true,
  }));
  e.preventDefault();
});
```

This guarantees the Next.js app receives the translated `key` value.

---

## 14. CI / packaging pipeline (optional)

```yaml
# .github/workflows/tizen.yml
- name: Build Next.js export
  run: |
    NEXT_PUBLIC_TARGET=tv bun install
    NEXT_PUBLIC_TARGET=tv bun run build

- name: Stage export into Tizen project
  run: |
    cp -r out/. platforms/tizen/
    mv platforms/tizen/index.html platforms/tizen/index-export.html
    cp platforms/tizen/index-shell.html platforms/tizen/index.html || true

- name: Package widget
  run: |
    cd platforms/tizen
    tizen package -t wgt -s orange-player -- src/

- uses: actions/upload-artifact@v3
  with:
    name: orange-player.wgt
    path: platforms/tizen/orange-player.wgt
```

---

**Source of truth:** `/home/z/my-project/platforms/tizen/`
**Next.js export:** `/home/z/my-project/out/` (after `bun run build` with `output: 'export'`)
