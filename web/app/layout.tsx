import type { Metadata } from "next";
import { Space_Grotesk, Inter, Noto_Sans_Bengali, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "600"], variable: "--font-bengali" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Field Shift — Crop Rotation Decisions from NASA Earth Data",
  description:
    "Field Shift turns NASA Earth observations into explainable crop-rotation strategies for farms. Built for the NASA Space Apps Challenge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${bengali.variable} ${mono.variable} bg-canvas text-ink-hi`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
