import type { Metadata } from "next";
import { Titillium_Web } from "next/font/google";
import "./tokens.css";
import "./globals.css";

const titillium = Titillium_Web({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-titillium", display: "swap" });

export const metadata: Metadata = {
  title: { default: "[DEMO] Monitoraggio Gare e Contratti – INAPP", template: "[DEMO] %s – Monitoraggio Gare e Contratti INAPP" },
  description: "Prototipo dimostrativo per INAPP: monitoraggio, riprogrammazione e controllo finanziario",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/inapp-logo-white.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={titillium.variable}>
      <body>{children}</body>
    </html>
  );
}
