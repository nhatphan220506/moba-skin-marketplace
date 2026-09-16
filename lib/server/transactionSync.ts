import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { Interface, JsonRpcProvider, type InterfaceAbi } from "ethers";

import localhost from "@/deployments/localhost.json";
import sepolia from "@/deployments/sepolia.json";
import { validationError } from "@/lib/server/api";
import { postgresEnabled, postgresPool } from "@/lib/server/postgres";

type Deployment = { chainId: number; contracts: Record<string, string> };
type StoredEvent = Record<string, unknown> & { transactionHash: string; logIndex: number };

const actorNames = ["actor", "artist", "verifier", "publisher", "developer", "fan", "bidder", "buyer", "seller", "owner", "account", "recipient"];

function value(input: unknown): unknown {
  if (typeof input === "bigint") return input.toString();
  if (Array.isArray(input)) return input.map(value);
  return input;
}

function artifactName(key: string): string {
  return key === "payment" ? "MockVND" : key === "assetRegistry" ? "AssetRegistry" : key === "voting" ? "CommunityVoting" : key === "compatibility" ? "CompatibilityRegistry" : key === "entitlement" ? "SkinEntitlement1155" : key === "primary" ? "PrimaryAuction" : "SecondaryMarketplace";
}

async function interfaces(deployment: Deployment) {
  const result = new Map<string, { name: string; iface: Interface }>();
  for (const [name, address] of Object.entries(deployment.contracts)) {
    const contract = artifactName(name);
    const artifact = JSON.parse(await readFile(path.join(process.cwd(), "artifacts", "contracts", `${contract}.sol`, `${contract}.json`), "utf8")) as { abi: InterfaceAbi };
    result.set(address.toLowerCase(), { name, iface: new Interface(artifact.abi) });
  }
  return result;
}

async function persist(events: StoredEvent[], blockNumber: number) {
  if (postgresEnabled()) {
    const pool = postgresPool();
    for (const row of events) {
      await pool.query(`INSERT INTO indexed_events (chain_id,transaction_hash,log_index,block_number,block_hash,contract_name,contract_address,event_name,actor,design_id,auction_id,token_id,amount,arguments,block_timestamp) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,to_timestamp($15)) ON CONFLICT DO NOTHING`, [row.chainId,row.transactionHash,row.logIndex,row.blockNumber,row.blockHash,row.contractName,row.contractAddress,row.eventName,row.actor,row.designId,row.auctionId,row.tokenId,row.amount,JSON.stringify(row.arguments),row.timestamp]);
    }
    return;
  }
  const target = path.join(process.cwd(), "data", "indexed-events.json");
  let stored: { chainId: number; cursor: number; events: StoredEvent[] } = { chainId: Number(events[0]?.chainId ?? 11155111), cursor: blockNumber, events: [] };
  try { stored = JSON.parse(await readFile(target, "utf8")); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const keys = new Set(stored.events.map(row => `${row.transactionHash}:${row.logIndex}`));
  for (const event of events) if (!keys.has(`${event.transactionHash}:${event.logIndex}`)) stored.events.push(event);
  stored.cursor = Math.max(stored.cursor || 0, blockNumber);
  const temporary = `${target}.${process.pid}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(stored, null, 2)}\n`, "utf8");
  await rename(temporary, target);
}

export async function syncConfirmedTransaction(transactionHash: string, chainId: number) {
  if (!/^0x[0-9a-f]{64}$/i.test(transactionHash)) throw validationError("transactionHash is invalid");
  if (![11155111, 31337].includes(chainId)) throw validationError("chainId is not supported");
  const deployment = (chainId === 11155111 ? sepolia : localhost) as Deployment;
  const rpc = chainId === 11155111 ? process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL : process.env.LOCAL_RPC_URL || process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545";
  if (!rpc) throw validationError("RPC URL is not configured");
  const provider = new JsonRpcProvider(rpc, chainId);
  const receipt = await provider.getTransactionReceipt(transactionHash);
  if (!receipt || receipt.status !== 1) throw validationError("transaction is not confirmed successfully");
  const block = await provider.getBlock(receipt.blockNumber);
  const known = await interfaces(deployment);
  const events: StoredEvent[] = [];
  for (const log of receipt.logs) {
    const contract = known.get(log.address.toLowerCase());
    if (!contract) continue;
    let parsed; try { parsed = contract.iface.parseLog(log); } catch { continue; }
    if (!parsed) continue;
    const args: Record<string, unknown> = {};
    parsed.fragment.inputs.forEach((input, index) => { args[input.name || String(index)] = value(parsed.args[index]); });
    const actor = actorNames.map(name => args[name]).find(candidate => typeof candidate === "string" && /^0x[0-9a-f]{40}$/i.test(candidate));
    events.push({ chainId, transactionHash, logIndex: log.index, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, contractName: contract.name, contractAddress: log.address, eventName: parsed.name, actor: actor ?? null, designId: args.designId ?? null, auctionId: args.auctionId ?? null, tokenId: args.tokenId ?? args.id ?? null, amount: args.amount ?? args.price ?? args.bidAmount ?? null, arguments: args, timestamp: Number(block?.timestamp ?? Math.floor(Date.now() / 1000)) });
  }
  if (!events.length) throw validationError("transaction contains no marketplace contract events");
  await persist(events, receipt.blockNumber);
  return { transactionHash, chainId, blockNumber: receipt.blockNumber, events: events.map(event => ({ contractName: event.contractName, eventName: event.eventName, designId: event.designId })) };
}
