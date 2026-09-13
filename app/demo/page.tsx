import { FullJourneyDashboard } from "@/components/ui/FullJourneyDashboard";
import { KatIntegrationDashboard } from "@/components/ui/KatIntegrationDashboard";

export default function DemoPage() {
  return <main className="product-main"><header className="product-heading"><div><p className="eyebrow">LOCAL REGRESSION</p><h1>Verified end-to-end demo</h1><p>A deterministic Hardhat journey for assessment recording and repeatable failure-path validation.</p></div><div className="workspace-meta"><span>22 checkpoints</span><span>58 contract tests</span><span>48 receipt events</span></div></header><FullJourneyDashboard /><KatIntegrationDashboard /></main>;
}

