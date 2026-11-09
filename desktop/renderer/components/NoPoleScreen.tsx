"use client";

import React from "react";

// Shown to cloud users whose account has no pole assigned: the multi-pole
// model makes them invisible to business data (RLS), so block the app with
// a clear explanation instead of a silently broken experience.
const NoPoleScreen: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground px-6">
    <h1 className="text-2xl font-bold">Compte sans pôle</h1>
    <p className="mt-3 text-muted-foreground text-center max-w-md">
      Votre compte n&apos;est pas encore rattaché à un pôle. Contactez votre
      administrateur pour qu&apos;il vous attribue un pôle, puis
      reconnectez-vous.
    </p>
  </div>
);

export default NoPoleScreen;
