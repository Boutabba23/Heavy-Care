// Preload script: secure bridge between the renderer (UI) and the Electron main
// process. Exposes a supabase-shaped database + auth API over IPC.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
  },

  // ---- Database ----
  db: {
    query: (req) => ipcRenderer.invoke("db:query", req),
    syncStatus: () => ipcRenderer.invoke("db:sync-status"),
    syncNow: () => ipcRenderer.invoke("db:sync-now"),
    onSyncApplied: (cb) => {
      const handler = (_evt, payload) => cb(payload);
      ipcRenderer.on("db:synced", handler);
      return () => ipcRenderer.removeListener("db:synced", handler);
    },
  },

  // ---- Auth (Supabase OAuth/email + local offline fallback) ----
  auth: {
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    signIn: (email, password) => ipcRenderer.invoke("auth:sign-in", { email, password }),
    signInWithGoogle: () => ipcRenderer.invoke("auth:sign-in-google"),
    signUp: (email, password) => ipcRenderer.invoke("auth:sign-up", { email, password }),
    signOut: () => ipcRenderer.invoke("auth:sign-out"),
    updatePassword: (password) => ipcRenderer.invoke("auth:update-password", { password }),
    onAuthChanged: (cb) => {
      const handler = (_evt, { event, session }) => cb(event, session);
      ipcRenderer.on("auth:changed", handler);
      return () => ipcRenderer.removeListener("auth:changed", handler);
    },
  },

  // Legacy generic invoke (kept for diagnostics)
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
});
