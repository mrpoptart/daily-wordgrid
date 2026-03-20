import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Wordgrid",
  description:
    "A deterministic 5×5 Boggle × Wordle mashup with Supabase-powered leaderboards.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Daily Wordgrid",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
      </head>
      <body className="antialiased">
        <ServiceWorkerRegistrar />
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
