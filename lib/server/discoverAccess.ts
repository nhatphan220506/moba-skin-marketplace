import { createHash, timingSafeEqual } from "node:crypto";

import { createPublicClient, createWalletClient, getAddress, http, keccak256, toBytes, zeroHash, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { getContractAddress, type ContractKey } from "@/config/contracts";
import { accessControlAbi } from "@/lib/blockchain/abis";
import { ServiceError, authenticationError } from "@/lib/server/api";

const DEFAULT_PASSWORD_HASH = "1546688a3cc6ef91d02135eb5b0b485e8eafc9a826920002c8e63c86dc5bb2c0";

type GrantDefinition = { label: string; contract: ContractKey; role: Hex };

const role = (name: string) => keccak256(toBytes(name));
const grants: GrantDefinition[] = [
  { label: "Admin", contract: "assetRegistry", role: zeroHash },
  { label: "Artist", contract: "assetRegistry", role: role("ARTIST_ROLE") },
  { label: "Verifier", contract: "assetRegistry", role: role("VERIFIER_ROLE") },
  { label: "Publisher", contract: "assetRegistry", role: role("PUBLISHER_ROLE") },
  { label: "Production admin", contract: "compatibility", role: zeroHash },
  { label: "Production publisher", contract: "compatibility", role: role("PUBLISHER_ROLE") },
  { label: "Game developer", contract: "compatibility", role: role("GAME_DEVELOPER_ROLE") },
  { label: "Voting admin", contract: "voting", role: zeroHash },
  { label: "Fan", contract: "voting", role: role("FAN_ROLE") },
  { label: "Auction publisher", contract: "primary", role: role("PUBLISHER_ROLE") },
];

function verifyPassword(password: string) {
  const actual = createHash("sha256").update(password.trim()).digest();
  const expected = Buffer.from(DEFAULT_PASSWORD_HASH, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw authenticationError("Incorrect access password");
}

function grantPrivateKey(): Hex {
  const value = process.env.SEPOLIA_ROLE_GRANTER_PRIVATE_KEY || process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY || "";
  if (!/^0x[0-9a-f]{64}$/i.test(value)) throw new ServiceError("GRANTER_NOT_CONFIGURED", "The Sepolia role-granter wallet is not configured", 503, true);
  return value as Hex;
}

export async function grantDiscoverAccess(addressInput: string, password: string) {
  verifyPassword(password);
  let target: Address;
  try { target = getAddress(addressInput); } catch { throw new ServiceError("INVALID_WALLET", "The authenticated wallet address is invalid", 400, true); }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const account = privateKeyToAccount(grantPrivateKey());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  let nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
  const transactionHashes: Hex[] = [];
  const granted: string[] = [];

  for (const item of grants) {
    const contract = getContractAddress(sepolia.id, item.contract);
    if (!contract) throw new ServiceError("CONTRACT_NOT_CONFIGURED", `${item.contract} is not configured`, 503, true);
    const alreadyGranted = await publicClient.readContract({ address: contract, abi: accessControlAbi, functionName: "hasRole", args: [item.role, target] });
    if (alreadyGranted) { granted.push(item.label); continue; }
    const hash = await walletClient.writeContract({ address: contract, abi: accessControlAbi, functionName: "grantRole", args: [item.role, target], nonce });
    nonce += 1;
    transactionHashes.push(hash);
    granted.push(item.label);
  }

  const receipts = await Promise.all(transactionHashes.map(hash => publicClient.waitForTransactionReceipt({ hash, confirmations: 1 })));
  if (receipts.some(receipt => receipt.status !== "success")) throw new ServiceError("ROLE_GRANT_FAILED", "One or more Sepolia role grants failed", 502, true);
  return { address: target, chainId: sepolia.id, roles: granted, transactionHashes };
}
