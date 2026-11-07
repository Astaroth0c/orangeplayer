# ORANGE Player — Linux Desktop (Tauri 2.0)

This folder contains the **Tauri 2.0** wrapper that packages the ORANGE Player Next.js web app as a native **Linux desktop application** — distributed as an **AppImage** (single-file portable) and a **`.deb`** package (Debian/Ubuntu).

Tauri on Linux uses the system **WebKitGTK** (`libwebkit2gtk-4.1`) as its WebView — there is no bundled Chromium, keeping the download under 10 MB.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Rust** | 1.75+ | Install via https://rustup.rs — `rustup default stable` |
| **Node.js** | 18+ (or Bun) | Used to build the Next.js static export |
| **WebKitGTK** | 4.1 | The WebView engine — `libwebkit2gtk-4.1-dev` |
| **GTK 3** | 3.24+ | Window toolkit — `libgtk-3-dev` |
| **libayatana-appindicator3** | any | Optional, for tray icons — `libayatana-appindicator3-dev` |
| **librsvg2** | any | SVG icon loading — `librsvg2-dev` |
| **pkg-config**, **build-essential**, **file** | any | General build tooling |

### 1.1 Ubuntu / Debian / Pop!_OS / Mint

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  build-essential \
  pkg-config \
  file \
  curl \
  wget
```

> ⚠️ **Note on `libwebkit2gtk-4.0` vs `4.1`.** Tauri 2.0 requires `4.1`.
> Ubuntu 22.04 LTS (Jammy) ships it in the default repos. Ubuntu 20.04 only has `4.0`;
> you must upgrade to 22.04+ or build WebKitGTK 4.1 from source.

### 1.2 Fedora / RHEL / CentOS Stream

```bash
sudo dnf install -y \
  webkit2gtk4.1-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  gcc \
  pkg-config \
  file
```

### 1.3 Arch / Manjaro / EndeavourOS

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  gtk3 \
  libappindicator \
  librsvg \
  base-devel \
  pkgconf
```

### 1.4 openSUSE

```bash
sudo zypper install -y \
  webkit2gtk3-soup2-devel \
  gtk3-devel \
  libappindicator3-devel \
  librsvg-devel \
  gcc \
  pkg-config
```

Verify:
```bash
rustc --version
cargo --version
pkg-config --exists webkit2gtk-4.1 && echo "WebKitGTK 4.1 OK"
pkg-config --exists gtk+-3.0      && echo "GTK 3 OK"
```

---

## 2. Install the Tauri CLI

```bash
# Option A — cargo (recommended)
cargo install tauri-cli --version "^2.0"

# Option B — npm (this folder's package.json)
npm install
# or: bun install
```

---

## 3. Project layout

```
platforms/linux/
├── README.md
├── package.json
└── src-tauri/
    ├── tauri.conf.json
    ├── Cargo.toml
    ├── build.rs
    ├── capabilities/
    │   └── default.json
    ├── icons/
    │   └── README.md
    └── src/
        ├── lib.rs
        └── main.rs
```

The Next.js web app itself lives at `/home/z/my-project/` (the repo root). Tauri points `frontendDist` at `../../out` — the static export of the Next.js app.

---

## 4. Configuring the Next.js app for desktop packaging

The Next.js app can run in two modes:

### 4.1 Dev mode (hot-reload)

Tauri launches the Next dev server and points its WebView at `http://localhost:3000`. The relevant settings in `src-tauri/tauri.conf.json`:

```jsonc
{
  "build": {
    "beforeDevCommand": "cd ../.. && bun run dev",
    "devUrl": "http://localhost:3000"
  }
}
```

Run it with:
```bash
cargo tauri dev
# or: npm run dev
```

### 4.2 Production / packaging mode (static export)

For an installer the Next.js app must be **statically exported**. Edit the root `next.config.ts` so it supports both modes:

```ts
import type { NextConfig } from "next";

const isStaticExport = process.env.ORANGE_STATIC === "1";

const nextConfig: NextConfig = {
  // For desktop packaging we emit a fully static bundle into ./out
  output: isStaticExport ? "export" : "standalone",
  images: {
    // Next's image optimizer requires a server — disable for static export
    unoptimized: isStaticExport,
  },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
```

Then add a script to the **root** `package.json`:

```jsonc
{
  "scripts": {
    "build:static": "ORANGE_STATIC=1 next build"
  }
}
```

`beforeBuildCommand` in `tauri.conf.json` already calls `cd ../.. && bun run build:static`, so once the script is registered `cargo tauri build` will produce the export automatically.

> 💡 On Linux the inline env-var form `ORANGE_STATIC=1 next build` works natively — no `cross-env` needed.

---

## 5. The Prisma / SQLite backend

The web app uses **Prisma + SQLite** server-side (see `src/app/api/**`). Tauri's WebView cannot run a Node.js HTTP server inside the binary, so for the desktop app you have **two options**:

