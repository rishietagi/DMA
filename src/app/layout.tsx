import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/shell/app-shell";
import { TourProvider } from "@/components/tour/tour-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Himalaya · FY26 Digital Maturity Assessment",
  description: "AI-enabled DMA workbench — proof of concept with simulated AI and illustrative data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <AppProviders>
          <TourProvider>
            <AppShell>{children}</AppShell>
          </TourProvider>
        </AppProviders>
      </body>
    </html>
  );
}
