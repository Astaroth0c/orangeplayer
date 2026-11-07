# ORANGE Player — Windows Desktop (Tauri 2.0)

This folder contains the **Tauri 2.0** wrapper that packages the ORANGE Player Next.js web app as a native **Windows desktop application** (`.exe` / `.msi` installer).

Tauri uses the native **Microsoft WebView2 Runtime** (preinstalled on Windows 11, and downloadable as a bootstrapper on Windows 10) instead of bundling Chromium — producing installers around **3–10 MB** instead of the 100+ MB typical of Electron.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| **Rust** | 1.75+ | Install via https://rustup.rs — run `rustup default stable` and `rustup target add x86_64-pc-windows-msvc` |
| **Node.js** | 18+ (or Bun) | The web app uses Bun for dev/build; Node 18+ is the minimum for the Tauri toolchain |
| **Microsoft C++ Build Tools** | MSVC v143 | Required by `rustc` to link on Windows. Install "Desktop development with C++" workload from Visual Studio Installer |
| **Microsoft WebView2 Runtime** | Evergreen | Preinstalled on Windows 11. On Windows 10 it is downloaded automatically via `webviewInstallMode.downloadBootstrapper` (see `tauri.conf.json`) |

Verify:
```powershell
rustc --version    # >= 1.75.0
cargo --version
node --version     # >= 18
bun --version      # optional, but the scripts below use `bun run`
```

---

## 2. Install the Tauri CLI

```powershell
# Option A — cargo (recommended for reproducible builds)
cargo install tauri-cli --version "^2.0"

# Option B — npm (used by the package.json scripts in this folder)
npm install
# or: bun install
```

This template has already been initialised with `npm create tauri-app@latest`; you only need the steps below to build.

---

## 3. Project layout

```
platforms/windows/
├── README.md                 ← you are here
├── package.json              ← npm scripts that wrap cargo tauri
└── src-tauri/                ← the Rust binary crate
    ├── tauri.conf.json        ← Tauri 2.0 config (window, bundle, security)
    ├── Cargo.toml             ← Rust manifest
    ├── build.rs               ← tauri_build hook
    ├── capabilities/
    │   └── default.json       ← Tauri 2 permission capabilities
    ├── icons/
    │   └── README.md         ← how to regenerate icons
    └── src/
        ├── lib.rs            ← builder + plugins + setup
        └── main.rs           ← windows_subsystem entrypoint
```

The Next.js web app itself lives in `/home/z/my-project/` (the repository root). The Tauri config points at `frontendDist: "../../out"` — i.e. the **static export** of the Next.js app, which must be generated before `cargo tauri build`.

---

## 4. Configuring the Next.js app for desktop packaging

