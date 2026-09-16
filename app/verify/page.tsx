import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { VerificationWorkspace } from "@/components/product/BackendOperations";
import { DesignQueue } from "@/components/product/DesignQueue";
export default function Page() { return <RoleWorkspace eyebrow="TRUST / VERIFIER" title="Verification Desk" description="Inspect private provenance evidence, make an accountable human decision and anchor only its integrity hash publicly." requiredRoles={["VERIFIER"]} actions={["verify-design", "request-revision"]}><DesignQueue title="Submissions awaiting trust review" /><VerificationWorkspace /></RoleWorkspace>; }
