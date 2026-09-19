import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValkyDownload – Descargador de YouTube y TikTok",
  description: "Descarga videos de YouTube y TikTok en MP4 o MP3 con 3 opciones de calidad.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
