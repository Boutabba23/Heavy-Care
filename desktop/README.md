# HeavyCare Desktop (Electron)

Offline desktop version of the HeavyCare maintenance app. The UI runs inside
Electron, data is stored in a **local SQLite** database, and changes are
**synced to Supabase** in the background when the internet is available.

## Structure

```
desktop/
  electron/
    main.js        # App lifecycle, IPC, built-in offline static server
    database.js    # SQLite (sql.js WASM): schema, CRUD, sync journal, local auth
    sync.js        # Push/pull sync engine between SQLite and Supabase
    preload.js     # contextBridge - exposes window.desktop to the UI
  renderer/        # The Next.js UI (copy of the web app)
    utils/supabase.ts  # supabase-compatible shim -> local SQLite / local auth
    next.config.js     # output: "export" -> static build in renderer/out/
  package.json     # Electron shell + electron-builder config
  dev.js           # dev launcher (next dev + electron together)
  supabase-config.example.json  # template to enable sync
  icon.png         # app icon
  release/         # installer output (electron-builder)
```

## Commands

```bash
npm install           # Electron shell deps (first time: also run renderer:install)
npm run dev           # Dev with hot reload (next dev :5555 + electron)
npm start             # Run the built offline version (needs renderer:build once)
npm run dist          # Build the Windows installer -> release/HeavyCare Setup 1.0.0.exe
```

First run checklist:

```bash
npm install
npm run renderer:install
npm run dev    # or: npm run renderer:build && npm start
```

## Offline storage

- Data lives in `%APPDATA%/heavy-care-desktop/heavycare.db` (SQLite).
- Every write is journaled into `_sync_queue` for later push to Supabase.
- Login is **local** (accounts in SQLite, scrypt-hashed passwords). Sessions
  survive restarts.
- Oil stocks are seeded with the app defaults on first launch.

## Sync with Supabase

To enable, copy the template and fill it in:

```
cp supabase-config.example.json supabase-config.json
# { "url": "https://YOUR-PROJECT.supabase.co", "anonKey": "ey..." }
```

- Sync runs automatically every 10 minutes (first attempt 8s after launch)
  and can be triggered manually from the header indicator
  ("Synchroniser maintenant").
- Merge strategy: **last-write-wins** by `updated_at`.
- Deletions are detected by comparing the full remote id list per table;
  locally-queued changes are never lost.
- Status is visible in the header pill:
  "Hors ligne (local)" / "N modifs. en attente" / "Synchronisé".

## Notes

- The Supabase URL/anon key are only used by the main process for sync; no
  credentials are baked into the UI build.
- Google OAuth is not available offline — login is email + password.
- The `Planning suivi mensuel.xlsx` file and dev-only artifacts are not copied
  into the renderer.
