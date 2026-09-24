import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { SystemStatusWorkspace } from "@/components/product/BackendOperations";
import { DesignQueue } from "@/components/product/DesignQueue";
export default function Page() { return <RoleWorkspace eyebrow="ADMIN / PROTOCOL" title="Protocol Operations" description="Monitor the public data pipeline, govern rounds and operate emergency controls without erasing historical evidence." requiredRoles={["ADMIN"]} actions={["mint-payment", "open-voting", "finalize-voting", "settle-auction", "suspend-design", "reinstate-design", "pause-entitlement", "unpause-entitlement"]}><SystemStatusWorkspace /><DesignQueue title="Marketplace-wide lifecycle and risk queue" /></RoleWorkspace>; }
