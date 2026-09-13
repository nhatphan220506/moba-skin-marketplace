import type { EvidenceRow } from "@/types/evidence";

export function BlockchainEvidenceTable({ rows }: { rows: EvidenceRow[] }) {
  if (rows.length === 0) return <div className="empty-state">No confirmed blockchain evidence yet. Run the full journey to populate it.</div>;
  return (
    <div className="table-wrap">
      <table className="evidence-table">
        <thead><tr><th>Block</th><th>Contract / event</th><th>Actor</th><th>Design</th><th>Token</th><th>Amount</th><th>Transaction</th><th>Time</th></tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={`${row.transactionHash}-${row.eventName}-${index}`}>
            <td>{String(row.blockNumber)}</td>
            <td><strong>{row.eventName}</strong><small>{row.contractName}</small></td>
            <td className="mono">{row.actor}</td>
            <td>{row.designId ?? "—"}</td><td>{row.tokenId ?? "—"}</td><td>{row.amount ?? "—"}</td>
            <td className="mono">{row.transactionHash}</td>
            <td>{row.timestamp ? new Date(row.timestamp * 1000).toLocaleString() : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