### Option A — Local Node.js sidecar (offline-first)
Ship a small Node.js process alongside the Rust binary that serves the API on `http://127.0.0.1:43100`. Tauri's `shell` plugin spawns it on startup:

```rust
// In src-tauri/src/lib.rs setup()
use tauri_plugin_shell::ShellExt;

let _sidecar = app
    .shell()
    .command("api-server")
    .spawn()
    .expect("failed to spawn API sidecar");
```

Add to `tauri.conf.json`:
```jsonc
"bundle": {
  "externalBin": ["binaries/api-server"]
}
```

…and grant `shell:allow-execute` in `capabilities/default.json`.

> For Linux AppImages you must compile the sidecar for `x86_64-unknown-linux-gnu` and name it `api-server-x86_64-unknown-linux-gnu`. The `externalBin` entry automatically appends the target triple.

### Option B — Remote hosted instance
Point the desktop app at your production deployment. Add an env var (e.g. `NEXT_PUBLIC_API_URL`) and have the web app read it. No sidecar needed — Tauri just wraps the static export.

> See `src-tauri/src/lib.rs` for the placeholder `setup()` hook where the sidecar should be spawned.

---

## 6. Building the AppImage & .deb

### 6.1 Generate icons (one-off)

```bash
# from the project root
cargo tauri icon public/logo.svg
```

This creates `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png` in `platforms/linux/src-tauri/icons/`.

### 6.2 Build the bundles

```bash
cd platforms/linux
npm run build
# equivalent to: cargo tauri build
```

Output locations:

| Target | Path |
| --- | --- |
| Raw binary | `src-tauri/target/release/orange-player` |
| **AppImage** | `src-tauri/target/release/bundle/appimage/ORANGE-Player_1.0.0_amd64.AppImage` |
| **.deb** | `src-tauri/target/release/bundle/deb/orange-player_1.0.0_amd64.deb` |

For a fast debug build:
```bash
npm run build:debug
# equivalent to: cargo tauri build --debug
```

---

## 7. Running & installing the artifacts

### 7.1 Run the AppImage

AppImages are single-file executables — download, make executable, run:

```bash
chmod +x ORANGE-Player_1.0.0_amd64.AppImage
./ORANGE-Player_1.0.0_amd64.AppImage
```

To integrate with the system menu (so it appears in your launcher), install **AppImageLauncher** or use **AppImageDaemon**:

```bash
sudo add-apt-repository ppa:appimagelauncher-team/stable
sudo apt update
sudo apt install appimagelauncher
# then double-click any .AppImage in your file manager
```

### 7.2 Install the .deb

```bash
sudo dpkg -i orange-player_1.0.0_amd64.deb

# if it complains about missing dependencies:
sudo apt --fix-broken install
```

The `.deb` declares its dependencies (`libwebkit2gtk-4.1-0`, `libgtk-3-0`) in `tauri.conf.json > bundle.linux.deb.depends`, so `apt` will pull them automatically on first install.

Uninstall with:
```bash
sudo apt remove orange-player
```

### 7.3 (Optional) Build RPM / Flatpak

Tauri also supports `rpm` and (via community plugins) Flatpak. Add to `tauri.conf.json`:

```jsonc
"bundle": {
  "targets": ["appimage", "deb", "rpm"]
}
```

For Flatpak, see https://v2.tauri.app/distribute/flatpak/.

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `error: failed to run custom build command for webkit2gtk-sys` | The `libwebkit2gtk-4.1-dev` (or `-devel`) package is missing — see §1. |
| AppImage fails with `dlopen(): error loading libwebkit2gtk-4.1.so.0` | The target system lacks WebKitGTK. Either install it (`apt install libwebkit2gtk-4.1-0`) or include it via AppImage's `--bundle-libraries`. |
| Blank window in dev | The Next dev server isn't up yet — check `http://localhost:3000` in a browser first. |
| `output: 'export'` build fails on a dynamic API route | Mark dynamic routes with `export const dynamic = "force-static"` or remove them — export mode forbids runtime server code. |
| Tray icon missing on GNOME | GNOME requires the **AppIndicator** extension — install `gnome-shell-extension-appindicator`. |
| `libayatana-appindicator3-dev` not found on Ubuntu 22.04 | Use `libayatana-appindicator3-1` runtime or build without the tray feature (remove `tauri-plugin-system-tray` if added). |
| Wayland rendering glitches | Run with `GDK_BACKEND=x11 ./ORANGE-Player_1.0.0_amd64.AppImage` until upstream GTK fixes land. |

---

## 9. Useful commands cheat-sheet

```bash
cargo tauri dev                       # full hot-reload dev
cargo tauri build                      # release AppImage + .deb
cargo tauri build --target x86_64-unknown-linux-gnu
cargo tauri build -- --bundles appimage   # only the AppImage
cargo tauri build -- --bundles deb       # only the .deb
cargo tauri icon ../../../../public/logo.svg
cargo tauri info                       # show environment + versions
```

---

Built with Tauri 2.0 — https://v2.tauri.app
