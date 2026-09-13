import type { ActivationRecord } from "@/types/activation";

import { notFoundError, validationError } from "@/lib/server/api";
import { hashJson } from "@/lib/server/hashing";
import { readCollection, updateCollection } from "@/lib/server/storage";
import { getAccountLink, normalizeWallet, validateWallet } from "@/lib/mock-game/accountLinkService";

const BASE_TIMESTAMP = 1788948400;

type EvidenceBase = {
  transactionHash: `0x${string}`;
  designId: number;
  tokenId: number;
  amount: number;
};

export type MintEvidence = EvidenceBase & {
  eventName: "EntitlementMinted";
  owner: `0x${string}`;
};

export type TransferEvidence = EvidenceBase & {
  eventName: "EntitlementTransferred";
  previousOwner: `0x${string}`;
  newOwner: `0x${string}`;
};

type LegacyRevocationEvidence = EvidenceBase & {
  eventName: "EntitlementTransferred";
  previousOwner: `0x${string}`;
};

export type EntitlementEvidence = MintEvidence | TransferEvidence;
export type ActivationAction = "ACTIVATE" | "REVOKE";

export type StoredActivationRecord = ActivationRecord & {
  action: ActivationAction;
  eventName: EntitlementEvidence["eventName"];
};

export type ActivateInput = { evidence: EntitlementEvidence };
export type LegacyActivateInput = {
  walletAddress: `0x${string}`;
  gameAccountId: string;
  designId: number;
  tokenId: number;
  transactionHash: `0x${string}`;
};
export type RevokeInput = { evidence: TransferEvidence };
export type LegacyRevokeInput = LegacyActivateInput;
export type RetryInput = { activationId: string };

type ActivateRequest = ActivateInput | LegacyActivateInput;
type RevokeRequest = RevokeInput | LegacyRevokeInput;

function validateEvidence(
  evidence: EntitlementEvidence | LegacyRevocationEvidence,
): void {
  if (!/^0x[0-9a-fA-F]{64}$/.test(evidence.transactionHash)) {
    throw validationError("transactionHash must be a 32-byte hexadecimal hash");
  }
  if (!Number.isSafeInteger(evidence.designId) || evidence.designId <= 0) {
    throw validationError("designId must be a positive integer");
  }
  if (!Number.isSafeInteger(evidence.tokenId) || evidence.tokenId <= 0) {
    throw validationError("tokenId must be a positive integer");
  }
  if (evidence.amount !== 1) {
    throw validationError("entitlement event amount must equal 1");
  }
  if (evidence.eventName === "EntitlementMinted") {
    validateWallet(evidence.owner);
    if (/^0x0{40}$/i.test(evidence.owner)) {
      throw validationError("owner must not be the zero address");
    }
  } else if (evidence.eventName === "EntitlementTransferred") {
    validateWallet(evidence.previousOwner);
    if (/^0x0{40}$/i.test(evidence.previousOwner)) {
      throw validationError("previousOwner must not be the zero address");
    }
    if ("newOwner" in evidence) {
      validateWallet(evidence.newOwner);
      if (/^0x0{40}$/i.test(evidence.newOwner)) {
        throw validationError("newOwner must not be the zero address");
      }
      if (normalizeWallet(evidence.previousOwner) === normalizeWallet(evidence.newOwner)) {
        throw validationError("previousOwner and newOwner must be different");
      }
    }
  } else {
    throw validationError("eventName is not supported");
  }
}

function idempotencyKey(
  transactionHash: string,
  action: ActivationAction,
  designId: number,
  tokenId: number,
): string {
  return `${transactionHash.toLowerCase()}:${action}:${designId}:${tokenId}`;
}

function recordId(key: string): string {
  return `activation-${hashJson(key).slice(2, 14)}`;
}

