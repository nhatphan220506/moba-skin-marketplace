import {
  activateEntitlement,
  revokeEntitlement,
  type EntitlementEvidence,
  type StoredActivationRecord,
} from "@/lib/mock-game/activationService";

export type EventSyncResult = {
  activated: StoredActivationRecord;
  revoked?: StoredActivationRecord;
};

export async function syncEntitlementEvent(
  evidence: EntitlementEvidence,
): Promise<EventSyncResult> {
  if (evidence.eventName === "EntitlementMinted") {
    return { activated: await activateEntitlement({ evidence }) };
  }

  const revoked = await revokeEntitlement({ evidence });
  const activated = await activateEntitlement({ evidence });
  return { revoked, activated };
}
