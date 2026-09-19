"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { WalletControl } from "@/components/product/WalletControl";
import { useWalletSession } from "@/components/product/useWalletSession";
import { apiFetch } from "@/lib/product/apiClient";

type GrantResult = { roles?: string[]; transactionHashes?: string[]; message?: string };

export function DiscoverAccessModal() {
  const [open, setOpen] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GrantResult | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { ensureSession } = useWalletSession();

  useEffect(() => {
    if (!open) return;
    const provider = (window as Window & { ethereum?: { isMetaMask?: boolean } }).ethereum;
    setHasMetaMask(Boolean(provider?.isMetaMask));
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function grantAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!address || chainId !== 11155111) return;
    setBusy(true); setError(""); setResult(null);
    try {
      await ensureSession();
      const response = await apiFetch("/api/access/grant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }, address);
      const data = await response.json() as GrantResult;
      if (!response.ok) throw new Error(data.message || "Access could not be granted");
      setResult(data); setPassword("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Access could not be granted"); }
    finally { setBusy(false); }
  }

  return <>
    <button className="discover-trigger" onClick={() => { setOpen(true); setError(""); }}>Discover</button>
    {open && typeof document !== "undefined" && createPortal(<div className="discover-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="discover-modal" role="dialog" aria-modal="true" aria-labelledby="discover-access-title">
        <button className="discover-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        <p className="eyebrow">FULL PROTOTYPE ACCESS</p>
        <h2 id="discover-access-title">Make sure MetaMask is installed.</h2>
        <p className="discover-intro">MetaMask is required to explore every role and sign actions on the Sepolia test network. We will never ask for your seed phrase or private key.</p>
        <div className={`metamask-check ${hasMetaMask ? "ready" : "missing"}`}>
          <span>{hasMetaMask ? "✓" : "!"}</span><div><strong>{hasMetaMask ? "MetaMask detected" : "MetaMask not detected"}</strong><small>{hasMetaMask ? "Connect your wallet to continue." : "Install the extension, then refresh this page."}</small></div>
          {!hasMetaMask && <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Install MetaMask ↗</a>}
        </div>
        {!isConnected ? <div className="discover-wallet-step"><span>01</span><div><strong>Connect your wallet</strong><small>Your wallet will receive the prototype roles.</small></div><WalletControl /></div>
          : chainId !== 11155111 ? <div className="discover-wallet-step"><span>02</span><div><strong>Switch to Sepolia</strong><small>Role grants are available on the public test network only.</small></div><button onClick={() => switchChain({ chainId: 11155111 })}>Switch network</button></div>
          : <form className="discover-access-form" onSubmit={grantAccess}>
            <label htmlFor="discover-password">Access password<input id="discover-password" type="password" autoComplete="off" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter the reviewer password" /></label>
            <button disabled={busy || !password}>{busy ? "Granting roles on Sepolia…" : "Grant full prototype access"}</button>
          </form>}
        {busy && <p className="discover-progress">Keep this window open while the Sepolia transactions confirm.</p>}
        {error && <p className="discover-error" role="alert">{error}</p>}
        {result && <div className="discover-success"><strong>Access granted.</strong><p>{result.roles?.length || 0} roles are active for this wallet. You can now explore every workspace.</p><Link className="button-link" href="/explore" onClick={() => setOpen(false)}>Enter Discover ↗</Link></div>}
      </section>
    </div>, document.body)}
  </>;
}
