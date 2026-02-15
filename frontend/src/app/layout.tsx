import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "twizzfinance",
  description: "Telegram-first money tracker with a Next.js dashboard.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "twizzfinance",
    description: "Telegram-first money tracker with a Next.js dashboard.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "twizzfinance",
    description: "Telegram-first money tracker with a Next.js dashboard.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
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
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
