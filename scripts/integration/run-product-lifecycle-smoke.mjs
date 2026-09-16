import { readFile } from "node:fs/promises";
import path from "node:path";

import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from "ethers";

const baseUrl = process.env.PRODUCT_BASE_URL ?? "http://localhost:3000";
const rpcUrl = process.env.LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
const artistKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

async function main() {
  const deployment = JSON.parse(await readFile(path.resolve("deployments/localhost.json"), "utf8"));
  const artifact = JSON.parse(await readFile(path.resolve("artifacts/contracts/AssetRegistry.sol/AssetRegistry.json"), "utf8"));
  const provider = new JsonRpcProvider(rpcUrl, 31337);
  const artist = new Wallet(artistKey, provider);
  const uploadForm = new FormData();
  uploadForm.set("designId", String(Date.now())); uploadForm.set("category", "concept-art"); uploadForm.set("file", new File([new TextEncoder().encode(`lifecycle-${Date.now()}`)], "lifecycle-sentinel.png", { type: "image/png" }));
  const uploadResponse = await fetch(`${baseUrl}/api/files/upload`, { method: "POST", body: uploadForm });
  if (!uploadResponse.ok) throw new Error(`Upload failed: ${uploadResponse.status}`);
  const uploaded = await uploadResponse.json();
  const authorizationTimestamp = Math.floor(Date.now()/1000);
  const authorizationMessage = `MOBA Forge submission\nCreator: ${artist.address.toLowerCase()}\nArtwork SHA-256: ${uploaded.sha256.toLowerCase()}\nTimestamp: ${authorizationTimestamp}`;
  const authorizationSignature = await artist.signMessage(authorizationMessage);
  const draftResponse = await fetch(`${baseUrl}/api/designs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ creatorWallet: artist.address, authorizationTimestamp, authorizationSignature, name: "Lifecycle Sentinel", description: "End-to-end receipt projection test asset.", game: "Demo MOBA", category: "Tank", edition: "Concept", aiDisclosure: "Test disclosure", provenance: "Test provenance", fileId: uploaded.fileId, fileName: uploaded.fileName, storageURI: uploaded.storageURI, artworkHash: uploaded.sha256 }) });
  if (!draftResponse.ok) throw new Error(`Draft creation failed: ${draftResponse.status} ${await draftResponse.text()}`);
  const draft = await draftResponse.json();
  const registry = new Contract(deployment.contracts.assetRegistry, artifact.abi, artist);
  const transaction = await registry.submitDesign(draft.storageURI, draft.artworkHash, keccak256(toUtf8Bytes(draft.aiDisclosure)), keccak256(toUtf8Bytes(draft.provenance)));
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Design submission transaction failed");
  async function sync(receiptToSync) { const response=await fetch(`${baseUrl}/api/indexer/transaction`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transactionHash: receiptToSync.hash, chainId: 31337 }) }); if (!response.ok) throw new Error(`Receipt sync failed: ${response.status} ${await response.text()}`); }
  async function send(contract, method, ...args) { const completed=await (await contract[method](...args)).wait(); if (!completed || completed.status !== 1) throw new Error(`${method} failed`); await sync(completed); return completed; }
  await sync(receipt);
  let response = await fetch(`${baseUrl}/api/designs?owner=${artist.address}`);
  if (!response.ok) throw new Error(`Design lookup failed: ${response.status}`);
  let { designs } = await response.json();
  let projected = designs.find(candidate => candidate.artworkHash.toLowerCase() === draft.artworkHash.toLowerCase());
  if (!projected || projected.stage !== "SUBMITTED" || !projected.designId) throw new Error("Confirmed transaction did not advance the product lifecycle");
  const designId=BigInt(projected.designId);
  const verifier=await provider.getSigner(2), publisher=await provider.getSigner(3), developer=await provider.getSigner(4), fan=await provider.getSigner(5), admin=await provider.getSigner(0);
  const votingArtifact=JSON.parse(await readFile(path.resolve("artifacts/contracts/CommunityVoting.sol/CommunityVoting.json"),"utf8"));
  const compatibilityArtifact=JSON.parse(await readFile(path.resolve("artifacts/contracts/CompatibilityRegistry.sol/CompatibilityRegistry.json"),"utf8"));
  const primaryArtifact=JSON.parse(await readFile(path.resolve("artifacts/contracts/PrimaryAuction.sol/PrimaryAuction.json"),"utf8"));
  const verifierRegistry=registry.connect(verifier), publisherRegistry=registry.connect(publisher);
  const voting=new Contract(deployment.contracts.voting,votingArtifact.abi,admin);
  const fanVoting=voting.connect(fan);
  const compatibility=new Contract(deployment.contracts.compatibility,compatibilityArtifact.abi,publisher);
  const developerCompatibility=compatibility.connect(developer);
  const primary=new Contract(deployment.contracts.primary,primaryArtifact.abi,publisher);
  await send(verifierRegistry,"verifyDesign",designId,keccak256(toUtf8Bytes("verified-report")));
  await send(publisherRegistry,"approveConceptEligibility",designId,keccak256(toUtf8Bytes("publisher-review")));
  const latest=await provider.getBlock("latest"); const roundId=BigInt(latest.number+1000); const start=BigInt(latest.timestamp); const end=start+5n;
  await send(voting,"openVoting",roundId,[designId],start,end);
  await send(fanVoting,"vote",roundId,designId);
  await provider.send("evm_increaseTime",[6]); await provider.send("evm_mine",[]);
  await send(voting,"finalizeVoting",roundId);
  await send(publisherRegistry,"recordAgreement",designId,keccak256(toUtf8Bytes("commercial-agreement")),8000,500);
  await send(compatibility,"submitProduction",designId,keccak256(toUtf8Bytes("production-v1")),keccak256(toUtf8Bytes("compatibility-v1")),"v1");
  await send(developerCompatibility,"approveCompatibility",designId,keccak256(toUtf8Bytes("Demo MOBA")),1);
  response=await fetch(`${baseUrl}/api/designs?owner=${artist.address}`); ({designs}=await response.json()); projected=designs.find(candidate=>Number(candidate.designId)===Number(designId));
  if (!projected || projected.stage !== "MARKET_READY" || projected.public !== true) throw new Error(`Expected MARKET_READY publication, received ${projected?.stage}`);
  const current=await provider.getBlock("latest");
  await send(primary,"createAuction",designId,100n*10n**18n,10n*10n**18n,BigInt(current.timestamp),BigInt(current.timestamp+600));
  response=await fetch(`${baseUrl}/api/designs?owner=${artist.address}`); ({designs}=await response.json()); projected=designs.find(candidate=>Number(candidate.designId)===Number(designId));
  if (projected?.stage !== "AUCTION_OPEN" || projected.public !== true) throw new Error(`Expected AUCTION_OPEN, received ${projected?.stage}`);
  const content=await fetch(`${baseUrl}/api/files/content/${draft.fileId}`); if(!content.ok || content.headers.get("content-type")!=="image/png") throw new Error("Private asset content route failed");
  console.log(`PASS draft -> Design #${projected.designId} -> verification -> voting -> agreement -> QA -> MARKET_READY -> AUCTION_OPEN`);
}

main().catch(error => { console.error(error); process.exitCode=1; });
