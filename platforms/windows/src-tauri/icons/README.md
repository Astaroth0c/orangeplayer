# Tauri Icons

Generate these icons from a 1024×1024 PNG source using `cargo tauri icon path/to/icon.png`:

- `icon.ico` — Windows icon (multi-resolution)
- `icon.png` — 32×32 PNG
- `32x32.png` — 32×32 PNG
- `128x128.png` — 128×128 PNG
- `128x128@2x.png` — 256×256 PNG
- `Square*.png` — Windows Store icons (various sizes)
- `StoreLogo.png` — 50×50 store logo

The icon should be the ORANGE Player hex logo (orange hexagon on dark background).

## Regenerate from the project logo

From the repository root:

```bash
# Windows
cargo tauri icon public\logo.svg

# macOS / Linux (when cross-compiling)
cargo tauri icon public/logo.svg
```

This will create all the required files above in this `icons/` directory.

> Tauri 2.0 requires at minimum `icon.ico` and `icon.png` for the Windows bundle
> (see `tauri.conf.json > bundle.icon`). Without them, `cargo tauri build` will fail.
