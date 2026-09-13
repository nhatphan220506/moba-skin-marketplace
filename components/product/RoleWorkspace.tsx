import Link from "next/link";

import { OnchainActionCard } from "@/components/product/OnchainActionCard";
import type { ProductActionId } from "@/lib/product/actions";

export function RoleWorkspace({ eyebrow, title, description, actions, sideLinks = [] }: { eyebrow: string; title: string; description: string; actions: ProductActionId[]; sideLinks?: Array<{ href: string; label: string }> }) {
  return <main className="product-main workspace-page">
    <header className="product-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><div className="workspace-meta"><span>Wallet signed</span><span>Receipt verified</span><span>Role enforced by contract</span></div></header>
    <div className="workspace-layout"><aside className="workspace-sidebar"><strong>Workspace</strong><Link href="/explore">Marketplace overview</Link><Link href="/evidence">Blockchain evidence</Link>{sideLinks.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}<p>Controls become available only when the connected network has a valid deployment. Contract rules remain authoritative.</p></aside><section className="action-grid">{actions.map((action) => <OnchainActionCard actionId={action} key={action} />)}</section></div>
  </main>;
}