The Next.js app currently runs in two modes:

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
```powershell
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

> ⚠️ On Windows PowerShell, set the env var inline like:
> `set ORANGE_STATIC=1 && next build`
> or use `cross-env` in `package.json`: `"build:static": "cross-env ORANGE_STATIC=1 next build"`.

`beforeBuildCommand` in `tauri.conf.json` already calls `cd ../.. && bun run build:static`, so once the script is registered `cargo tauri build` will produce the export automatically.

---

## 5. The Prisma / SQLite backend

The web app uses **Prisma + SQLite** server-side (see `src/app/api/**`). Tauri's WebView cannot run a Node.js HTTP server inside the binary, so for the desktop app you have **two options**:

### Option A — Local Node.js sidecar (offline-first)
Ship a small Node.js process alongside the Rust binary that serves the API on `http://127.0.0.1:43100`. Tauri's `shell` plugin spawns it on startup:

```rust
// In src-tauri/src/lib.rs setup()
#[cfg(debug_assertions)]
let sidecar_cmd = "node ../../api-server.mjs";
#[cfg(not(debug_assertions))]
let sidecar_cmd = "api-server"; // bundled via `externalBin` in tauri.conf.json

let sidecar = app.shell().command(sidecar_cmd).spawn()?;
```

Add to `tauri.conf.json`:
```jsonc
"bundle": {
  "externalBin": ["api-server"]
}
```

…and list `tauri-plugin-shell` in `Cargo.toml` (already there).

### Option B — Remote hosted instance
Point the desktop app at your production deployment. Add an env var (e.g. `NEXT_PUBLIC_API_URL`) and have the web app read it. No sidecar needed — Tauri just wraps the static export.

> See `src-tauri/src/lib.rs` for the placeholder `setup()` hook where the sidecar should be spawned.

---

## 6. Building the installers

### 6.1 Generate the static export and icons (one-off)

```powershell
# from the project root
bun install
bun run build:static           # writes ./out

# from platforms/windows/src-tauri/icons
cargo tauri icon ../../../../public/logo.svg
```

### 6.2 Build `.msi` and `.exe` (NSIS) installers

```powershell
cd platforms/windows
npm run build
# equivalent to: cargo tauri build
```

Output locations:

| Target | Path |
| --- | --- |
| Raw `.exe` | `src-tauri/target/release/orange-player.exe` |
| **MSI installer** | `src-tauri/target/release/bundle/msi/ORANGE-Player_1.0.0_x64_en-US.msi` |
| **NSIS installer** | `src-tauri/target/release/bundle/nsis/ORANGE-Player_1.0.0_x64-setup.exe` |

For a fast debug build (unoptimised, includes DevTools):
```powershell
npm run build:debug
# equivalent to: cargo tauri build --debug
```

---

## 7. Code signing (Windows)

To avoid the "Unknown publisher" SmartScreen warning, sign the `.exe` / `.msi` with a code-signing certificate.

### 7.1 Acquire a certificate
- **Standard OV (Organisation Validation)**: DigiCert, Sectigo, SSL.com (~$200–400/yr). Still triggers SmartScreen for new signers until reputation builds.
- **EV (Extended Validation)**: hardware-token based (USB HSM). Bypasses SmartScreen immediately. ~$300–700/yr.

### 7.2 Configure Tauri signing
Add to `src-tauri/tauri.conf.json`:

```jsonc
"bundle": {
  "windows": {
    "certificateThumbprint": "<SHA1 thumbprint of cert in certmgr>",
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

…or use env vars (preferred for CI):
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\path\to\orange-player.pfx"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-password"
cargo tauri build
```

For NSIS installers (which Tauri also supports via `signtool`), the same cert is applied automatically to both the `.exe` and the installer.

### 7.3 (Optional) Submit to Microsoft for signing
Hardware-trusted signing can now be done via **Azure Trusted Signing** — Microsoft signs the binary for you (~$10/mo). See https://learn.microsoft.com/en-us/azure/trusted-signing/.

---

## 8. Embedding the local API server (sidecar)

When using **Option A** above:

1. Compile the Node API server with `bun build api-server.ts --compile --outfile api-server` (or use `pkg`).
2. Put the resulting binary at `platforms/windows/src-tauri/binaries/api-server-x86_64-pc-windows-msvc.exe`.
3. Add `"externalBin": ["binaries/api-server"]` to `tauri.conf.json`.
4. In `src/lib.rs` `setup()`, spawn it via `app.shell().command("api-server").spawn()`.
5. The web app talks to `http://127.0.0.1:43100` — set `NEXT_PUBLIC_API_URL` at build time.

See the `tauri-plugin-shell` docs: https://v2.tauri.app/plugin/shell/

---

## 9. Running & troubleshooting

| Symptom | Fix |
| --- | --- |
| `error: linker 'link.exe' not found` | Install the **MSVC v143** build tools and run from a "x64 Native Tools Command Prompt". |
| WebView2 missing | On Win10 pre-Novi 2021 builds, install the Evergreen Bootstrapper; the installer will auto-download it. |
| Blank white window in dev | The Next dev server isn't up yet — check `http://localhost:3000` in a browser first. |
| `output: 'export'` build fails on a dynamic API route | Mark dynamic routes with `export const dynamic = "force-static"` or remove them — the export mode forbids runtime server code. |
| CSP blocks HLS video | `media-src` already allows `http: https: blob:` — if your stream uses another scheme, extend `connect-src`. |

---

## 10. Useful commands cheat-sheet

```powershell
cargo tauri dev                  # full hot-reload dev
cargo tauri build                # release MSI + NSIS
cargo tauri build --target x86_64-pc-windows-msvc
cargo tauri icon ../../../../public/logo.svg
cargo tauri info                 # show environment + versions
```

---

Built with Tauri 2.0 — https://v2.tauri.app
