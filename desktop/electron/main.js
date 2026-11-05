// Electron main process for Heavy-Care Desktop
const { app, BrowserWindow, shell, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const dbm = require("./database");
const sync = require("./sync");
const supabaseAuth = require("./auth");

// In dev, set ELECTRON_RENDERER_URL (e.g. http://localhost:5555) to load the
// Next.js dev server instead of the static export.
const isDev = !!process.env.ELECTRON_RENDERER_URL;

const STATIC_PORT = 48620;
const DESKTOP_DIR = path.join(__dirname, "..");
// Icon always available for windows/taskbar (packaged via build.files -> app root)
const APP_ICON = path.join(__dirname, "..", "icon.png");

let mainWindow = null;
let staticServer = null;
let oauthPopup = null;
let callbackServer = null;
let pendingVerifier = null; // PKCE code_verifier for the OAuth flow in progress

// ---------------------------------------------------------------------------
// Tiny static file server to serve the exported Next.js app (renderer/out/)
// over localhost so absolute asset paths (/_next/...) resolve correctly while
// staying fully offline.
// ---------------------------------------------------------------------------
function createStaticServer(rootDir, port) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
    ".wasm": "application/wasm",
  };

  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const pathname = decodeURIComponent(url.pathname);

      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
      let filePath = path.join(rootDir, safePath);

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }

      if (pathname === "/" || !fs.existsSync(filePath)) {
        filePath = path.join(rootDir, "index.html");
      }

      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  return server;
}

