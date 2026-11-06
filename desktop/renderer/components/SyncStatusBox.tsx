"use client";

import React from "react";
import SyncIndicator from "./SyncIndicator";

/**
 * Desktop mirror of SyncStatusBox — mounts the Electron sync indicator
 * (needs the window.desktop bridge). The web copy of this file renders null.
 */
const SyncStatusBox: React.FC = () => {
  if (typeof window === "undefined") return null;
  if (!(window as any).desktop) return null;
  return <SyncIndicator />;
};

export default SyncStatusBox;
