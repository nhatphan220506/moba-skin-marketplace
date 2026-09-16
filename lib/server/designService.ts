import { randomUUID } from "node:crypto";
import { verifyMessage } from "viem";

import { validationError } from "@/lib/server/api";
import { readCollection, updateCollection } from "@/lib/server/storage";
import type { DesignLifecycle, DesignStage, DesignSubmission } from "@/types/design";

type IndexedEvent = {
  transactionHash: string;
  eventName: string;
  designId?: string | number | null;
  auctionId?: string | number | null;
  arguments?: Record<string, unknown>;
};

const categories = new Set(["Tank", "Assassin", "Mage", "Marksman", "Support"]);

function clean(value: unknown, field: string, max = 160): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw validationError(`${field} is required and must be at most ${max} characters`);
  return value.trim();
}

function wallet(value: unknown): string {
  const parsed = clean(value, "creatorWallet", 42);
  if (!/^0x[0-9a-f]{40}$/i.test(parsed)) throw validationError("creatorWallet must be a valid address");
  return parsed.toLowerCase();
}

export async function createDesignSubmission(input: Record<string, unknown>): Promise<DesignSubmission> {
  const category = clean(input.category, "category", 20);
  if (!categories.has(category)) throw validationError("category is not supported");
  const artworkHash = clean(input.artworkHash, "artworkHash", 66);
  if (!/^0x[0-9a-f]{64}$/i.test(artworkHash)) throw validationError("artworkHash must be a SHA-256 value");
  const now = Math.floor(Date.now() / 1000);
  const creatorWallet = wallet(input.creatorWallet);
  const authorizationSignature = clean(input.authorizationSignature, "authorizationSignature", 132) as `0x${string}`;
  const authorizationTimestamp = Number(input.authorizationTimestamp);
  if (!Number.isSafeInteger(authorizationTimestamp) || Math.abs(now - authorizationTimestamp) > 300) throw validationError("submission authorization has expired");
  const authorizationMessage = `MOBA Forge submission\nCreator: ${creatorWallet}\nArtwork SHA-256: ${artworkHash.toLowerCase()}\nTimestamp: ${authorizationTimestamp}`;
  if (!/^0x[0-9a-f]{130}$/i.test(authorizationSignature) || !(await verifyMessage({ address: creatorWallet as `0x${string}`, message: authorizationMessage, signature: authorizationSignature }))) throw validationError("submission wallet signature is invalid");
  const record: DesignSubmission = {
    localId: `draft-${randomUUID()}`,
    creatorWallet,
    name: clean(input.name, "name", 80),
    description: clean(input.description, "description", 600),
    game: clean(input.game, "game", 80),
    category: category as DesignSubmission["category"],
    edition: typeof input.edition === "string" && input.edition.trim() ? input.edition.trim().slice(0, 40) : "Concept",
    fileId: clean(input.fileId, "fileId", 100),
    fileName: clean(input.fileName, "fileName", 180),
    storageURI: clean(input.storageURI, "storageURI", 500),
    artworkHash: artworkHash.toLowerCase() as `0x${string}`,
    aiDisclosure: clean(input.aiDisclosure, "aiDisclosure", 500),
    provenance: clean(input.provenance, "provenance", 500),
    authorizationSignature,
    createdAt: now,
    updatedAt: now,
  };
  let result = record;
  await updateCollection<DesignSubmission[]>("productDesigns", [], current => { const existing=current.find(candidate => candidate.authorizationSignature.toLowerCase() === authorizationSignature.toLowerCase()); if (existing) { result=existing; return current; } return [...current, record]; });
  return result;
}

async function indexedEvents(): Promise<IndexedEvent[]> {
  try {
    const { getIndexedEventRecords } = await import("@/lib/server/indexedEvidence");
    return await getIndexedEventRecords();
  } catch { return []; }
}

function idOf(event: IndexedEvent): number | undefined {
  const raw = event.designId ?? event.arguments?.designId;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function truth(events: IndexedEvent[], name: string): boolean { return events.some(event => event.eventName === name); }

function project(record: DesignSubmission, allEvents: IndexedEvent[]): DesignLifecycle {
  const submission = [...allEvents].reverse().find(event => event.eventName === "DesignSubmitted" && String(event.arguments?.artworkHash ?? "").toLowerCase() === record.artworkHash.toLowerCase());
  const designId = record.designId ?? (submission ? idOf(submission) : undefined);
  const events = designId ? allEvents.filter(event => idOf(event) === designId || Number(event.arguments?.winnerDesignId) === designId) : [];
  const gates = {
    submitted: Boolean(submission || designId),
    verified: truth(events, "DesignVerified"),
    publisherEligible: events.some(event => event.eventName === "ConceptEligibilityUpdated" && event.arguments?.eligible !== false),
    votingWinner: events.some(event => event.eventName === "VotingFinalized" && Number(event.arguments?.winnerDesignId) === designId),
    agreementRecorded: truth(events, "AgreementRecorded"),
    productionSubmitted: truth(events, "ProductionSubmitted"),
    technicalApproved: truth(events, "CompatibilityApproved"),
    auctionOpen: truth(events, "AuctionCreated"),
    sold: truth(events, "AuctionSettled") || truth(events, "EntitlementMinted"),
  };
  let stage: DesignStage = "DRAFT";
  if (gates.submitted) stage = "SUBMITTED";
  if (truth(events, "DesignRevisionRequested")) stage = "REVISION_REQUIRED";
  if (gates.verified) stage = "VERIFIED";
  if (gates.publisherEligible) stage = "VOTING_ELIGIBLE";
  if (gates.votingWinner) stage = "SELECTED";
  if (gates.agreementRecorded) stage = "AGREEMENT_RECORDED";
  if (gates.productionSubmitted) stage = "TECHNICAL_REVIEW";
  if (gates.verified && gates.publisherEligible && gates.votingWinner && gates.agreementRecorded && gates.technicalApproved) stage = "MARKET_READY";
  if (gates.auctionOpen) stage = "AUCTION_OPEN";
  if (gates.sold) stage = "SOLD";
  const lastSuspend = [...events].reverse().find(event => event.eventName === "DesignSuspended" || event.eventName === "DesignReinstated");
  const suspended = lastSuspend?.eventName === "DesignSuspended";
  if (suspended) stage = "SUSPENDED";
  const auctionEvent=[...events].reverse().find(event=>event.eventName==="AuctionCreated"); const auctionId=Number(auctionEvent?.auctionId??auctionEvent?.arguments?.auctionId);
  return { ...record, designId, stage, public: !suspended && ["MARKET_READY", "AUCTION_OPEN", "SOLD"].includes(stage), suspended, transactionHash: submission?.transactionHash, auctionId:Number.isSafeInteger(auctionId)&&auctionId>0?auctionId:undefined, gates };
}

export async function listDesignLifecycles(): Promise<DesignLifecycle[]> {
  const [records, events] = await Promise.all([readCollection<DesignSubmission[]>("productDesigns", []), indexedEvents()]);
  return records.map(record => project(record, events)).sort((a, b) => b.updatedAt - a.updatedAt);
}
