"use client";

export function Providers({ children }: { children: React.ReactNode }) {
  // Providers removed - Dynamic handles wallet connections
  // Wagmi was causing conflicts with Dynamic wallet
  return <>{children}</>;
}
