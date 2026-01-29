import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Monadic DNA Batcher",
  description: "Private, anonymous DNA Sequencing",
  keywords: [
    "DNA testing",
    "genetic sequencing",
    "privacy",
    "blockchain",
    "batch coordination",
  ],
  authors: [{ name: "Recherché Inc" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
