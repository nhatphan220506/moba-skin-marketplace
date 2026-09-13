export enum UserRole {
  ADMIN = "ADMIN",
  ARTIST = "ARTIST",
  VERIFIER = "VERIFIER",
  PUBLISHER = "PUBLISHER",
  GAME_DEVELOPER = "GAME_DEVELOPER",
  FAN = "FAN",
  BUYER_SELLER = "BUYER_SELLER",
  MARKETPLACE = "MARKETPLACE",
}

export const DEMO_ACTORS = {
  admin: { signerIndex: 0, role: UserRole.ADMIN },
  artist: { signerIndex: 1, role: UserRole.ARTIST },
  verifier: { signerIndex: 2, role: UserRole.VERIFIER },
  publisher: { signerIndex: 3, role: UserRole.PUBLISHER },
  gameDeveloper: { signerIndex: 4, role: UserRole.GAME_DEVELOPER },
  fanA: { signerIndex: 5, role: UserRole.FAN },
  fanB: { signerIndex: 6, role: UserRole.FAN },
  buyerA: { signerIndex: 7, role: UserRole.BUYER_SELLER },
  buyerB: { signerIndex: 8, role: UserRole.BUYER_SELLER },
  buyerC: { signerIndex: 9, role: UserRole.BUYER_SELLER },
  marketplaceTreasury: { signerIndex: 10, role: UserRole.MARKETPLACE },
} as const;

export type DemoActorName = keyof typeof DEMO_ACTORS;

// The addresses and local private keys are printed by `npx hardhat node`.
// Never replace these signer indexes with real-wallet private keys in source control.
