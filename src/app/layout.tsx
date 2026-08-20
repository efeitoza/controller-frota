import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessaoProvider } from "@/components/SessaoProvider";

export const metadata: Metadata = {
  title: "Controller — Gestão de Frota",
  description: "Controle de jornada, abastecimento, manutenção e despesas de veículos e motos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Controller", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#1d3cd8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessaoProvider>{children}</SessaoProvider>
      </body>
    </html>
  );
}