export async function activateEntitlement(
  input: ActivateRequest,
): Promise<StoredActivationRecord> {
  const evidence: EntitlementEvidence = "evidence" in input
    ? input.evidence
    : {
        transactionHash: input.transactionHash,
        eventName: "EntitlementMinted",
        designId: input.designId,
        tokenId: input.tokenId,
        amount: 1,
        owner: input.walletAddress,
      };
  validateEvidence(evidence);
  const walletAddress =
    evidence.eventName === "EntitlementMinted" ? evidence.owner : evidence.newOwner;
  const account = await getAccountLink(walletAddress);
  if ("gameAccountId" in input && input.gameAccountId !== account.gameAccountId) {
    throw validationError("gameAccountId does not match the linked wallet account");
  }
  const records = await readCollection<StoredActivationRecord[]>("activations", []);
  const key = idempotencyKey(
    evidence.transactionHash,
    "ACTIVATE",
    evidence.designId,
    evidence.tokenId,
  );
  const existing = records.find((record) => record.activationId === recordId(key));
  if (existing) return existing;

  const pendingOnce = account.gameAccountId.endsWith("-pending-once");
  const timestamp = BASE_TIMESTAMP + records.length + 1;
  const record: StoredActivationRecord = {
    activationId: recordId(key),
    walletAddress: account.walletAddress,
    gameAccountId: account.gameAccountId,
    designId: evidence.designId,
    tokenId: evidence.tokenId,
    transactionHash: evidence.transactionHash,
    status: pendingOnce ? "DELIVERY_PENDING" : "ACTIVE",
    attemptCount: 1,
    ...(pendingOnce ? { lastError: "Simulated first-delivery failure" } : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
    action: "ACTIVATE",
    eventName: evidence.eventName,
  };
  await updateCollection<StoredActivationRecord[]>("activations", [], (current) => [
    ...current,
    record,
  ]);
  return record;
}

export async function revokeEntitlement(
  input: RevokeRequest,
): Promise<StoredActivationRecord> {
  const evidence: TransferEvidence | LegacyRevocationEvidence = "evidence" in input
    ? input.evidence
    : {
        transactionHash: input.transactionHash,
        eventName: "EntitlementTransferred",
        designId: input.designId,
        tokenId: input.tokenId,
        amount: 1,
        previousOwner: input.walletAddress,
      };
  validateEvidence(evidence);
  const account = await getAccountLink(evidence.previousOwner);
  if ("gameAccountId" in input && input.gameAccountId !== account.gameAccountId) {
    throw validationError("gameAccountId does not match the linked wallet account");
  }
  const records = await readCollection<StoredActivationRecord[]>("activations", []);
  const key = idempotencyKey(
    evidence.transactionHash,
    "REVOKE",
    evidence.designId,
    evidence.tokenId,
  );
  const existing = records.find((record) => record.activationId === recordId(key));
  if (existing) return existing;

  const timestamp = BASE_TIMESTAMP + records.length + 1;
  const record: StoredActivationRecord = {
    activationId: recordId(key),
    walletAddress: account.walletAddress,
    gameAccountId: account.gameAccountId,
    designId: evidence.designId,
    tokenId: evidence.tokenId,
    transactionHash: evidence.transactionHash,
    status: "REVOKED",
    attemptCount: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    action: "REVOKE",
    eventName: evidence.eventName,
  };
  await updateCollection<StoredActivationRecord[]>("activations", [], (current) => [
    ...current,
    record,
  ]);
  return record;
}

export async function retryActivation(input: RetryInput): Promise<StoredActivationRecord> {
  let result: StoredActivationRecord | undefined;
  await updateCollection<StoredActivationRecord[]>("activations", [], (records) =>
    records.map((record) => {
      if (record.activationId !== input.activationId) return record;
      if (record.status === "ACTIVE") {
        result = record;
        return record;
      }
      if (record.status !== "DELIVERY_PENDING" || record.action !== "ACTIVATE") {
        throw validationError("only pending activation delivery can be retried");
      }
      const { lastError: _lastError, ...withoutError } = record;
      result = {
        ...withoutError,
        status: "ACTIVE",
        attemptCount: record.attemptCount + 1,
        updatedAt: record.updatedAt + 1,
      };
      return result;
    }),
  );
  if (!result) {
    throw notFoundError(`Activation ${input.activationId} was not found`);
  }
  return result;
}

export async function getActivationStatus(
  walletAddress: string,
  designId: number,
): Promise<StoredActivationRecord> {
  validateWallet(walletAddress);
  if (!Number.isSafeInteger(designId) || designId <= 0) {
    throw validationError("designId must be a positive integer");
  }
  const records = await readCollection<StoredActivationRecord[]>("activations", []);
  const wallet = normalizeWallet(walletAddress);
  const record = [...records]
    .reverse()
    .find(
      (candidate) =>
        normalizeWallet(candidate.walletAddress) === wallet && candidate.designId === designId,
    );
  if (!record) {
    throw notFoundError(`Activation status for wallet and design ${designId} was not found`);
  }
  return record;
}
