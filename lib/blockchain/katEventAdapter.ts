import type { ActivationRecord } from "@/types/activation";

export type MintedEntitlementEvidence = {
  transactionHash: `0x${string}`;
  eventName: "EntitlementMinted";
  designId: number;
  tokenId: number;
  amount: 1;
  owner: `0x${string}`;
};

export type TransferredEntitlementEvidence = {
  transactionHash: `0x${string}`;
  eventName: "EntitlementTransferred";
  designId: number;
  tokenId: number;
  amount: 1;
  previousOwner: `0x${string}`;
  newOwner: `0x${string}`;
};

export type KatEntitlementEvidence =
  | MintedEntitlementEvidence
  | TransferredEntitlementEvidence;

export type KatApiError = {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
};

export type EntitlementSyncResult = {
  activated: ActivationRecord;
  revoked?: ActivationRecord;
};

type RequestFn = <T>(path: string, init: RequestInit) => Promise<T>;

async function defaultRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = (await response.json()) as T | KatApiError;
  if (!response.ok) {
    const apiError = payload as KatApiError;
    throw new Error(`${apiError.code}: ${apiError.message}`);
  }
  return payload as T;
}

/**
 * Boundary for Văn's future receipt parser. Input must be normalized evidence from
 * a validated receipt; this adapter deliberately does not parse or authenticate it.
 */
export async function syncKatEntitlementEvent(
  evidence: KatEntitlementEvidence,
  request: RequestFn = defaultRequest,
): Promise<EntitlementSyncResult> {
  const body = JSON.stringify({ evidence });
  const init = { method: "POST", headers: { "content-type": "application/json" }, body };

  if (evidence.eventName === "EntitlementMinted") {
    return { activated: await request<ActivationRecord>("/api/game/activate", init) };
  }

  // Order is intentional: the seller loses game access before delivery is attempted.
  const revoked = await request<ActivationRecord>("/api/game/revoke", init);
  const activated = await request<ActivationRecord>("/api/game/activate", init);
  return { revoked, activated };
}

export async function retryKatDelivery(
  activationId: string,
  request: RequestFn = defaultRequest,
): Promise<ActivationRecord> {
  return request<ActivationRecord>("/api/game/retry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ activationId }),
  });
}
