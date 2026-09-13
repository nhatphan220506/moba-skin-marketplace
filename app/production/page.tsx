import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { ProductionWorkspace } from "@/components/product/BackendOperations";
export default function Page() { return <RoleWorkspace eyebrow="GAME TEAM / QA" title="Production Pipeline" description="Version private model packages, review game compatibility and anchor the approved build into the public lifecycle." actions={["approve-compatibility", "require-rework"]}><ProductionWorkspace /></RoleWorkspace>; }
