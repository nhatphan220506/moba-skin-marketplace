import { createHash, timingSafeEqual } from "node:crypto";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
  keccak256,
  toBytes,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { getContractAddress, type ContractKey } from "@/config/contracts";
import { accessControlAbi } from "@/lib/blockchain/abis";
import { ServiceError, authenticationError } from "@/lib/server/api";
import { createPrototypeAccessSession } from "@/lib/server/walletAuth";

const DEFAULT_PASSWORD_HASH = "1546688a3cc6ef91d02135eb5b0b485e8eafc9a826920002c8e63c86dc5bb2c0";
const MIN_GRANTER_BALANCE = 500_000_000_000_000n;

type GrantDefinition = {
  label: string;
  contract: Exclude<ContractKey, "secondary">;
  role: Hex;
};

const role = (name: string) => keccak256(toBytes(name));
const grants: GrantDefinition[] = [
  { label: "MockVND admin", contract: "payment", role: zeroHash },
  { label: "MockVND minter", contract: "payment", role: role("MINTER_ROLE") },
  { label: "Protocol admin", contract: "assetRegistry", role: zeroHash },
  { label: "Artist", contract: "assetRegistry", role: role("ARTIST_ROLE") },
  { label: "Verifier", contract: "assetRegistry", role: role("VERIFIER_ROLE") },
  { label: "Publisher", contract: "assetRegistry", role: role("PUBLISHER_ROLE") },
  { label: "Voting admin", contract: "voting", role: zeroHash },
  { label: "Community voter", contract: "voting", role: role("FAN_ROLE") },
  { label: "Production admin", contract: "compatibility", role: zeroHash },
  { label: "Production publisher", contract: "compatibility", role: role("PUBLISHER_ROLE") },
  { label: "Game team", contract: "compatibility", role: role("GAME_DEVELOPER_ROLE") },
  { label: "Entitlement admin", contract: "entitlement", role: zeroHash },
  { label: "Entitlement minter", contract: "entitlement", role: role("MINTER_ROLE") },
  { label: "Entitlement pauser", contract: "entitlement", role: role("PAUSER_ROLE") },
  { label: "Auction admin", contract: "primary", role: zeroHash },
  { label: "Auction publisher", contract: "primary", role: role("PUBLISHER_ROLE") },
];

const prototypeRoles = ["Admin", "Publisher", "Game team", "Verifier", "Artist", "Community voter", "Seller", "Buyer / Player"];

function verifyPassword(password: string) {
  const expectedHex = process.env.DISCOVER_ACCESS_PASSWORD_SHA256 || DEFAULT_PASSWORD_HASH;
  if (!/^[0-9a-f]{64}$/i.test(expectedHex)) {
    throw new ServiceError("ACCESS_NOT_CONFIGURED", "Discover access password is not configured", 503, true);
  }
  const actual = createHash("sha256").update(password.trim()).digest();
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw authenticationError("Incorrect access password");
  }
}

function grantPrivateKey(): Hex {
  const value = process.env.SEPOLIA_ROLE_GRANTER_PRIVATE_KEY || "";
  if (!/^0x[0-9a-f]{64}$/i.test(value)) {
    throw new ServiceError(
      "GRANTER_NOT_CONFIGURED",
      "The Sepolia role-granter wallet is not configured",
      503,
      true,
    );
  }
  return value as Hex;
}

let grantQueue: Promise<void> = Promise.resolve();

async function inGrantQueue<T>(operation: () => Promise<T>): Promise<T> {
  const previous = grantQueue;
  let release!: () => void;
  grantQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await operation(); }
  finally { release(); }
}

export async function grantDiscoverAccess(addressInput: string, password: string) {
  verifyPassword(password);

  let target: Address;
  try { target = getAddress(addressInput); }
  catch { throw new ServiceError("INVALID_WALLET", "The connected wallet address is invalid", 400, true); }

  return inGrantQueue(async () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    const account = privateKeyToAccount(grantPrivateKey());
    const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });

    const contracts = new Map<GrantDefinition["contract"], Address>();
    for (const item of grants) {
      const address = getContractAddress(sepolia.id, item.contract);
      if (!address) {
        throw new ServiceError("CONTRACT_NOT_CONFIGURED", `${item.contract} is not configured`, 503, true);
      }
      contracts.set(item.contract, address);
    }

    const adminContracts = [...new Set(grants.map((item) => item.contract))];
    const missingAdmin: string[] = [];
    for (const contractName of adminContracts) {
      const authorised = await publicClient.readContract({
        address: contracts.get(contractName)!,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [zeroHash, account.address],
      });
      if (!authorised) missingAdmin.push(contractName);
    }
    if (missingAdmin.length > 0) {
      throw new ServiceError(
        "GRANTER_NOT_AUTHORIZED",
        `The Sepolia role-granter is not an admin for: ${missingAdmin.join(", ")}`,
        503,
        true,
      );
    }

    const balance = await publicClient.getBalance({ address: account.address });
    if (balance < MIN_GRANTER_BALANCE) {
      throw new ServiceError(
        "GRANTER_NEEDS_GAS",
        `The Sepolia role-granter needs test ETH for gas (current balance: ${formatEther(balance)} SepETH)`,
        503,
        true,
      );
    }

    let nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
    const transactionHashes: Hex[] = [];
    const granted: string[] = [];

    for (const item of grants) {
      const contract = contracts.get(item.contract)!;
      const alreadyGranted = await publicClient.readContract({
        address: contract,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [item.role, target],
      });
      if (alreadyGranted) {
        granted.push(item.label);
        continue;
      }

      const hash = await walletClient.writeContract({
        address: contract,
        abi: accessControlAbi,
        functionName: "grantRole",
        args: [item.role, target],
        nonce,
      });
      nonce += 1;
      transactionHashes.push(hash);
      granted.push(item.label);
    }

    const receipts = await Promise.all(transactionHashes.map((hash) =>
      publicClient.waitForTransactionReceipt({ hash, confirmations: 1 }),
    ));
    if (receipts.some((receipt) => receipt.status !== "success")) {
      throw new ServiceError("ROLE_GRANT_FAILED", "One or more Sepolia role grants failed", 502, true);
    }

    for (const item of grants) {
      const verified = await publicClient.readContract({
        address: contracts.get(item.contract)!,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [item.role, target],
      });
      if (!verified) {
        throw new ServiceError("ROLE_GRANT_NOT_VERIFIED", `${item.label} was not granted on Sepolia`, 502, true);
      }
    }

    return {
      ...createPrototypeAccessSession({ address: target, chainId: sepolia.id, expiresAt: Math.floor(Date.now() / 1000) }),
      roles: prototypeRoles,
      onChainRoles: granted,
      transactionHashes,
      grantor: account.address,
    };
  });
}
