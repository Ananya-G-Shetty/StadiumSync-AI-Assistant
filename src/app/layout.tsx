import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "StadiumSync AI - FIFA 2026 Accessibility Platform",
  description: "Intelligent, accessibility-first fan navigation, multilingual assistance, and wait times platform for the FIFA World Cup 2026 stadiums.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "StadiumSync AI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility!
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">
        <AccessibilityProvider>
          <AppShell>
            {children}
          </AppShell>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
