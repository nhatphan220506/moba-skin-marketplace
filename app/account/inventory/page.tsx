import { RoleWorkspace } from "@/components/product/RoleWorkspace";
export default function Page() { return <RoleWorkspace eyebrow="BUYER WORKSPACE" title="Inventory and bids" description="Operate primary bids and resale purchases while keeping blockchain ownership separate from private game delivery." actions={["approve-primary", "place-bid", "withdraw-refund", "approve-resale", "buy-resale"]}/>; }

