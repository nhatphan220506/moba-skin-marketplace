"use client";

import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";

import { apiFetch, apiUrl, storeSession, storedSession } from "@/lib/product/apiClient";

export function useWalletSession() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const ensureSession = useCallback(async () => {
    if (!address) throw new Error("Connect your wallet first");
    const existing = storedSession(address);
    if (existing) return existing;
    const challengeResponse = await fetch(apiUrl(`/api/auth/challenge?address=${address}`), { cache: "no-store" });
    const challenge = await challengeResponse.json() as { nonce?: string; message?: string } & Record<string, unknown>;
    if (!challengeResponse.ok || !challenge.nonce || !challenge.message) throw new Error(String(challenge.message || "Could not create wallet challenge"));
    const signature = await signMessageAsync({ message: challenge.message });
    const sessionResponse = await fetch(apiUrl("/api/auth/session"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, nonce: challenge.nonce, signature }) });
    const session = await sessionResponse.json() as { token?: string; message?: string };
    if (!sessionResponse.ok || !session.token) throw new Error(session.message || "Wallet session could not be created");
    storeSession(address, session.token);
    return session.token;
  }, [address, signMessageAsync]);
  const authenticatedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    await ensureSession();
    return apiFetch(path, init, address);
  }, [address, ensureSession]);
  return { address, ensureSession, authenticatedFetch };
}
