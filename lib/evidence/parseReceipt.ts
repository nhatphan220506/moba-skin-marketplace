import { Interface, type Log, type TransactionReceipt } from "ethers";

import { normalizeEvent, type ParsedEvidenceEvent } from "./normalizeEvent.ts";
import type { EvidenceRow } from "../../types/evidence";

export type ContractEvidenceSource = {
  name: string;
  address: `0x${string}`;
  abi: ConstructorParameters<typeof Interface>[0];
};

const actorKeys = ["artist", "verifier", "publisher", "voter", "bidder", "winner", "owner", "seller", "buyer", "previousOwner", "gameDeveloper", "recipient"];

function actorFrom(args: Record<string, unknown>, fallback: string): `0x${string}` {
  for (const key of actorKeys) {
    const value = args[key];
    if (typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)) return value as `0x${string}`;
  }
  return fallback as `0x${string}`;
}

export function parseLog(
  log: Pick<Log, "address" | "data" | "topics" | "transactionHash" | "blockNumber" | "index">,
  sources: ContractEvidenceSource[],
  transactionFrom: `0x${string}`,
  timestamp?: number,
): ParsedEvidenceEvent | null {
  const source = sources.find((candidate) => candidate.address.toLowerCase() === log.address.toLowerCase());
  if (!source) return null;
  try {
    const parsed = new Interface(source.abi).parseLog({ data: log.data, topics: [...log.topics] });
    if (!parsed) return null;
    const args: Record<string, unknown> = {};
    parsed.fragment.inputs.forEach((input, index) => { args[input.name] = parsed.args[index]; });
    return {
      transactionHash: log.transactionHash as `0x${string}`,
      blockNumber: BigInt(log.blockNumber),
      logIndex: log.index,
      contractName: source.name,
      eventName: parsed.name,
      actor: actorFrom(args, transactionFrom),
      args,
      timestamp,
    };
  } catch {
    return null;
  }
}

export function parseReceipt(
  receipt: TransactionReceipt,
  sources: ContractEvidenceSource[],
  timestamp?: number,
): EvidenceRow[] {
  if (receipt.status !== 1) throw new Error("Cannot normalize events from a reverted receipt");
  return receipt.logs
    .map((log) => parseLog(log, sources, receipt.from as `0x${string}`, timestamp))
    .filter((event): event is ParsedEvidenceEvent => event !== null)
    .sort((left, right) => left.logIndex - right.logIndex)
    .map(normalizeEvent);
}
