import { ExploreCatalog } from "@/components/product/ExploreCatalog";

export default function ExplorePage() {
  return <main className="product-main"><header className="marketplace-hero"><div><p className="eyebrow">THE COMMUNITY FORGE</p><h1>Find your next<br/><em>legendary look.</em></h1><p>Discover creator concepts, support community candidates and collect publisher-authorised in-game usage entitlements.</p></div><div className="marketplace-summary"><div><strong>06</strong><span>Season assets</span></div><div><strong>02</strong><span>Live community votes</span></div><div><strong>Sepolia</strong><span>Public settlement network</span></div></div></header><ExploreCatalog /></main>;
}
