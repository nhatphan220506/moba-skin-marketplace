import type { Provider } from "ethers";

import { normalizeEvent } from "./normalizeEvent.ts";
import { parseLog, type ContractEvidenceSource } from "./parseReceipt.ts";
import type { EvidenceRow } from "../../types/evidence";

export async function getDesignHistory(
  provider: Provider,
  sources: ContractEvidenceSource[],
  designId: number,
  fromBlock = 0,
): Promise<EvidenceRow[]> {
  const logs = (await Promise.all(sources.map((source) => provider.getLogs({ address: source.address, fromBlock, toBlock: "latest" })))).flat();
  const transactionSenders = new Map<string, `0x${string}`>();
  const timestamps = new Map<number, number>();
  const events = [];
  for (const log of logs) {
    let sender = transactionSenders.get(log.transactionHash);
    if (!sender) {
      const transaction = await provider.getTransaction(log.transactionHash);
      if (!transaction) continue;
      sender = transaction.from as `0x${string}`;
      transactionSenders.set(log.transactionHash, sender);
    }
    let timestamp = timestamps.get(log.blockNumber);
    if (timestamp === undefined) {
      const block = await provider.getBlock(log.blockNumber);
      if (!block) continue;
      timestamp = block.timestamp;
      timestamps.set(log.blockNumber, timestamp);
    }
    const parsed = parseLog(log, sources, sender, timestamp);
    if (parsed && Number(parsed.args.designId) === designId) events.push(parsed);
  }
  return events
    .sort((left, right) => Number(left.blockNumber - right.blockNumber) || left.logIndex - right.logIndex)
    .map(normalizeEvent);
}
