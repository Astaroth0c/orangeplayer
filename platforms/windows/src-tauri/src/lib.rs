// ORANGE Player — Tauri backend (Windows)
// Custom commands can be added here (e.g., manage local DB, file system access)

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|_app| {
            // App setup: initialize local DB, spawn the API sidecar, etc.
            //
            // Example (Option A — local Node.js API sidecar):
            //
            //   use tauri_plugin_shell::ShellExt;
            //   let _sidecar = app
            //       .shell()
            //       .command("api-server")
            //       .spawn()
            //       .expect("failed to spawn API sidecar");
            //
            // Make sure `externalBin` is set in tauri.conf.json and that the
            // `shell:allow-execute` permission is granted in capabilities/default.json.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
