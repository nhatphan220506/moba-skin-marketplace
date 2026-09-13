import { RoleWorkspace } from "@/components/product/RoleWorkspace";
import { UploadWorkspace } from "@/components/product/BackendOperations";
export default function Page() { return <RoleWorkspace eyebrow="CREATOR / ARTIST" title="Creator Studio" description="Take a concept from protected evidence upload to a wallet-signed submission, then follow reviews, production and revenue." actions={["submit-design", "withdraw-primary", "withdraw-resale"]}><UploadWorkspace /></RoleWorkspace>; }
