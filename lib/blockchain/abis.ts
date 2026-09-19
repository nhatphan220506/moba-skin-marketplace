import { parseAbi } from "viem";

export const accessControlAbi = parseAbi([
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function ARTIST_ROLE() view returns (bytes32)",
  "function VERIFIER_ROLE() view returns (bytes32)",
  "function PUBLISHER_ROLE() view returns (bytes32)",
  "function GAME_DEVELOPER_ROLE() view returns (bytes32)",
  "function FAN_ROLE() view returns (bytes32)",
]);

export const assetRegistryAbi = parseAbi([
  "function submitDesign(string metadataURI, bytes32 artworkHash, bytes32 aiDisclosureHash, bytes32 provenanceHash) returns (uint256)",
  "function requestRevision(uint256 designId, bytes32 reasonHash)",
  "function verifyDesign(uint256 designId, bytes32 reportHash)",
  "function approveConceptEligibility(uint256 designId, bytes32 reviewHash)",
  "function recordAgreement(uint256 designId, bytes32 agreementHash, uint16 artistPrimaryShareBps, uint16 artistResaleRoyaltyBps)",
  "function suspendDesign(uint256 designId, bytes32 reasonHash)",
  "function reinstateDesign(uint256 designId)",
]);

export const votingAbi = parseAbi([
  "function openVoting(uint256 roundId, uint256[] candidateDesignIds, uint64 startTime, uint64 endTime)",
  "function vote(uint256 roundId, uint256 designId)",
  "function finalizeVoting(uint256 roundId)",
]);

export const compatibilityAbi = parseAbi([
  "function submitProduction(uint256 designId, bytes32 productionHash, bytes32 compatibilityHash, string version)",
  "function approveCompatibility(uint256 designId, bytes32 approvedGameHash, uint256 maxSupply)",
  "function requireRework(uint256 designId, bytes32 reasonHash)",
]);

export const paymentAbi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const primaryAbi = parseAbi([
  "function createAuction(uint256 designId, uint256 reservePrice, uint256 minimumIncrement, uint64 startTime, uint64 endTime) returns (uint256)",
  "function placeBid(uint256 auctionId, uint256 amount)",
  "function withdrawRefund(uint256 auctionId)",
  "function settle(uint256 auctionId)",
  "function cancelAuction(uint256 auctionId)",
  "function withdrawProceeds()",
]);

export const entitlementAbi = parseAbi([
  "function setTransferable(uint256 tokenId, bool transferable)",
  "function pause()",
  "function unpause()",
  "function balanceOf(address account, uint256 tokenId) view returns (uint256)",
]);

export const secondaryAbi = parseAbi([
  "function listForResale(uint256 designId, uint256 tokenId, uint256 price) returns (uint256)",
  "function cancelListing(uint256 listingId)",
  "function buyResale(uint256 listingId)",
  "function withdrawProceeds()",
]);

export const contractAbis = {
  payment: paymentAbi,
  assetRegistry: assetRegistryAbi,
  voting: votingAbi,
  compatibility: compatibilityAbi,
  entitlement: entitlementAbi,
  primary: primaryAbi,
  secondary: secondaryAbi,
} as const;
