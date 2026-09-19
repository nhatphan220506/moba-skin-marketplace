import { createHash, timingSafeEqual } from "node:crypto";
import { getAddress } from "viem";

import { authenticationError } from "@/lib/server/api";
import { createPrototypeAccessSession } from "@/lib/server/walletAuth";

const DEFAULT_PASSWORD_HASH = "1546688a3cc6ef91d02135eb5b0b485e8eafc9a826920002c8e63c86dc5bb2c0";

const prototypeRoles = ["Admin", "Publisher", "Game team", "Verifier", "Artist", "Community voter", "Seller", "Buyer / Player"];

function verifyPassword(password: string) {
  const actual = createHash("sha256").update(password.trim()).digest();
  const expected = Buffer.from(DEFAULT_PASSWORD_HASH, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw authenticationError("Incorrect access password");
}

export async function grantDiscoverAccess(addressInput: string, password: string) {
  verifyPassword(password);
  const address = getAddress(addressInput);
  return {
    ...createPrototypeAccessSession({ address, chainId: 11155111, expiresAt: Math.floor(Date.now() / 1000) }),
    roles: prototypeRoles,
    transactionHashes: [],
  };
}
