# Tauri Icons

Generate these icons from a 1024×1024 PNG source using `cargo tauri icon path/to/icon.png`:

- `icon.png` — 32×32 PNG (required by Linux bundles)
- `32x32.png` — 32×32 PNG
- `128x128.png` — 128×128 PNG
- `128x128@2x.png` — 256×256 PNG
- `icon.ico` — Windows icon (generated as a bonus; not used on Linux)

The icon should be the ORANGE Player hex logo (orange hexagon on dark background).

## Regenerate from the project logo

From the repository root:

```bash
cargo tauri icon public/logo.svg
```

This will create all the required files above in this `icons/` directory.

> Tauri 2.0 requires at minimum `icon.png` for the Linux `.deb` / AppImage bundle
> (see `tauri.conf.json > bundle.icon`). Without it, `cargo tauri build` will fail.
> The `.deb` package metadata pulls the icon automatically from the largest PNG here.
