import type { Metadata } from "next";
import { ProductProviders } from "@/components/product/ProductProviders";
import { SiteShell } from "@/components/product/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOBA Forge | Verifiable Skin Marketplace",
  description: "Publisher-authorised community skin marketplace with verifiable blockchain settlement and usage entitlements.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ProductProviders><SiteShell>{children}</SiteShell></ProductProviders></body>
    </html>
  );
}
