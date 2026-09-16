"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletControl } from "@/components/product/WalletControl";
import { WorkspaceLink } from "@/components/product/RoleAccess";

const nav = [
  ["Discover", "/explore"], ["Vote", "/voting"], ["Auctions", "/auctions"],
  ["Resale", "/marketplace"], ["Proof", "/evidence"],
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <>
    <header className="site-header">
      <Link className="brand" href="/"><span>MF</span><div><strong>MOBA FORGE</strong><small>COMMUNITY SKIN MARKET</small></div></Link>
      <nav className="site-nav" aria-label="Primary navigation">{nav.map(([label, href]) => <Link className={pathname.startsWith(href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
      <div className="header-account"><WorkspaceLink /><WalletControl /></div>
    </header>
    {process.env.NEXT_PUBLIC_STATIC_HOSTING === "true" && <div className="static-hosting-banner">GitHub Pages demo · Sepolia wallet actions and published evidence remain available. Upload, private account and live indexer APIs require the full backend.</div>}
    {children}
    <footer className="site-footer"><div><Link className="brand" href="/"><span>MF</span><div><strong>MOBA FORGE</strong><small>COMMUNITY SKIN MARKET</small></div></Link><p>Where community creativity becomes publisher-authorised, playable digital style.</p></div><div><Link href="/explore">Discover</Link><Link href="/about">Our model</Link><Link href="/trust">Trust and rights</Link><Link href="/evidence">Public proof</Link></div><div><Link href="/studio">For creators</Link><Link href="/publisher">For publishers</Link><Link href="/production">For game teams</Link><Link href="/admin">Protocol status</Link></div><small>Public Sepolia prototype · MockVND has no monetary value · Entitlements do not transfer copyright or game IP.</small></footer>
  </>;
}
