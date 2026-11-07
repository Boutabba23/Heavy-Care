# HeavyCare Desktop (Tauri)

Offline desktop version of the HeavyCare maintenance app. The UI runs in the OS
webview, the backend is **Rust (Tauri 2)**, data is stored in a **local SQLite**
database (bundled `rusqlite`, no external dependency), and changes are **synced
to Supabase** in the background when the internet is available.

## Structure

```
desktop/
  src-tauri/
    src/main.rs      # Entry point
    src/lib.rs       # App setup, IPC command registration, built-in assets
    src/db.rs        # SQLite: schema, CRUD, sync journal, local auth
    src/sync.rs      # Push/pull sync engine between SQLite and Supabase
    src/auth.rs      # Supabase auth + local session
    src/state.rs     # Local (offline) login state
    tauri.conf.json  # Window, bundle targets, version (single source of truth)
    icons/           # Generated icons (icon.png, icon.ico, ...)
  renderer/          # The Next.js UI (copy of the web app)
    utils/supabase.ts  # supabase-compatible shim -> IPC -> local SQLite / local auth
    next.config.js     # output: "export" -> static build in renderer/out/
  supabase-config.example.json  # Optional per-install sync override
  icon.png         # Source app icon
```

## Requirements

- Node.js 22+
- Rust stable (`rustup`) — `cargo` must be on `PATH`
- Windows: WebView2 (preinstalled on Windows 10/11)
- Linux (for Linux bundles): `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`,
  `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf`

## Commands

```bash
npm install            # Tauri CLI (first time: also run renderer:install)
npm run renderer:install
npm run dev            # Dev: Next.js dev server + Tauri window (hot reload)
npm run dist:win       # Windows installers -> src-tauri/target/release/bundle/{nsis,msi}
npm run dist:linux     # Linux packages  -> src-tauri/target/release/bundle/{deb,appimage}
```

`tauri build` packages the pre-built `renderer/out` as-is (`beforeBuildCommand`
is empty), so build the renderer first when the UI changed:

```bash
npm run renderer:build && npm run dist:win
```

Installers are written to `src-tauri/target/release/bundle/`. The same folder
also holds the standalone `heavy-care-desktop.exe` (no installer needed).

## Offline storage

- Data lives in `%APPDATA%\HeavyCare\heavycare.db` (Windows),
  `~/.config/HeavyCare/heavycare.db` (Linux), or
  `~/Library/Application Support/HeavyCare/heavycare.db` (macOS).
  This is the **same folder as the old Electron build**, so existing data carries
  over on upgrade.
- Every write is journaled for later push to Supabase.
- Login is **local** (accounts in SQLite, scrypt-hashed passwords). Sessions
  survive restarts.

## Sync with Supabase

Sync works **out of the box** — the release build embeds the project URL and
anon key, so regular users never touch a config file.

Configuration precedence in `sync.rs`:

1. `supabase-config.json` in the user data folder (per-install override)
2. Environment variables (`SUPABASE_URL` / `SUPABASE_ANON_KEY`, or the
   `NEXT_PUBLIC_` variants)
3. Built-in defaults baked into the release

To run against your own Supabase project, copy the template:

```
copy supabase-config.example.json %APPDATA%\HeavyCare\supabase-config.json
# { "url": "https://YOUR-PROJECT.supabase.co", "anonKey": "ey..." }
```

(On Linux/macOS put it in `~/.config/HeavyCare/` or
`~/Library/Application Support/HeavyCare/`.)

- Sync runs automatically every 10 minutes (first attempt 8s after launch)
  and can be triggered manually from the header indicator
  ("Synchroniser maintenant").
- Merge strategy: **last-write-wins** by `updated_at`.
- Deletions are detected by comparing the full remote id list per table;
  locally-queued changes are never lost.
- Status is visible in the header pill:
  "Hors ligne (local)" / "N modifs. en attente" / "Synchronisé".

## Notes

- The Supabase URL/anon key are only used by the Rust backend for sync; the
  anon key is public by design (row-level security protects the data) and no
  service-role key is ever shipped.
- Google OAuth is not available offline — login is email + password.
- The `Planning suivi mensuel.xlsx` file and dev-only artifacts are not copied
  into the renderer.
- Linux bundles must be built on Linux — use the
  "Build Linux desktop" GitHub Actions workflow (`.github/workflows/build-linux.yml`).
