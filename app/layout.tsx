import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Wordgrid",
  description: "A deterministic 5×5 Boggle × Wordle mashup with Supabase-powered leaderboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
