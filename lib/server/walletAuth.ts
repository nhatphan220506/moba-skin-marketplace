import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { createPublicClient, defineChain, getAddress, http, verifyMessage, zeroHash, type Address } from "viem";
import { hardhat, sepolia } from "viem/chains";

import { getContractAddress } from "@/config/contracts";
import { accessControlAbi } from "@/lib/blockchain/abis";
import { authenticationError, authorizationError, validationError } from "@/lib/server/api";
import { readCollection, updateCollection } from "@/lib/server/storage";
import type { ProductRole } from "@/types/design";

type AuthChallenge = {
  nonce: string;
  address: Address;
  message: string;
  expiresAt: number;
  usedAt?: number;
};

export type WalletSession = { address: Address; chainId: number; expiresAt: number };

const SESSION_SECONDS = 30 * 60;
const CHALLENGE_SECONDS = 5 * 60;

function authChainId(): number {
  const value = Number(process.env.AUTH_CHAIN_ID || 11155111);
  if (value !== 11155111 && value !== 31337) throw new Error("AUTH_CHAIN_ID must be Sepolia (11155111) or local Hardhat (31337)");
  return value;
}

function secret(): string {
  const value = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "local-development-session-secret-change-me");
  if (value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function createWalletChallenge(addressInput: string, apiOrigin: string) {
  let address: Address;
  try { address = getAddress(addressInput); } catch { throw validationError("address must be a valid Ethereum address"); }
  const now = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = now + CHALLENGE_SECONDS;
  const message = `MOBA Forge wants you to sign in with your Ethereum account:\n${address}\n\nAuthorize access to private marketplace APIs. This does not submit a blockchain transaction.\n\nURI: ${apiOrigin}\nVersion: 1\nChain ID: ${authChainId()}\nNonce: ${nonce}\nIssued At: ${new Date(now * 1000).toISOString()}\nExpiration Time: ${new Date(expiresAt * 1000).toISOString()}`;
  const record: AuthChallenge = { nonce, address, message, expiresAt };
  await updateCollection<AuthChallenge[]>("authChallenges", [], current => [...current.filter(item => item.expiresAt > now && !item.usedAt), record]);
  return record;
}

export async function createWalletSession(input: Record<string, unknown>) {
  const nonce = String(input.nonce ?? "");
  const signature = String(input.signature ?? "") as `0x${string}`;
  let address: Address;
  try { address = getAddress(String(input.address ?? "")); } catch { throw validationError("address must be a valid Ethereum address"); }
  const now = Math.floor(Date.now() / 1000);
  const challenges = await readCollection<AuthChallenge[]>("authChallenges", []);
  const challenge = challenges.find(item => item.nonce === nonce && item.address === address && !item.usedAt);
  if (!challenge || challenge.expiresAt <= now) throw authenticationError("Wallet challenge is missing, expired, or already used");
  const valid = /^0x[0-9a-f]{130}$/i.test(signature) && await verifyMessage({ address, message: challenge.message, signature });
  if (!valid) throw authenticationError("Wallet signature is invalid");
  await updateCollection<AuthChallenge[]>("authChallenges", [], current => current.map(item => item.nonce === nonce ? { ...item, usedAt: now } : item));
  const payload: WalletSession = { address, chainId: authChainId(), expiresAt: now + SESSION_SECONDS };
  const encoded = encode(JSON.stringify(payload));
  return { token: `${encoded}.${sign(encoded)}`, ...payload };
}

export function readWalletSession(request: Request, optional = false): WalletSession | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) { if (optional) return null; throw authenticationError(); }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw authenticationError("Wallet session token is malformed");
  const expected = Buffer.from(sign(encoded));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw authenticationError("Wallet session token is invalid");
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as WalletSession;
    if (payload.chainId !== authChainId() || payload.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("expired");
    payload.address = getAddress(payload.address);
    return payload;
  } catch { throw authenticationError("Wallet session token has expired or is invalid"); }
}

const configuredChainId = authChainId();
const authChain = configuredChainId === 31337 ? hardhat : sepolia;
const publicClient = createPublicClient({ chain: authChain ?? defineChain({ id: configuredChainId, name: "Configured auth chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } }), transport: http(configuredChainId === 31337 ? (process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545") : (process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com")) });

export async function walletHasRole(address: Address, role: ProductRole): Promise<boolean> {
  if (role === "PLAYER" || role === "SELLER") return true;
  const definitions = role === "ADMIN"
    ? (["assetRegistry", "compatibility", "voting"] as const).map(contract => ({ contract, getter: null }))
    : role === "ARTIST" ? [{ contract: "assetRegistry" as const, getter: "ARTIST_ROLE" }]
    : role === "VERIFIER" ? [{ contract: "assetRegistry" as const, getter: "VERIFIER_ROLE" }]
    : role === "PUBLISHER" ? [{ contract: "assetRegistry" as const, getter: "PUBLISHER_ROLE" }]
    : role === "GAME_TEAM" ? [{ contract: "compatibility" as const, getter: "GAME_DEVELOPER_ROLE" }]
    : [{ contract: "voting" as const, getter: "FAN_ROLE" }];
  for (const definition of definitions) {
    const contract = getContractAddress(configuredChainId, definition.contract);
    if (!contract) continue;
    const getter = definition.getter as "ARTIST_ROLE" | "VERIFIER_ROLE" | "PUBLISHER_ROLE" | "GAME_DEVELOPER_ROLE" | "FAN_ROLE" | null;
    const roleId = getter ? await publicClient.readContract({ address: contract, abi: accessControlAbi, functionName: getter }) : zeroHash;
    if (await publicClient.readContract({ address: contract, abi: accessControlAbi, functionName: "hasRole", args: [roleId, address] })) return true;
  }
  return false;
}

export async function requireWalletRole(request: Request, roles: ProductRole[]): Promise<WalletSession> {
  const session = readWalletSession(request)!;
  for (const role of roles) if (await walletHasRole(session.address, role)) return session;
  throw authorizationError(`Wallet ${session.address} does not hold one of the required on-chain roles: ${roles.join(", ")}`);
}

export function requireSessionAddress(session: WalletSession, candidate: unknown, field = "wallet address") {
  let address: Address;
  try { address = getAddress(String(candidate ?? "")); } catch { throw validationError(`${field} must be a valid Ethereum address`); }
  if (address !== session.address) throw authorizationError(`${field} must match the authenticated wallet`);
}

export function requireGameService(request: Request) {
  const configured = process.env.GAME_SERVICE_SECRET;
  if (!configured && process.env.NODE_ENV !== "production") return;
  if (!configured || configured.length < 32) throw new Error("GAME_SERVICE_SECRET must contain at least 32 characters in production");
  const supplied = request.headers.get("x-game-service-key") || "";
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw authenticationError("A valid game-service credential is required");
}
