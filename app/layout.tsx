import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MOBA Skin Marketplace | M0",
  description: "Technical foundation for the authorised skin marketplace prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