function startStaticServer(rootDir, port) {
  return new Promise((resolve, reject) => {
    const server = createStaticServer(rootDir, port);
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

// ---------------------------------------------------------------------------
// Auth session state (local accounts; persisted so login survives restarts)
// ---------------------------------------------------------------------------
let currentSession = null;
let sessionFile = null;
const authListeners = new Set();

function loadSession() {
  try {
    const raw = JSON.parse(fs.readFileSync(sessionFile, "utf8"));
    if (raw && raw.user) currentSession = raw;
  } catch {
    currentSession = null;
  }
}

function saveSession() {
  if (currentSession) {
    fs.writeFileSync(sessionFile, JSON.stringify(currentSession));
  } else if (fs.existsSync(sessionFile)) {
    fs.unlinkSync(sessionFile);
  }
}

function buildSession(user) {
  return {
    access_token: "local-" + user.id,
    user: { id: user.id, email: user.email, app_metadata: { provider: "local" } },
  };
}

function emitAuthEvent(event) {
  authListeners.forEach((cb) => {
    try {
      cb(event, currentSession);
    } catch (e) {
      console.error("auth listener error", e);
    }
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("auth:changed", { event, session: currentSession });
  }
}

// ---------------------------------------------------------------------------
// Local OAuth callback server: Google redirects to
//   http://127.0.0.1:48621/auth/callback?code=...
// We capture the code server-side and close the popup window.
// ---------------------------------------------------------------------------
function startCallbackServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        const error =
          url.searchParams.get("error_description") ||
          url.searchParams.get("error");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#0f172a}</style></head><body>${
            error
              ? "<p>Connexion échouée : " + error + ". Vous pouvez fermer cette fenêtre.</p>"
              : "<p>Connexion réussie. Vous pouvez fermer cette fenêtre…</p>"
          }<script>setTimeout(()=>window.close(),800)</script></body></html>`
        );
        if (code && pendingVerifier) {
          const verifier = pendingVerifier;
          pendingVerifier = null;
          supabaseAuth
            .exchangeCode(code, verifier)
            .then(() => console.log("Supabase session established (OAuth)."))
            .catch((err) => console.error("OAuth exchange failed:", err.message));
        } else if (error) {
          console.error("OAuth error from provider:", error);
        }
        return;
      }
      res.writeHead(404);
      res.end("Not found");
    });
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function openOAuthPopup(authorizeUrl) {
  if (oauthPopup && !oauthPopup.isDestroyed()) oauthPopup.destroy();
  oauthPopup = new BrowserWindow({
    width: 480,
    height: 640,
    parent: mainWindow,
    title: "Connexion Google",
    autoHideMenuBar: true,
    icon: APP_ICON,
  });
  oauthPopup.loadURL(authorizeUrl);
  oauthPopup.on("closed", () => {
    oauthPopup = null;
  });
}

// ---------------------------------------------------------------------------
// IPC handlers — mirror the subset of supabase-js the renderer uses
// ---------------------------------------------------------------------------
function registerIpc() {
  ipcMain.handle("db:query", (_evt, req) => {
    try {
      return dbm.handleQuery(req);
    } catch (err) {
      console.error("db:query failed:", err);
      return { data: null, error: { message: err.message } };
    }
  });

  ipcMain.handle("db:sync-status", () => {
    const pending = dbm.queryAll("_sync_queue", "status = 'pending'").length;
    return { configured: sync.isConfigured(), pending, lastSync: sync.getLastSyncISO() };
  });

  ipcMain.handle("db:sync-now", async () => {
    return sync.runSync();
  });

  // ---- Auth ----
  // Active session = Supabase session (preferred, gives sync credentials)
  // falling back to the local offline session.
  const getActiveSession = () => supabaseAuth.buildPublicShape() || currentSession;

  ipcMain.handle("auth:get-session", () => ({
    data: { session: getActiveSession() },
  }));

  ipcMain.handle("auth:sign-in", async (_evt, { email, password }) => {
    // 1. Try Supabase first (also gives the sync engine its JWT)
    if (sync.isConfigured()) {
      try {
        await supabaseAuth.signInWithPassword(email, password);
        return { error: null };
      } catch (err) {
        const networkDown = /ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|fetch failed|network/i.test(
          err.message
        );
        if (!networkDown) {
          return { error: { message: err.message } };
        }
        // fall through to local offline accounts
      }
    }
    // 2. Local offline fallback
    const user = dbm.verifyUser(email, password);
    if (!user) {
      return { error: { message: "Email ou mot de passe incorrect." } };
    }
    currentSession = buildSession(user);
    saveSession();
    emitAuthEvent("SIGNED_IN");
    return { error: null };
  });

  ipcMain.handle("auth:sign-in-google", async () => {
    try {
      const { url, verifier } = supabaseAuth.buildAuthorizeUrl("google");
      pendingVerifier = verifier;
      openOAuthPopup(url);
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  });

  ipcMain.handle("auth:sign-up", (_evt, { email, password }) => {
    if (!email || !password || password.length < 6) {
      return { error: { message: "Mot de passe trop court (6 caractères minimum)." } };
    }
    if (userExists(email)) {
      return { error: { message: "Un compte existe déjà avec cet email." } };
    }
    try {
      const user = dbm.createUser(email, password);
      currentSession = buildSession(user);
      saveSession();
      emitAuthEvent("SIGNED_IN");
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  });

  function userExists(email) {
    return !!dbm.queryOne(
      "_users",
      "email = ?",
      [String(email).toLowerCase()]
    );
  }

  ipcMain.handle("auth:sign-out", async () => {
    currentSession = null;
    saveSession();
    await supabaseAuth.signOut();
    emitAuthEvent("SIGNED_OUT");
    return { error: null };
  });

  ipcMain.handle("auth:update-password", (_evt, { password }) => {
    if (!getActiveSession()) return { error: { message: "Non connecté." } };
    // With a Supabase session we could update remotely; keep local for offline
    if (currentSession) dbm.updatePassword(currentSession.user.id, password);
    return { error: null };
  });
}

// ---------------------------------------------------------------------------
function getOutDir() {
  // Works both when running from the desktop/ folder (dev) and when packaged:
  // <desktop>/electron/main.js -> <desktop>/renderer/out
  return path.join(__dirname, "..", "renderer", "out");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#f8fafc",
    title: "HeavyCare",
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // External links open in the system browser, never inside the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${STATIC_PORT}/`);
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.heavycare.desktop");

  const userDataDir = app.getPath("userData");
  sessionFile = path.join(userDataDir, "session.json");

  await dbm.init(userDataDir);
  loadSession();
  registerIpc();

  sync.loadConfig(DESKTOP_DIR, userDataDir);
  sync.setTokenProvider?.(supabaseAuth.getValidToken);

  supabaseAuth.init(sync.getSupabaseConfig(), userDataDir);
  supabaseAuth.onChange((event, session) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auth:changed", { event, session });
    }
  });

  // When a sync pulls changes into SQLite, tell the UI to re-fetch
  sync.setSyncAppliedCallback(({ rowsApplied }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("db:synced", { rowsApplied });
    }
  });

  startCallbackServer(supabaseAuth.CALLBACK_PORT).catch((err) =>
    console.error("OAuth callback server failed:", err.message)
  );

  sync.startSyncLoop(DESKTOP_DIR, userDataDir, 10 * 60 * 1000);

  if (!isDev) {
    const outDir = getOutDir();
    if (!fs.existsSync(path.join(outDir, "index.html"))) {
      console.error(
        `Static build not found at: ${outDir}\n` +
          `Run "npm run renderer:build" inside the desktop folder first.`
      );
      app.quit();
      return;
    }
    staticServer = await startStaticServer(outDir, STATIC_PORT);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  dbm.doPersist();
  if (staticServer) staticServer.close();
  if (process.platform !== "darwin") app.quit();
});
