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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="theme-default-light">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
