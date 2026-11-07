# ORANGE Player — LG Smart TV (webOS)

This package wraps the ORANGE Player Next.js web app as an LG webOS app (`.ipk`). The webOS shell loads the static-exported Next.js app in an iframe and translates LG Magic Remote key codes into standard keyboard events the web app already handles.

## Files

| File | Purpose |
| --- | --- |
| `appinfo.json` | webOS app descriptor — id, version, icons, splash, window type, permissions |
| `index.html` | webOS entry point — loads `index-export.html` (the Next.js export) in an iframe + `app.js` |
| `app.js` | webOS key-bridge — maps Magic Remote key codes to standard browser key events |
| `styles.css` | Reset + fullscreen black canvas for the webOS shell |
| `package.json` | CLI build/install scripts (uses `ares-*` from `@webos-tools/cli`) |

The webOS app **id** is `com.orangeplayer.app`.

---

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 18+ | Required by `@webos-tools/cli` (ares-cli) |
| `@webos-tools/cli` (ares-cli) | latest | CLI for `ares-create`, `ares-package`, `ares-install`, `ares-launch`, `ares-inspect` |
| LG webOS TV (2020+) **or** the webOS TV emulator | — | To install & test the `.ipk` |
| LG Developer account | — | To download the SDK emulator images |
| `bun` (or npm) | latest | To run `bun run build` for the Next.js export |

### Install the webOS SDK CLI

```bash
# Install the CLI globally
npm install -g @webos-tools/cli

# Verify
ares --version
ares-create --help
```

> Older versions used `npm install -g @webos-tools/cli`. If your platform needs the **Legacy webOS CLI** (for pre-2020 TVs), install `webos-cli` from the LG Developer site instead:
> <https://webostv.developer.lge.com/develop/getting-started/introduction/>

### Download the webOS TV emulator (optional but recommended)

1. <https://webostv.developer.lge.com/develop/tools/emulator-introduction/>
2. Install the LG WebOS TV SDK Emulator (uses VirtualBox) and download a TV image (6.0 or 7.0 or 8.0).
3. Launch the emulator from the SDK app — it boots to a virtual TV home screen.

### LG Developer account

Sign up at <https://webostv.developer.lge.com/> to access the SDK, the emulator images, and (later) the LG Content Store seller portal.

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

> **Note on `output: 'standalone'` vs `export`:** the current repo has `output: 'standalone'` (SSR-friendly). For the webOS build you need `export`. Either switch the field per build, or branch on an env var:
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

## 3. Initialise the webOS project (two options)

### Option A — Use this folder directly

This `platforms/webos/` folder already contains a valid `appinfo.json` and entry HTML. You can package it directly without going through the `ares-create` wizard:

```bash
cd /home/z/my-project/platforms/webos
# (after copying the Next.js export — see step 4)
ares-package .
```

### Option B — Create from the wizard (clean start)

```bash
# Create a project from the web app template
ares-create orange-player

# This creates ./orange-player/ with appinfo.json, index.html, css/style.css, js/main.js
```

Then **copy** this folder's `appinfo.json`, `index.html`, `app.js`, `styles.css` over the wizard's defaults (or merge them as needed).

### Either way, end state must be

```
platforms/webos/
├── appinfo.json
├── index.html           # our shell, loads iframe → index-export.html
├── app.js               # key bridge
├── styles.css
├── icon.png             # 80×80 PNG (small app icon)
├── icon-large.png       # 130×130 PNG (large app icon)
├── splash.png           # 1920×1080 PNG (splash background)
├── index-export.html    # ← Next.js export's index.html, RENAMED
├── _next/               # ← copied from ./out/
└── (any other static assets from ./out/)
```

---

## 4. Copy the Next.js static export into the webOS project

The webOS shell's `index.html` loads `index-export.html` inside an iframe. The Next.js export produces its own `index.html` at the root of `out/`, so we **rename** it to `index-export.html` to avoid clashing with the webOS shell's `index.html`.

```bash
# from /home/z/my-project
SRC=./out
DST=./platforms/webos

# Copy everything from the static export
cp -r "$SRC/." "$DST/"

# Rename the Next.js entry so it does not overwrite our webOS shell
mv "$DST/index.html" "$DST/index-export.html"
```

### Why the iframe?

- webOS apps run inside the Web App Manager (WAM), which applies its own security policy to the top document. An iframe gives the Next.js app a fresh browsing context, so the exported app behaves the same as in a normal browser.
- `app.js` runs in the shell document and translates Magic Remote keys globally — keyboard events bubble into the iframe.

### Alternative: no iframe

If you'd rather avoid the iframe, simply copy `./out/index.html` over `platforms/webos/index.html` and merge `app.js` and `styles.css` into the page. The trade-off: WAM's security policy then applies directly to the Next.js app, which can break inline scripts and HTTP streams. Choose this only if you've relaxed the policy in the TV's `webosconf` and in your `appinfo.json` `requiredPermissions`.

---

## 5. Configure `appinfo.json`

The provided `appinfo.json` declares:

