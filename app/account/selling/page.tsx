import { RoleWorkspace } from "@/components/product/RoleWorkspace";
export default function Page() { return <RoleWorkspace eyebrow="SELLER WORKSPACE" title="Seller Centre" description="List only entitlements owned by the connected wallet and claim authorised resale proceeds." actions={["list-resale", "cancel-listing", "withdraw-resale"]}/>; }

