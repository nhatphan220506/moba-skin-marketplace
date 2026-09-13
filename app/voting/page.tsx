import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";

export default function VotingPage() {
  return <main className="product-main"><header className="product-heading"><div><p className="eyebrow">COMMUNITY GOVERNANCE</p><h1>Voting rounds</h1><p>Only verified, publisher-eligible and unsuspended concepts can enter a time-boxed on-chain round.</p></div><Link className="button-link" href="/community">Open fan workspace</Link></header><section className="round-card"><div><span>ROUND 01 · FINALIZED</span><h2>Publisher Selection Season</h2><p>Two independent fan wallets voted. Design #1 was recorded as the winner.</p></div><div className="round-stats"><strong>2</strong><span>votes</span><strong>1</strong><span>winner</span></div></section><ProductCard compact /></main>;
}

