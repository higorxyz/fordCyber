import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "FORD VISION — Retenção Inteligente",
  description:
    "Do veículo ao serviço. Plataforma preditiva de retenção Ford.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-black text-white min-h-screen scanline">{children}</body>
    </html>
  );
}
