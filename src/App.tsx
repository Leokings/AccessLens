import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AuditReport } from "./components/AuditReport";
import { LensMark } from "./components/LensMark";
import { normalizePublicUrl, shortAddress, verdictLabel } from "./lib/audit";
import {
  CONTRACT_ADDRESS,
  CONTRACT_EXPLORER_URL,
  GITHUB_URL,
  transactionExplorerUrl,
} from "./lib/config";
import type { AuditRecord, AuditStatus, ConnectedWallet, ContractInfo, WalletKind } from "./types";

const IDLE_STATUS: AuditStatus = {
  phase: "idle",
  message: "Ready when you are.",
};

function friendlyError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (message.includes("URL_SCHEME")) return "Use an HTTPS website address.";
  if (message.includes("URL_HOST")) return "Use a public domain, not localhost or an IP address.";
  if (message.includes("PAGE_RENDER")) return "The page could not be rendered right now. Check that it is public, then retry.";
  if (message.includes("PAGE_EMPTY")) return "The page rendered without enough content to audit.";
  if (message.includes("REQUEST_REFERENCE_EXISTS")) return "This request was already submitted. Refresh the audit ledger to see it.";
  if (/user rejected|denied|rejected the request/i.test(message)) return "The wallet request was cancelled.";
  return message.replace(/^Error:\s*/, "");
}

function statusCopy(phase: "signing" | "submitted" | "finalizing" | "reading"): string {
  if (phase === "signing") return "Waiting for your wallet signature…";
  if (phase === "submitted") return "Transaction submitted to StudioNet.";
  if (phase === "finalizing") return "Validators are rendering the page and reviewing the evidence…";
  return "Finalized. Reading the immutable report…";
}

