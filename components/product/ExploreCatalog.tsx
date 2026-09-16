"use client";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { catalog, type CatalogItem } from "@/lib/product/catalog";
import { lifecycleToCatalog } from "@/lib/product/lifecycleCatalog";
import type { DesignLifecycle } from "@/types/design";
import { apiFetch, dynamicApiAvailable } from "@/lib/product/apiClient";

export function ExploreCatalog() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("All");
  const [live, setLive] = useState<CatalogItem[]>([]);
  useEffect(() => { if (!dynamicApiAvailable()) return; apiFetch("/api/designs").then(response => response.ok ? response.json() : Promise.reject()).then((body: { designs: DesignLifecycle[] }) => setLive(body.designs.map(lifecycleToCatalog).filter((item): item is CatalogItem => Boolean(item)))).catch(() => undefined); }, []);
  const source = useMemo(() => { const merged=new Map(catalog.map(item => [item.id,item])); live.forEach(item => merged.set(item.id,item)); return [...merged.values()]; }, [live]);
  const items = useMemo(() => source.filter((item) => `${item.name} ${item.artist} ${item.game} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (status === "All" || item.status === status)), [query, status, source]);
  return <><div className="catalog-toolbar"><label><span>Search the forge</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Skin, creator, game or role" /></label><label><span>Stage</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Market ready</option><option>Live auction</option><option>Community vote</option><option>In review</option><option>Production</option></select></label><div className="catalog-count"><strong>{items.length}</strong><span>assets</span></div></div>{items.length ? <section className="catalog-grid">{items.map((item) => <ProductCard item={item} key={item.id} />)}</section> : <div className="empty-catalog"><strong>No matching assets</strong><p>Try another stage or a shorter search.</p></div>}</>;
}
