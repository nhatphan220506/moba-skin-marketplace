"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletControl } from "@/components/product/WalletControl";

const nav = [
  ["Explore", "/explore"], ["Voting", "/voting"], ["Auctions", "/auctions"],
  ["Marketplace", "/marketplace"], ["Evidence", "/evidence"],
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <>
    <header className="site-header">
      <Link className="brand" href="/"><span>MF</span><strong>MOBA FORGE</strong></Link>
      <nav className="site-nav" aria-label="Primary navigation">{nav.map(([label, href]) => <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
      <WalletControl />
    </header>
    {children}
    <footer className="site-footer"><div><Link className="brand" href="/"><span>MF</span><strong>MOBA FORGE</strong></Link><p>Publisher-authorised community marketplace for limited usage entitlements.</p></div><div><Link href="/about">About the marketplace</Link><Link href="/trust">Trust and boundaries</Link><Link href="/evidence">Blockchain evidence</Link><Link href="/admin">System status</Link></div><small>Sepolia and MockVND are test infrastructure. Entitlements do not transfer copyright or game IP.</small></footer>
  </>;
}
