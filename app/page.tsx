"use client";

import { AuthProvider } from "../contexts/AuthContext";
import AppContent from "../components/AppContent";

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
