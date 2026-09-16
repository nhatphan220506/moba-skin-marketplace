"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import { catalog, type CatalogItem } from "@/lib/product/catalog";
import { lifecycleToCatalog } from "@/lib/product/lifecycleCatalog";
import type { DesignLifecycle } from "@/types/design";

export function HomeCatalog() {
  const [items, setItems] = useState<CatalogItem[]>(catalog.slice(1, 4));
  useEffect(() => { if (process.env.NEXT_PUBLIC_STATIC_HOSTING === "true") return; fetch("/api/designs", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then((body: { designs: DesignLifecycle[] }) => { const live=body.designs.map(lifecycleToCatalog).filter((item): item is CatalogItem => Boolean(item)); if (live.length) setItems([...live, ...catalog.filter(item => item.source === "product-preview")].slice(0,3)); }).catch(() => undefined); }, []);
  return <div className="home-catalog">{items.map(item => <ProductCard item={item} key={`${item.source}-${item.id}`} />)}</div>;
}
