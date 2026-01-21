import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monadic DNA Batcher",
  description: "Privacy-preserving DNA testing batch coordination system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
