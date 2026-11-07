import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PWARegister } from "@/components/providers/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORANGE Player — Multiplatform Entertainment",
  description:
    "ORANGE Player — plataforma de mídia com identidade Orange Glass, navegação inspirada no Aurora Dashboard e reprodução confiável.",
  keywords: [
    "ORANGE Player",
    "IPTV",
    "Media Player",
    "Aurora",
    "Orange Glass",
    "Xtream Codes",
    "M3U",
  ],
  authors: [{ name: "ORANGE Player" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "ORANGE Player",
    statusBarStyle: "black-translucent",
  },
  applicationName: "ORANGE Player",
  openGraph: {
    title: "ORANGE Player",
    description: "Entre no seu universo. Filmes, séries, canais e entretenimento.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF781F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
            <PWARegister />
            <Toaster />
            <SonnerToaster position="top-center" theme="dark" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
