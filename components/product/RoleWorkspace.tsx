import Link from "next/link";

import { OnchainActionCard } from "@/components/product/OnchainActionCard";
import { RoleAccess } from "@/components/product/RoleAccess";
import type { ProductActionId } from "@/lib/product/actions";
import type { ProductRole } from "@/types/design";

export function RoleWorkspace({ eyebrow, title, description, actions, requiredRoles = ["PLAYER"], sideLinks = [], children }: { eyebrow: string; title: string; description: string; actions: ProductActionId[]; requiredRoles?: ProductRole[]; sideLinks?: Array<{ href: string; label: string }>; children?: React.ReactNode }) {
  return <main className="product-main workspace-page">
    <header className="workspace-hero"><div><div className="workspace-label"><span className="live-dot" />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="workspace-pulse"><span>WORKSPACE STATUS</span><strong>Connected to Sepolia</strong><small>Private records + public contract receipts</small></div></header>
    <div className="workspace-stats"><div><span>Network</span><strong>Sepolia</strong><small>Public testnet</small></div><div><span>Security</span><strong>Wallet signed</strong><small>No custodial keys</small></div><div><span>Evidence</span><strong>Receipt linked</strong><small>Backend ↔ chain</small></div><div><span>Authority</span><strong>Contract role</strong><small>Enforced on-chain</small></div></div>
    <div className="workspace-layout"><aside className="workspace-sidebar"><strong>Your workspace</strong><Link href="/start">Role home</Link><Link href="/explore">Marketplace</Link><Link href="/evidence">Blockchain evidence</Link>{sideLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}<p>Private data is stored by the backend. Business-critical approvals and value transfers require a wallet receipt.</p></aside><div className="workspace-content"><RoleAccess required={requiredRoles}>{children}<div className="content-heading"><span>ON-CHAIN OPERATIONS</span><h2>Wallet actions</h2><p>Review each transaction before signing. Contract role checks remain authoritative.</p></div><section className="action-grid">{actions.map((action) => <OnchainActionCard actionId={action} key={action} />)}</section></RoleAccess></div></div>
  </main>;
}
