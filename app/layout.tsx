import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FORD VISION — Retenção Inteligente",
  description:
    "Do veículo ao serviço. Plataforma preditiva de retenção Ford.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="pt-BR">
      <body className="bg-black text-white min-h-screen scanline">
        <meta name="csp-nonce" content={nonce} />
        {children}
      </body>
    </html>
  );
}
