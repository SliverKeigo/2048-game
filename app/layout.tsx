import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const mapleMono = localFont({
  src: "../MapleMono-NF-CN-Regular.ttf",
  variable: "--font-maple-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "2048 - Number Fusion",
  description: "A smoother 2048 experience with improved UI, UX and tactile feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${mapleMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
