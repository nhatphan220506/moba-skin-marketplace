import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { VerificationWorkspace } from "@/components/product/BackendOperations";
export default function Page() { return <RoleWorkspace eyebrow="TRUST / VERIFIER" title="Verification Desk" description="Inspect private provenance evidence, make an accountable human decision and anchor only its integrity hash publicly." actions={["verify-design", "request-revision"]}><VerificationWorkspace /></RoleWorkspace>; }
