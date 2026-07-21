import type { Metadata, Viewport } from "next";
import { Literata, Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

const display = Literata({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mealplan",
    template: "%s · Mealplan",
  },
  description: "Shared household meal planning, recipes, and grocery lists.",
  applicationName: "Mealplan",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mealplan",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2f6b4f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-center" closeButton />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