- **id**: `com.orangeplayer.app`
- **version**: `1.0.0`
- **vendor**: `ORANGE Player`
- **type**: `web`
- **main**: `index.html` (the webOS shell)
- **title**: `ORANGE Player`
- **icon / largeIcon**: `icon.png` (80×80), `icon-large.png` (130×130)
- **splashBackground / bgImage**: `splash.png` (1920×1080)
- **defaultWindowType**: `fullscreen`
- **supports4K / handles4KResolution**: `true` — tells webOS the app handles 4K natively
- **allowMediaContentAudio / allowMediaContentVideo**: `true`
- **requiredPermissions**: `time`, `settings`, `externaloutput`, `media.accessibility`
- **checkUpdateOnLaunch**: `true`

### App icon set (LG Content Store / launcher requirements)

| File | Size | Format |
| --- | --- | --- |
| `icon.png` | 80×80 | PNG, opaque, RGBA |
| `icon-large.png` | 130×130 | PNG, opaque, RGBA |
| `splash.png` | 1920×1080 | PNG/JPG, the splash background shown while the app loads |

> If you change the app id, update `com.orangeplayer.app` everywhere, including the `ares-launch` script in `package.json`.

### Permissions

LG webOS permission tokens are defined inside `appinfo.json` (not in a separate file like Tizen). The default set declared here covers:

- `time` — read the clock (for EPG / scheduling)
- `settings` — read system settings (e.g. audio output mode)
- `externaloutput` — drive external displays / second screen
- `media.accessibility` — captions, audio descriptions

Additional permission tokens you may need:

| Permission | When |
| --- | --- |
| `media.decoders.query` | if you enumerate hardware codec support |
| `camera` | if you ever use the camera |
| `microphone` | for voice search |
| `network.kickstart` | low-latency network access |
| `external.input` | HDMI-CEC integration |
| `systemconfig` | read system config (rare) |

Add them to `requiredPermissions` as needed; the user is shown a permission prompt at install time on newer webOS versions.

---

## 6. Package the app

```bash
cd /home/z/my-project/platforms/webos
ares-package .
# → orange-player_1.0.0_all.ipk
```

Or via the package.json helper:

```bash
bun run package     # runs: ares-package .
```

`ares-package .` reads `appinfo.json`, bundles the folder, and produces `<id>_<version>_all.ipk` in the current directory.

### Packaging notes

- webOS apps are not signed the way Tizen widgets are. Installation on a consumer TV requires **Developer Mode** to be enabled on the TV (see step 8). For the LG Content Store, you submit the `.ipk` via the seller portal and LG re-signs it internally.
- `ares-package` validates `appinfo.json` — fix any JSON errors it reports before proceeding.

---

## 7. Set up the device

### Register the TV with ares-cli

```bash
ares-setup-device

# Interactive prompts:
#   - Add a new device
#   - name: tv
#   - host: <your TV's IP, e.g. 192.168.0.10>
#   - port: 9922
#   - user: prisoner
#   - password: (the passphrase shown in Developer Mode on the TV)
```

Or use the one-shot form:

```bash
ares-setup-device --add tv --host 192.168.0.10 --port 9922
```

### Verify

```bash
ares-device --device tv
# → prints the TV's webOS version, model name, etc.
```

---

## 8. Enable Developer Mode on the TV

The TV must be in **Developer Mode** to accept unsigned `.ipk`s.

1. **On the TV:** sign in to the LG Developer Mode app (search "Developer Mode" in the LG Content Store; install it; sign in with your LG Developer account).
2. **Toggle Developer Mode ON** and **Enable Dev Mode Status**.
3. The TV shows a **passphrase** and an IP address — these are the credentials you use in `ares-setup-device`.
4. Reboot the TV after enabling (a banner confirms Developer Mode is active).
5. **Note:** Developer Mode expires after 1000 hours of TV uptime. Re-enter the Developer Mode app and toggle it back on; the TV does **not** need to be factory-reset.

### Connecting to the emulator

