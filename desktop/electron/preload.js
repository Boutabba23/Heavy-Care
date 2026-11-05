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
  },

  // ---- Auth (local, offline) ----
  auth: {
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    signIn: (email, password) => ipcRenderer.invoke("auth:sign-in", { email, password }),
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
