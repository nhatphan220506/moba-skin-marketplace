import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { ProductionWorkspace } from "@/components/product/BackendOperations";
import { DesignQueue } from "@/components/product/DesignQueue";
export default function Page() { return <RoleWorkspace eyebrow="GAME TEAM / QA" title="Production Pipeline" description="Version private model packages, review game compatibility and anchor the approved build into the public lifecycle." requiredRoles={["GAME_TEAM"]} actions={["approve-compatibility", "require-rework"]}><DesignQueue title="Production and compatibility queue" /><ProductionWorkspace /></RoleWorkspace>; }