function App() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditRecord[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [url, setUrl] = useState("");
  const [focus, setFocus] = useState("");
  const [previousAuditId, setPreviousAuditId] = useState(0);
  const [status, setStatus] = useState<AuditStatus>(IDLE_STATUS);
  const [connecting, setConnecting] = useState<WalletKind | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerError, setLedgerError] = useState("");
  const [search, setSearch] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const busy = ["signing", "submitted", "finalizing", "reading"].includes(status.phase);
  const filteredAudits = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return recentAudits;
    return recentAudits.filter(
      (audit) =>
        audit.domain.toLowerCase().includes(needle) ||
        audit.url.toLowerCase().includes(needle) ||
        String(audit.auditId) === needle.replace(/^#/, ""),
    );
  }, [recentAudits, search]);

  async function refreshLedger() {
    setLoadingLedger(true);
    setLedgerError("");
    try {
      const { getContractInfo, getRecentAudits } = await import("./lib/genlayer");
      const [info, audits] = await Promise.all([getContractInfo(), getRecentAudits(12)]);
      setContractInfo(info);
      setRecentAudits(audits);
    } catch (cause) {
      setLedgerError(friendlyError(cause));
    } finally {
      setLoadingLedger(false);
    }
  }

  useEffect(() => {
    void import("./lib/genlayer").then(({ restoreStudioWallet }) => {
      setWallet((current) => current ?? restoreStudioWallet());
    });
    void refreshLedger();
  }, []);

  async function handleConnect(kind: WalletKind) {
    setConnecting(kind);
    setStatus(IDLE_STATUS);
    try {
      const { connectWallet } = await import("./lib/genlayer");
      setWallet(await connectWallet(kind));
    } catch (cause) {
      setStatus({ phase: "error", message: friendlyError(cause) });
    } finally {
      setConnecting(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || busy) return;
    try {
      const canonicalUrl = normalizePublicUrl(url);
      setUrl(canonicalUrl);
      setStatus({ phase: "signing", message: statusCopy("signing") });
      const { submitAudit } = await import("./lib/genlayer");
      const { audit, hash } = await submitAudit(
        wallet,
        { url: canonicalUrl, focus, previousAuditId },
        (phase, transactionHash) => {
          setStatus({ phase, message: statusCopy(phase), hash: transactionHash });
        },
      );
      setSelectedAudit(audit);
      setRecentAudits((current) => [audit, ...current.filter((item) => item.auditId !== audit.auditId)]);
      setContractInfo((current) => (current ? { ...current, auditCount: current.auditCount + 1 } : current));
      setPreviousAuditId(0);
      setStatus({ phase: "success", message: `Audit #${audit.auditId} is finalized and stored.`, hash });
      window.setTimeout(() => document.getElementById(`report-title-${audit.auditId}`)?.focus(), 50);
    } catch (cause) {
      setStatus((current) => ({
        phase: "error",
        message: friendlyError(cause),
        hash: "hash" in current ? current.hash : undefined,
      }));
    }
  }

  function handleReaudit(audit: AuditRecord) {
    setUrl(audit.url);
    setFocus("");
    setPreviousAuditId(audit.auditId);
    setSelectedAudit(null);
    setStatus({ phase: "idle", message: `Ready to compare against audit #${audit.auditId}.` });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AccessLens home">
          <LensMark compact />
          <span>AccessLens</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#audit-form">Run an audit</a>
          <a href="#how-it-works">How it works</a>
          <a href="#audit-ledger">Audit ledger</a>
        </nav>
        <a className="network-pill" href={CONTRACT_EXPLORER_URL} target="_blank" rel="noreferrer">
          <span /> StudioNet live
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__copy">
            <div className="eyebrow-chip"><span>✦</span> Consensus website reviews</div>
            <h1 id="hero-title">See what your interface makes people <em>fight through.</em></h1>
            <p>
              Paste any public page. GenLayer validators independently inspect its rendered HTML for
              accessibility barriers, dark patterns, and missing trust signals—then store one reviewable report.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#audit-form">Audit a page <span aria-hidden="true">↘</span></a>
              <a className="text-link" href="#how-it-works">See the method <span aria-hidden="true">→</span></a>
            </div>
            <ul className="hero__proofs" aria-label="Product guarantees">
              <li><span>✓</span> No API key</li>
              <li><span>✓</span> Gasless StudioNet</li>
              <li><span>✓</span> On-chain evidence</li>
            </ul>
          </div>

          <div className="hero-visual" aria-label="A lens examining accessibility, dark patterns, and trust">
            <div className="orbit orbit--one"><span>ACCESS</span></div>
            <div className="orbit orbit--two"><span>TRUST</span></div>
            <div className="orbit orbit--three"><span>CHOICE</span></div>
            <div className="hero-lens"><LensMark /></div>
            <div className="signal-card signal-card--top"><b>01</b><span>Rendered page</span></div>
            <div className="signal-card signal-card--bottom"><b>05</b><span>Validator votes</span></div>
          </div>
        </section>

        <section className="audit-station" aria-labelledby="audit-heading">
          <div className="audit-station__intro">
            <span className="eyebrow">Start here</span>
            <h2 id="audit-heading">Give a page a fair second look.</h2>
            <p>No setup jargon. Choose a wallet, paste the exact page, and let validators do the reading.</p>
          </div>

          <form id="audit-form" className="audit-form" ref={formRef} onSubmit={handleSubmit}>
            <div className="step-row">
              <span className="step-number">1</span>
              <div className="step-row__body">
                <div className="field-heading">
                  <div>
                    <h3>Choose how to sign</h3>
                    <p>The temporary wallet is the fastest reviewer path and disappears when this tab closes.</p>
                  </div>
                  {wallet ? <span className="connected-chip">Connected</span> : null}
                </div>
                {wallet ? (
                  <div className="wallet-card">
                    <div className="wallet-card__icon" aria-hidden="true">◎</div>
                    <div><strong>{wallet.kind === "studio" ? "Temporary Studio wallet" : "Browser wallet"}</strong><code>{shortAddress(wallet.address)}</code></div>
                    <button type="button" className="text-button" onClick={() => setWallet(null)}>Change</button>
                  </div>
                ) : (
                  <div className="wallet-options">
                    <button className="wallet-option wallet-option--recommended" type="button" onClick={() => void handleConnect("studio")} disabled={connecting !== null}>
                      <span className="wallet-option__icon" aria-hidden="true">✦</span>
                      <span><strong>{connecting === "studio" ? "Creating wallet…" : "Use instant Studio wallet"}</strong><small>Recommended · free · no extension</small></span>
                      <span aria-hidden="true">→</span>
                    </button>
                    <button className="wallet-option" type="button" onClick={() => void handleConnect("browser")} disabled={connecting !== null}>
                      <span className="wallet-option__icon" aria-hidden="true">◇</span>
                      <span><strong>{connecting === "browser" ? "Opening wallet…" : "Connect browser wallet"}</strong><small>MetaMask or another EIP-1193 wallet</small></span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="step-row">
              <span className="step-number">2</span>
              <div className="step-row__body">
                <label htmlFor="site-url">Public page to audit</label>
                <p className="field-help" id="url-help">Use the exact homepage, signup, pricing, checkout, or policy page a visitor sees.</p>
                <div className="url-field">
                  <span aria-hidden="true">https://</span>
                  <input id="site-url" aria-describedby="url-help" type="text" inputMode="url" autoComplete="url" placeholder="your-site.com/signup" value={url.replace(/^https:\/\//, "")} onChange={(event) => setUrl(event.target.value)} required disabled={busy} />
                </div>
                <details className="focus-details">
                  <summary>Add an optional review focus</summary>
                  <label htmlFor="audit-focus">What journey deserves extra attention?</label>
                  <textarea id="audit-focus" maxLength={280} placeholder="For example: Check whether a new visitor can understand pricing and cancel easily." value={focus} onChange={(event) => setFocus(event.target.value)} disabled={busy} />
                  <span>{focus.length} / 280</span>
                </details>
                {previousAuditId > 0 ? (
                  <div className="compare-note"><span aria-hidden="true">↻</span><p>This will create a new report linked to audit #{previousAuditId}; the original stays unchanged.</p><button type="button" onClick={() => setPreviousAuditId(0)}>Remove link</button></div>
                ) : null}
              </div>
            </div>

            <div className="submit-row">
              <div className={`status-message status-message--${status.phase}`} role="status" aria-live="polite">
                <span className="status-message__indicator" />
                <div><strong>{status.phase === "error" ? "Needs attention" : status.phase === "success" ? "Stored on-chain" : busy ? "Audit in progress" : "Ready to inspect"}</strong><p>{status.message}</p></div>
                {"hash" in status && status.hash ? <a href={transactionExplorerUrl(status.hash)} target="_blank" rel="noreferrer">Transaction ↗</a> : null}
              </div>
              <button className="button button--primary button--submit" type="submit" disabled={!wallet || !url.trim() || busy}>
                {busy ? <><span className="spinner" /> Validators are looking</> : <>Run consensus audit <span aria-hidden="true">↗</span></>}
              </button>
            </div>
          </form>
        </section>

        {selectedAudit ? <AuditReport audit={selectedAudit} onReaudit={handleReaudit} /> : null}

        <section id="how-it-works" className="method" aria-labelledby="method-title">
          <div className="section-heading section-heading--light">
            <div><span className="eyebrow">The method</span><h2 id="method-title">One page. Three lenses. Five independent checks.</h2></div>
            <p>AccessLens keeps the policy fixed and treats every word on the target site as untrusted evidence.</p>
          </div>
          <div className="method-grid">
            <article><span className="method-icon" aria-hidden="true">⌁</span><b>01</b><h3>Render the real page</h3><p>Validators open the public HTTPS URL and inspect its live HTML—not a description pasted by the submitter.</p></article>
            <article><span className="method-icon" aria-hidden="true">A</span><b>02</b><h3>Test three dimensions</h3><p>Semantic accessibility, freedom from manipulative patterns, and the clarity of important trust information.</p></article>
            <article><span className="method-icon" aria-hidden="true">✓</span><b>03</b><h3>Validate the report</h3><p>Findings need exact page evidence. Other validators reject invented claims, missing high-risk issues, or a wrong risk band.</p></article>
            <article><span className="method-icon" aria-hidden="true">#</span><b>04</b><h3>Keep the trail</h3><p>The scores, findings, page digest, policy version, requester, and prior-audit link become a durable record.</p></article>
          </div>
        </section>

        <section id="audit-ledger" className="ledger" aria-labelledby="ledger-title">
          <div className="section-heading">
            <div><span className="eyebrow">Public audit ledger</span><h2 id="ledger-title">What the network has reviewed</h2></div>
            <div className="ledger-health"><span className={ledgerError ? "health-dot health-dot--error" : "health-dot"} />{contractInfo ? `Contract v${contractInfo.contractVersion} · ${contractInfo.auditCount} finalized` : ledgerError ? "Read unavailable" : "Reading StudioNet…"}</div>
          </div>

          <div className="ledger-tools">
            <label htmlFor="ledger-search">Find by domain or audit number</label>
            <div><span aria-hidden="true">⌕</span><input id="ledger-search" type="search" placeholder="example.com or #12" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" onClick={() => void refreshLedger()} disabled={loadingLedger}>{loadingLedger ? "Refreshing…" : "Refresh"}</button></div>
          </div>

          {ledgerError ? <div className="ledger-notice ledger-notice--error"><strong>StudioNet could not be read.</strong><p>{ledgerError}</p></div> : null}
          {!ledgerError && loadingLedger && recentAudits.length === 0 ? <div className="ledger-notice"><span className="spinner spinner--dark" /><p>Reading finalized audits…</p></div> : null}
          {!ledgerError && !loadingLedger && filteredAudits.length === 0 ? <div className="ledger-notice"><strong>{search ? "No matching audit" : "The ledger is ready for its first page."}</strong><p>{search ? "Try a domain name or another audit number." : "Run an audit above and the finalized result will appear here."}</p></div> : null}
          <div className="ledger-list">
            {filteredAudits.map((audit) => (
              <button type="button" className="ledger-item" key={audit.auditId} onClick={() => setSelectedAudit(audit)}>
                <span className={`ledger-score ledger-score--${audit.verdict.toLowerCase()}`}>{audit.overallScore}</span>
                <span className="ledger-item__main"><strong>{audit.domain}</strong><small>Audit #{audit.auditId} · {new Date(audit.createdAt * 1000).toLocaleDateString()}</small></span>
                <span className="ledger-verdict">{verdictLabel(audit.verdict)}</span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand"><LensMark compact /><span>AccessLens</span></div>
        <p>Public-interest interface evidence, resolved by GenLayer consensus.</p>
        <div><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a><a href={CONTRACT_EXPLORER_URL} target="_blank" rel="noreferrer">Contract ↗</a><code>{shortAddress(CONTRACT_ADDRESS)}</code></div>
      </footer>
    </div>
  );
}

export default App;
