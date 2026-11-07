import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeavyCare - Gestion de Maintenance",
  description:
    "Plateforme de gestion de maintenance et suivi pour engins lourds",
  icons: {
    icon: "/logo.svg",
  },
};

// Desktop bridge shim: recreates window.desktop.{db,auth} exactly as the
// Electron preload.js did, on top of the Tauri invoke API. The renderer keeps
// using utils/supabase.ts unchanged. In a normal browser (dev on localhost)
// __TAURI__ is absent and nothing is exposed — same as web.
const DESKTOP_SHIM = `
(function () {
  if (typeof window === "undefined") return;
  // Tauri v2 exposes the API as window.__TAURI__.{core,event,...}: invoke lives
  // at __TAURI__.core.invoke (v1/alpha used other shapes). Resolve it from every
  // known location so a CLI bump cannot silently kill the bridge again.
  var t = window.__TAURI__ || {};
  var core = t.core || {};
  var legacy = t.ipc || {};
  var internals = window.__TAURI_INTERNALS__ || {};
  var invoke = core.invoke || legacy.invoke || t.invoke || internals.invoke;
  if (typeof invoke !== "function") return;
  var listen = t.event && t.event.listen;

  function on(event, handler) {
    if (typeof listen !== "function") return function () {};
    var p = listen(event, handler);
    return function () { if (p && p.then) p.then(function (u) { u(); }); };
  }

  window.desktop = {
    isDesktop: true,
    platform: "tauri",
    versions: {},
    db: {
      query: function (req) { return invoke("db_query", { req: req }); },
      syncStatus: function () { return invoke("db_sync_status"); },
      syncNow: function () { return invoke("db_sync_now"); },
      onSyncApplied: function (cb) {
        return on("db:synced", function (e) { cb(e.payload); });
      }
    },
    auth: {
      getSession: function () { return invoke("auth_get_session"); },
      signIn: function (email, password) {
        return invoke("auth_sign_in", { email: email, password: password });
      },
      signInWithGoogle: function () { return invoke("auth_sign_in_google"); },
      signUp: function (email, password) {
        return invoke("auth_sign_up", { email: email, password: password });
      },
      signOut: function () { return invoke("auth_sign_out"); },
      updatePassword: function (password) {
        return invoke("auth_update_password", { password: password });
      },
      onAuthChanged: function (cb) {
        return on("auth:changed", function (e) {
          var d = e.payload || {};
          cb(d.event, d.session);
        });
      }
    },
    invoke: function (channel, payload) { return invoke(channel, payload); }
  };
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="theme-default-light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: DESKTOP_SHIM }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
