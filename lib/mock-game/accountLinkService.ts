import type { AccountLink } from "@/types/activation";

import { conflictError, notFoundError, validationError } from "@/lib/server/api";
import { readCollection, updateCollection } from "@/lib/server/storage";

export type LinkAccountInput = {
  walletAddress: `0x${string}`;
  gameAccountId: string;
};

export function normalizeWallet(value: string): string {
  return value.toLowerCase();
}

export function validateWallet(value: string): asserts value is `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw validationError("walletAddress must be a 20-byte hexadecimal address");
  }
}

function validateGameAccountId(value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(value)) {
    throw validationError("gameAccountId must contain 3-64 letters, numbers, underscores, or hyphens");
  }
}

export async function linkAccount(input: LinkAccountInput): Promise<AccountLink> {
  validateWallet(input.walletAddress);
  validateGameAccountId(input.gameAccountId);
  const links = await readCollection<AccountLink[]>("accountLinks", []);
  const wallet = normalizeWallet(input.walletAddress);
  const account = input.gameAccountId.toLowerCase();
  const existingWallet = links.find(
    (link) => normalizeWallet(link.walletAddress) === wallet,
  );
  const existingAccount = links.find(
    (link) => link.gameAccountId.toLowerCase() === account,
  );

  if (existingWallet) {
    if (existingWallet.gameAccountId.toLowerCase() === account) return existingWallet;
    throw conflictError("walletAddress is already linked to another game account");
  }
  if (existingAccount) {
    throw conflictError("gameAccountId is already linked to another wallet");
  }

  const record: AccountLink = {
    walletAddress: input.walletAddress,
    gameAccountId: input.gameAccountId,
    linkedAt: 1788948300 + links.length + 1,
    status: "LINKED",
  };
  await updateCollection<AccountLink[]>("accountLinks", [], (current) => [
    ...current,
    record,
  ]);
  return record;
}

export async function getAccountLink(walletAddress: string): Promise<AccountLink> {
  validateWallet(walletAddress);
  const wallet = normalizeWallet(walletAddress);
  const links = await readCollection<AccountLink[]>("accountLinks", []);
  const link = links.find(
    (candidate) => normalizeWallet(candidate.walletAddress) === wallet,
  );
  if (!link || link.status !== "LINKED") {
    throw notFoundError(`No linked game account was found for ${walletAddress}`);
  }
  return link;
}
