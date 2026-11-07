import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

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
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ORANGE Player",
    description: "Entre no seu universo. Filmes, séries, canais e entretenimento.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#101419",
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
            <Toaster />
            <SonnerToaster position="top-center" theme="dark" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
