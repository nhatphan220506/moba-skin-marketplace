"use client";

import Link from "next/link";

import { WalletControl } from "@/components/product/WalletControl";
import { useProductRoles } from "@/components/product/useProductRoles";
import { rolePriority, roleWorkspaces } from "@/lib/product/roles";

export default function StartPage() {
  const access = useProductRoles();
  return <main className="product-main role-start"><header className="marketplace-hero"><div><p className="eyebrow">CHOOSE YOUR SIDE</p><h1>One market.<br/><em>Your workspace.</em></h1><p>Connect a wallet so the product can read its contract roles. Buyers receive an open player hub; operational workspaces appear only for authorised wallets.</p></div><WalletControl /></header>{access.isConnected && <div className="role-summary"><span>CONNECTED ACCESS</span><strong>{access.loading ? "Reading roles…" : access.roles.map(role => roleWorkspaces[role].label).join(" · ")}</strong><small>Network {access.chainId}</small></div>}<section className="role-picker">{rolePriority.map(role => { const item=roleWorkspaces[role]; const allowed=access.isConnected && access.roles.includes(role); return <article className={allowed ? "role-option available" : "role-option"} key={role}><span>{allowed ? "AVAILABLE" : role === "PLAYER" ? "CONNECT WALLET" : "ROLE REQUIRED"}</span><h2>{item.label}</h2><p>{item.description}</p>{allowed ? <Link className="button-link" href={item.href}>Enter workspace</Link> : <small>{role === "PLAYER" ? "Every connected wallet can use the buyer experience." : `Granted and enforced by the ${item.label} contract role.`}</small>}</article>; })}</section></main>;
}
