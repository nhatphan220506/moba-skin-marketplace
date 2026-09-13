import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { SystemStatusWorkspace } from "@/components/product/BackendOperations";
export default function Page() { return <RoleWorkspace eyebrow="ADMIN / PROTOCOL" title="Protocol Operations" description="Monitor the public data pipeline, govern rounds and operate emergency controls without erasing historical evidence." actions={["open-voting", "finalize-voting", "settle-auction", "suspend-design", "reinstate-design", "pause-entitlement", "unpause-entitlement"]}><SystemStatusWorkspace /></RoleWorkspace>; }
