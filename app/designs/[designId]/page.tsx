import { DesignDetail } from "@/components/product/DesignDetail";
import { catalog } from "@/lib/product/catalog";

export function generateStaticParams() { return catalog.map(item => ({ designId: String(item.id) })); }

export default async function DesignPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId }=await params; const numericId=Number(designId);
  return <DesignDetail designId={numericId} fallback={catalog.find(item => item.id === numericId)} />;
}
