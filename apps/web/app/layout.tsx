import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BrewLite — Thực đơn đồ uống",
    template: "%s · BrewLite",
  },
  description:
    "Đặt đồ uống BrewLite: trà sữa, matcha, cà phê, trà trái cây. Chọn size, topping và nhận món nhanh.",
  applicationName: "BrewLite",
  appleWebApp: {
    capable: true,
    title: "BrewLite",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#365d49",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
