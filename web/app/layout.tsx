import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Noto_Sans_Bengali, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "600"], variable: "--font-bengali" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Field Shift — Crop Rotation Decisions from NASA Earth Data",
  description:
    "Field Shift turns NASA Earth observations (POWER, GPM IMERG, MERRA-2, SMAP, MODIS, GRACE) into explainable crop-rotation strategies for Bangladesh farms. Built for the NASA Space Apps Challenge.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Field Shift",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#166534" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${display.variable} ${body.variable} ${bengali.variable} ${mono.variable} bg-canvas text-ink-hi`}>
        <Shell>{children}</Shell>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.'))) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW register failed: ', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
