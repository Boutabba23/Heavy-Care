import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GestiFiltres - Gestionnaire de Filtres",
  description:
    "Système de gestion de filtres pour maintenance de machines lourdes",
  icons: {
    icon: "/favicon.ico",
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
