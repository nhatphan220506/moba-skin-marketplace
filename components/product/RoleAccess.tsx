"use client";

import Link from "next/link";

import { WalletControl } from "@/components/product/WalletControl";
import { useProductRoles } from "@/components/product/useProductRoles";
import { roleWorkspaces } from "@/lib/product/roles";
import type { ProductRole } from "@/types/design";

export function RoleAccess({ required, children }: { required: ProductRole[]; children: React.ReactNode }) {
  const access = useProductRoles();
  if (!access.isConnected) return <section className="access-gate"><span>WALLET ACCESS</span><h2>Connect before entering this workspace.</h2><p>The connected wallet determines which operational controls are available. Public discovery remains open to everyone.</p><WalletControl /></section>;
  if (!access.ready) return <section className="access-gate"><span>WRONG NETWORK</span><h2>Switch to the configured marketplace network.</h2><p>Role checks must be read from the same contracts that enforce every write.</p><WalletControl /></section>;
  if (access.loading) return <section className="access-gate"><span>CHECKING ACCESS</span><h2>Reading wallet roles…</h2></section>;
  if (!required.some(role => access.roles.includes(role))) return <section className="access-gate denied"><span>READ-ONLY VIEW</span><h2>This wallet cannot operate this workspace.</h2><p>Required role: {required.map(role => roleWorkspaces[role].label).join(" or ")}. The contracts will also reject unauthorised transactions.</p><Link className="button-link" href={access.primaryWorkspace.href}>Open my workspace</Link></section>;
  return <>{children}</>;
}

export function WorkspaceLink() {
  const access = useProductRoles();
  return <Link href={access.isConnected ? access.primaryWorkspace.href : "/start"}>{access.isConnected ? access.primaryWorkspace.label : "Choose your side"}</Link>;
}
