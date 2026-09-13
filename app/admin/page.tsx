import { RoleWorkspace } from "@/components/product/RoleWorkspace";
export default function Page() { return <RoleWorkspace eyebrow="ADMINISTRATION" title="Risk and protocol operations" description="Operate time-boxed governance, settlement and emergency controls while preserving historical evidence." actions={["open-voting", "finalize-voting", "settle-auction", "suspend-design", "reinstate-design", "pause-entitlement", "unpause-entitlement"]}/>; }

