"use client";

import React from "react";

/**
 * Mount point for the desktop-only sync indicator in the Navbar.
 * On web there is no Electron bridge (window.desktop), so nothing renders —
 * the desktop mirror of this file renders <SyncIndicator /> instead.
 */
const SyncStatusBox: React.FC = () => {
  if (typeof window === "undefined") return null;
  if (!(window as any).desktop) return null;
  return null;
};

export default SyncStatusBox;
