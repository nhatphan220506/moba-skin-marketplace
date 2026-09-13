require("dotenv/config");
const fs = require("node:fs/promises");
const path = require("node:path");
const { JsonRpcProvider, Interface } = require("ethers");
const { Pool } = require("pg");
const deployment = require("../../deployments/sepolia.json");

const confirmations = Number(process.env.INDEXER_CONFIRMATIONS || 6);
const chunkSize = Number(process.env.INDEXER_CHUNK_SIZE || 2_000);
const actorNames = ["actor", "artist", "verifier", "publisher", "developer", "fan", "bidder", "buyer", "seller", "owner", "account", "recipient"];

function jsonValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonValue);
  return value;
}

async function artifacts() {
  const entries = [];
  for (const [name, address] of Object.entries(deployment.contracts)) {
    const artifactName = name === "payment" ? "MockVND" : name === "assetRegistry" ? "AssetRegistry" : name === "voting" ? "CommunityVoting" : name === "compatibility" ? "CompatibilityRegistry" : name === "entitlement" ? "SkinEntitlement1155" : name === "primary" ? "PrimaryAuction" : "SecondaryMarketplace";
    const artifact = JSON.parse(await fs.readFile(path.join(process.cwd(), "artifacts", "contracts", `${artifactName}.sol`, `${artifactName}.json`), "utf8"));
    entries.push({ name, address, iface: new Interface(artifact.abi) });
  }
  return entries;
}

function normalize(contract, log, parsed, timestamp) {
  const args = {};
  parsed.fragment.inputs.forEach((input, index) => { args[input.name || String(index)] = jsonValue(parsed.args[index]); });
  const actor = actorNames.map((name) => args[name]).find((value) => typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value));
  return {
    chainId: 11155111, transactionHash: log.transactionHash, logIndex: log.index,
    blockNumber: log.blockNumber, blockHash: log.blockHash, contractName: contract.name, contractAddress: contract.address,
    eventName: parsed.name, actor: actor || null,
    designId: args.designId || null, auctionId: args.auctionId || null, tokenId: args.tokenId || args.id || null,
    amount: args.amount || args.price || args.bidAmount || null, arguments: args, timestamp,
  };
}

async function main() {
  if (deployment.deployed !== true) throw new Error("Sepolia contracts have not been deployed yet.");
  const rpc = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  if (!rpc) throw new Error("SEPOLIA_RPC_URL is required.");
  const provider = new JsonRpcProvider(rpc, 11155111);
  const head = await provider.getBlockNumber();
  const safeHead = head - confirmations;
  const contracts = await artifacts();
  const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined }) : null;
  const localPath = path.join(process.cwd(), "data", "indexed-events.json");
  let rows = [];
  let cursor = Number(deployment.deploymentBlock) - 1;
  if (pool) {
    const schema = await fs.readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    await pool.query(schema);
    const result = await pool.query("SELECT last_finalized_block FROM indexer_cursors WHERE chain_id = $1", [11155111]);
    if (result.rows[0]) cursor = Number(result.rows[0].last_finalized_block);
  } else {
    try { const saved = JSON.parse(await fs.readFile(localPath, "utf8")); rows = saved.events || []; cursor = saved.cursor || cursor; } catch (error) { if (error.code !== "ENOENT") throw error; }
  }

  const rewind = Math.max(Number(deployment.deploymentBlock) - 1, cursor - confirmations);
  if (pool) await pool.query("DELETE FROM indexed_events WHERE chain_id = $1 AND block_number > $2", [11155111, rewind]);
  else rows = rows.filter((row) => Number(row.blockNumber) <= rewind);
  cursor = rewind;

  const blockTimes = new Map();
  for (let from = cursor + 1; from <= safeHead; from += chunkSize) {
    const to = Math.min(from + chunkSize - 1, safeHead);
    for (const contract of contracts) {
      const logs = await provider.getLogs({ address: contract.address, fromBlock: from, toBlock: to });
      for (const log of logs) {
        let parsed; try { parsed = contract.iface.parseLog(log); } catch { continue; }
        if (!parsed) continue;
        if (!blockTimes.has(log.blockNumber)) blockTimes.set(log.blockNumber, Number((await provider.getBlock(log.blockNumber)).timestamp));
        const row = normalize(contract, log, parsed, blockTimes.get(log.blockNumber));
        if (pool) {
          await pool.query(`INSERT INTO indexed_events (chain_id, transaction_hash, log_index, block_number, block_hash, contract_name, contract_address, event_name, actor, design_id, auction_id, token_id, amount, arguments, block_timestamp)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,to_timestamp($15)) ON CONFLICT DO NOTHING`,
            [row.chainId,row.transactionHash,row.logIndex,row.blockNumber,row.blockHash,row.contractName,row.contractAddress,row.eventName,row.actor,row.designId,row.auctionId,row.tokenId,row.amount,JSON.stringify(row.arguments),row.timestamp]);
        } else rows.push(row);
      }
    }
    cursor = to;
    if (pool) await pool.query(`INSERT INTO indexer_cursors(chain_id,last_finalized_block,updated_at) VALUES($1,$2,now()) ON CONFLICT(chain_id) DO UPDATE SET last_finalized_block=EXCLUDED.last_finalized_block,updated_at=now()`, [11155111, cursor]);
  }
  if (pool) await pool.end();
  else { await fs.mkdir(path.dirname(localPath), { recursive: true }); await fs.writeFile(localPath, `${JSON.stringify({ chainId: 11155111, cursor, events: rows }, null, 2)}\n`); }
  console.log(`Indexer synchronized through finalized block ${cursor}. ${pool ? "PostgreSQL" : "Local JSON fallback"} is active.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