For the emulator (no Developer Mode needed): set `--host localhost` and `--port 6666` in `ares-setup-device` (the emulator's default SSH port).

---

## 9. Install on the TV

```bash
ares-install --device tv orange-player_1.0.0_all.ipk
```

Or via the package.json helper:

```bash
bun run install     # runs: ares-install --device tv orange-player_1.0.0_all.ipk
```

### From the GUI (webOS IDE)

If you installed the LG webOS IDE (Eclipse-based), drag the `.ipk` onto the **Target Device** view → **Install**.

---

## 10. Launch on the TV

```bash
ares-launch --device tv com.orangeplayer.app
```

Or:

```bash
bun run launch      # runs: ares-launch --device tv com.orangeplayer.app
```

The app starts in fullscreen on the TV. The Next.js app loads inside the iframe and reacts to the Magic Remote via `app.js`.

### Live inspect (Chrome DevTools)

```bash
ares-inspect --device tv com.orangeplayer.app
# → opens a Chrome DevTools session connected to the running webOS app
```

Or:

```bash
bun run dev         # runs: ares-inspect --device tv com.orangeplayer.app
```

This is the equivalent of `chrome://inspect` for a remote webOS app — set breakpoints, profile, see console output, etc.

---

## 11. Magic Remote key map

`app.js` translates remote buttons into standard DOM `KeyboardEvent.key` values the web app already listens to:

| Magic Remote / Key | keyCode | Translated `e.key` |
| --- | --- | --- |
| OK | 13 | `Enter` |
| ▲ Up | 38 | `ArrowUp` |
| ▼ Down | 40 | `ArrowDown` |
| ◀ Left | 37 | `ArrowLeft` |
| ▶ Right | 39 | `ArrowRight` |
| Page Up / CH ▲ | 33 | `PageUp` |
| Page Down / CH ▼ | 34 | `PageDown` |
| Back | 461 | `Escape` |
| Exit | 10109 | `Escape` |
| Play | 415 | `Space` |
| Pause | 19 | `Space` |
| Stop | 413 | `Escape` |
| Rewind | 412 | `ArrowLeft` |
| Fast Forward | 417 | `ArrowRight` |

> Some Magic Remotes also send a **pointer** (mouse-style) event. The Next.js app's UI supports both spatial navigation (D-pad) and mouse hover, so the Magic Remote works either way without extra code.

---

## 12. Iterative development

### Live-reload without repackaging

You don't need to rebuild the `.ipk` for every Next.js change. Two options:

**Option 1 — Host the Next.js export on your dev machine and have the iframe point to it.**

Edit `platforms/webos/index.html`:

```html
<iframe src="http://192.168.0.50:3000/" …></iframe>
```

Then run `bun dev` (or `bun run start` after `bun run build`) on your dev machine. Reload the iframe on the TV with `ares-launch --device tv com.orangeplayer.app` (which re-opens the app fresh).

**Option 2 — Use the webOS emulator**. Re-package and `ares-install --device emulator <ipk>` after each change. The emulator boots in seconds.

### Hot reload

For shell-only changes (`app.js`, `styles.css`), use `ares-inspect` (see step 10) to live-edit the running app.

---

## 13. Submitting to the LG Content Store

Once the app works on a real TV:

1. Create a Seller account: <https://seller.lgappstv.com>.
2. Register a new app → upload the `.ipk` (LG re-signs it for store distribution).
3. Provide screenshots (1920×1080 PNG), icons, content rating, and a privacy policy URL.
4. Pass the LG review (typically 3–7 business days).

> Distributor / store submissions require passing LG's **App Test**: launch time under 5 s, no crashes on Home/Back key sequences, supports 4K (if declared), respects the safe-area margin, etc. The shell's `defaultWindowType: "fullscreen"` + `handles4KResolution: true` covers most of these.

---

## 14. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ares-install` → `FAILED: connection refused` | TV not in Developer Mode, wrong port (must be 9922), or TV reboot needed. Re-enable Developer Mode on the TV. |
| App launches to blank screen | `index-export.html` missing — copy `out/index.html` to `platforms/webos/index-export.html`. |
| Magic Remote keys do nothing | `app.js` not loaded — verify `<script src="app.js">` is in `index.html` after the iframe. |
| HTTP streams fail (mixed content) | webOS blocks mixed content by default; allow it via `appinfo.json`'s `requiredPermissions` + the TV's Web App Manager policy. For HTTP HLS streams, ensure the app is loaded from a `file://` origin (it is, by default) — mixed-content rules don't apply to `file://` origins in WAM. |
| `ares-package` errors on `appinfo.json` | JSON syntax error — validate with `cat appinfo.json \| jq .`. |
| `ares-launch` says app not installed | Check `ares-install --device tv -l` (list). Confirm the id `com.orangeplayer.app` matches `appinfo.json`. |
| `e.key` is not translated | Some webOS versions make `e.key` read-only. Use the cross-iframe dispatch pattern from the Tizen README — dispatch a synthetic `KeyboardEvent` on `iframe.contentWindow.document` with the translated key. |
| App launched but TV home screen keeps focus | Use `defaultWindowType: "fullscreen"` (already set). If ` "minimal"` or `card"`, the WAM may keep the home overlay visible. |

---

## 15. CI / packaging pipeline (optional)

```yaml
# .github/workflows/webos.yml
- name: Build Next.js export
  run: |
    NEXT_PUBLIC_TARGET=tv bun install
    NEXT_PUBLIC_TARGET=tv bun run build

- name: Stage export into webOS project
  run: |
    cp -r out/. platforms/webos/
    mv platforms/webos/index.html platforms/webos/index-export.html

- name: Install ares-cli
  run: npm install -g @webos-tools/cli

- name: Package IPK
  run: |
    cd platforms/webos
    ares-package .

- uses: actions/upload-artifact@v3
  with:
    name: orange-player-webos-ipk
    path: platforms/webos/orange-player_1.0.0_all.ipk
```

---

**Source of truth:** `/home/z/my-project/platforms/webos/`
**Next.js export:** `/home/z/my-project/out/` (after `bun run build` with `output: 'export'`)
