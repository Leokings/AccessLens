import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AuditReport } from "./components/AuditReport";
import { LensMark } from "./components/LensMark";
import { normalizePublicUrl, shortAddress, verdictLabel } from "./lib/audit";
import {
  CONTRACT_ADDRESS,
  CONTRACT_EXPLORER_URL,
  GITHUB_URL,
  PREVIOUS_CONTRACT_EXPLORER_URL,
  transactionExplorerUrl,
} from "./lib/config";
import type { AuditRecord, AuditStatus, ConnectedWallet, ContractInfo, WalletKind } from "./types";

const IDLE_STATUS: AuditStatus = {
  phase: "idle",
  message: "Connect a wallet and enter a public HTTPS page to enable the audit.",
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
  const [pendingAudit, setPendingAudit] = useState(false);
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

  const showFinalizedAudit = useCallback((audit: AuditRecord, hash: string) => {
    setSelectedAudit(audit);
    setRecentAudits((current) => [audit, ...current.filter((item) => item.auditId !== audit.auditId)]);
    setContractInfo((current) => current ? {
      ...current,
      auditCount: Math.max(current.auditCount, audit.auditId),
    } : current);
    setPendingAudit(false);
    setPreviousAuditId(0);
    setStatus({ phase: "success", message: `Audit #${audit.auditId} is finalized and stored.`, hash });
    window.setTimeout(() => document.getElementById(`report-title-${audit.auditId}`)?.focus(), 50);
  }, []);

  useEffect(() => {
    void import("./lib/genlayer").then(async ({ restoreStudioWallet, getPendingAudit, resumePendingAudit }) => {
      setWallet((current) => current ?? restoreStudioWallet());
      const pending = getPendingAudit();
      if (!pending) return;
      setPendingAudit(true);
      setStatus({ phase: "finalizing", message: statusCopy("finalizing"), hash: pending.hash });
      try {
        const { audit, hash } = await resumePendingAudit((phase, transactionHash) => {
          setStatus({ phase, message: statusCopy(phase), hash: transactionHash });
        });
        showFinalizedAudit(audit, hash);
      } catch (cause) {
        setPendingAudit(Boolean(getPendingAudit()));
        setStatus({ phase: "error", message: friendlyError(cause), hash: pending.hash });
      }
    });
    void refreshLedger();
  }, [showFinalizedAudit]);

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
    if (!wallet || busy || pendingAudit) return;
    try {
      const canonicalUrl = normalizePublicUrl(url);
      setUrl(canonicalUrl);
      setStatus({ phase: "signing", message: statusCopy("signing") });
      const { submitAudit } = await import("./lib/genlayer");
      const { audit, hash } = await submitAudit(
        wallet,
        { url: canonicalUrl, focus, previousAuditId },
        (phase, transactionHash) => {
          if (transactionHash) setPendingAudit(true);
          setStatus({ phase, message: statusCopy(phase), hash: transactionHash });
        },
      );
      showFinalizedAudit(audit, hash);
    } catch (cause) {
      const { getPendingAudit } = await import("./lib/genlayer");
      setPendingAudit(Boolean(getPendingAudit()));
      setStatus((current) => ({
        phase: "error",
        message: friendlyError(cause),
        hash: "hash" in current ? current.hash : undefined,
      }));
    }
  }

  async function handleResume() {
    const { getPendingAudit, resumePendingAudit } = await import("./lib/genlayer");
    const pending = getPendingAudit();
    if (!pending) {
      setPendingAudit(false);
      return;
    }
    setStatus({ phase: "finalizing", message: statusCopy("finalizing"), hash: pending.hash });
    try {
      const { audit, hash } = await resumePendingAudit((phase, transactionHash) => {
        setStatus({ phase, message: statusCopy(phase), hash: transactionHash });
      });
      showFinalizedAudit(audit, hash);
    } catch (cause) {
      setPendingAudit(Boolean(getPendingAudit()));
      setStatus({ phase: "error", message: friendlyError(cause), hash: pending.hash });
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
    <div className="app-shell" lang="en">
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
        <a className="network-pill" href={CONTRACT_EXPLORER_URL} target="_blank" rel="noopener noreferrer" aria-label="StudioNet live contract (opens in a new tab)">
          <span /> StudioNet live
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__copy">
            <div className="eyebrow-chip"><span>✦</span> Consensus website reviews</div>
            <h1 id="hero-title">See what your interface makes people <em>fight through.</em></h1>
            <p>
              Paste a public HTTPS page. GenLayer validators compare the same captured HTML prefix,
              review accessibility, dark-pattern, and trust signals, then store a one-page advisory.
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

            <div className="hero-visual" aria-hidden="true">
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
            <aside className="audit-disclosure" aria-labelledby="before-you-submit">
              <h3 id="before-you-submit">Before you submit</h3>
              <ul>
                <li><strong>Cost:</strong> StudioNet is gasless; no payment or real funds are required.</li>
                <li><strong>Public record:</strong> The URL, focus, scores, findings, and digests are permanently readable on StudioNet.</li>
                <li><strong>Advisory scope:</strong> This is not WCAG certification or a whole-site audit. It cannot test unseen interactions, actual keyboard or screen-reader behavior, or later page changes.</li>
                <li><strong>Evidence limit:</strong> Validators must match a digest of the same first 48,000 whitespace-normalized HTML characters. Exact finding excerpts, not the full HTML, are stored. Dynamic or bot-protected pages may fail without a report.</li>
                <li><strong>Operator &amp; terms:</strong> Built by <a href="https://github.com/Leokings" target="_blank" rel="noopener noreferrer" aria-label="Leokings on GitHub (opens in a new tab)">Leokings</a>. Read the <a href="/privacy.html">privacy notice</a> and <a href="/terms.html">use terms</a> before submitting. <a href="https://github.com/Leokings/AccessLens/issues" target="_blank" rel="noopener noreferrer" aria-label="Contact support through GitHub issues (opens in a new tab)">Contact support</a>.</li>
              </ul>
            </aside>
          </div>

          <form id="audit-form" className="audit-form" ref={formRef} onSubmit={handleSubmit}>
            <div className="step-row">
              <span className="step-number" aria-hidden="true">1</span>
              <div className="step-row__body">
                <div className="field-heading">
                  <div>
                    <h3><span className="sr-only">Step 1 of 2: </span>Choose how to sign</h3>
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
                      <span><strong>{connecting === "studio" ? "Creating wallet…" : "Use instant Studio wallet"}</strong><small>Recommended · free · temporary until this tab closes</small></span>
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
              <span className="step-number" aria-hidden="true">2</span>
              <div className="step-row__body">
                <label htmlFor="site-url"><span className="sr-only">Step 2 of 2: </span>Public page to audit</label>
                <p className="field-help" id="url-help">HTTPS is added automatically. Use the exact homepage, signup, pricing, checkout, or policy page a visitor sees.</p>
                <div className="url-field">
                  <span aria-hidden="true">https://</span>
                  <input id="site-url" aria-describedby="url-help audit-ready-help" type="text" inputMode="url" autoComplete="url" placeholder="your-site.com/signup" value={url.replace(/^https:\/\//, "")} onChange={(event) => setUrl(event.target.value)} required disabled={busy} />
                </div>
                <details className="focus-details">
                  <summary>Add an optional review focus</summary>
                  <label htmlFor="audit-focus">What journey deserves extra attention?</label>
                  <textarea id="audit-focus" aria-describedby="audit-focus-count" maxLength={280} placeholder="For example: Check whether a new visitor can understand pricing and cancel easily." value={focus} onChange={(event) => setFocus(event.target.value)} disabled={busy} />
                  <span id="audit-focus-count">{focus.length} / 280 characters</span>
                  <span className="sr-only" role="status" aria-live="polite">{focus.length >= 230 ? `${280 - focus.length} characters remaining` : ""}</span>
                </details>
                {previousAuditId > 0 ? (
                  <div className="compare-note"><span aria-hidden="true">↻</span><p>This will link a new report to audit #{previousAuditId} for the same URL. The original stays unchanged. The link does not prove page ownership or remediation.</p><button type="button" onClick={() => setPreviousAuditId(0)}>Remove link</button></div>
                ) : null}
              </div>
            </div>

            <div className="submit-row">
              <div>
                <div id="audit-ready-help" className={`status-message status-message--${status.phase}`} role="status" aria-live="polite">
                  <span className="status-message__indicator" aria-hidden="true" />
                  <div><strong>{status.phase === "error" ? "Needs attention" : status.phase === "success" ? "Stored on-chain" : busy ? "Audit in progress" : "Ready to inspect"}</strong><p>{status.message}</p></div>
                  {"hash" in status && status.hash ? <a href={transactionExplorerUrl(status.hash)} target="_blank" rel="noopener noreferrer" aria-label="View transaction (opens in a new tab)">Transaction ↗</a> : null}
                  {pendingAudit && !busy ? <button type="button" onClick={() => void handleResume()}>Resume submitted audit</button> : null}
                </div>
                <p id="submit-disclosure" className="submit-disclosure">If finalized, your URL and optional focus become permanent public StudioNet data. This HTML-only advisory is not a compliance certification; verify findings against the page.</p>
              </div>
              <button className="button button--primary button--submit" type="submit" aria-describedby="audit-ready-help submit-disclosure" disabled={!wallet || !url.trim() || busy || pendingAudit}>
                {busy ? <><span className="spinner" aria-hidden="true" /> Validators are looking</> : <>Run consensus audit <span aria-hidden="true">↗</span></>}
              </button>
            </div>
          </form>
        </section>

        {selectedAudit ? <AuditReport audit={selectedAudit} onReaudit={handleReaudit} /> : null}

        <section id="how-it-works" className="method" aria-labelledby="method-title">
          <div className="section-heading section-heading--light">
            <div><span className="eyebrow">The method</span><h2 id="method-title">One page. Three lenses. Five independent checks.</h2></div>
            <p>AccessLens keeps the advisory policy fixed and treats every word on the target site as untrusted evidence.</p>
          </div>
          <div className="method-grid">
            <article><span className="method-icon" aria-hidden="true">⌁</span><b>01</b><h3>Capture one page</h3><p>Validators render the public HTTPS URL and inspect the same bounded HTML prefix—not a submitter&apos;s description or the whole site.</p></article>
            <article><span className="method-icon" aria-hidden="true">A</span><b>02</b><h3>Advise, not certify</h3><p>Scores estimate what the captured markup supports about semantics, manipulative patterns, and trust clarity. Interactions remain untested.</p></article>
            <article><span className="method-icon" aria-hidden="true">✓</span><b>03</b><h3>Match the evidence</h3><p>Validators require an exact capture digest match and page excerpts for findings, then reject materially unsupported reports.</p></article>
            <article><span className="method-icon" aria-hidden="true">#</span><b>04</b><h3>Keep an honest trail</h3><p>The full report is committed on-chain. A comparison link cites a caller-selected earlier report for the same URL; it does not prove ownership or remediation.</p></article>
          </div>
        </section>

        <section id="audit-ledger" className="ledger" aria-labelledby="ledger-title">
          <div className="section-heading">
            <div><span className="eyebrow">Public audit ledger</span><h2 id="ledger-title">What the network has reviewed</h2></div>
            <div id="ledger-health" className="ledger-health" aria-live="polite"><span className={ledgerError ? "health-dot health-dot--error" : "health-dot"} aria-hidden="true" />{contractInfo ? `Contract v${contractInfo.contractVersion} · ${contractInfo.auditCount} finalized` : ledgerError ? "Read unavailable" : "Reading StudioNet…"}</div>
          </div>
          <p className="ledger-history-note">This list covers the current contract only. Older v1.0.3 reports remain on the <a href={PREVIOUS_CONTRACT_EXPLORER_URL} target="_blank" rel="noopener noreferrer">previous StudioNet contract</a>; audit IDs and comparison links do not cross deployments.</p>

          <div className="ledger-tools">
            <label htmlFor="ledger-search">Filter the 12 most recent audits by domain or number</label>
            <div><span aria-hidden="true">⌕</span><input id="ledger-search" type="search" aria-describedby="ledger-results-status" placeholder="example.com or #12" value={search} onChange={(event) => setSearch(event.target.value)} /><button type="button" aria-describedby="ledger-health" aria-label={loadingLedger ? "Refreshing audit ledger" : "Refresh audit ledger"} onClick={() => void refreshLedger()} disabled={loadingLedger}>{loadingLedger ? "Refreshing…" : "Refresh"}</button></div>
          </div>
          <p id="ledger-results-status" className="ledger-results-status" role="status" aria-live="polite">{loadingLedger ? "Loading recent audits." : `Showing ${filteredAudits.length} of ${recentAudits.length} recent audits.`}</p>

          {ledgerError ? <div className="ledger-notice ledger-notice--error"><strong>StudioNet could not be read.</strong><p>{ledgerError}</p></div> : null}
          {!ledgerError && loadingLedger && recentAudits.length === 0 ? <div className="ledger-notice"><span className="spinner spinner--dark" aria-hidden="true" /><p>Reading finalized audits…</p></div> : null}
          {!ledgerError && !loadingLedger && filteredAudits.length === 0 ? <div className="ledger-notice"><strong>{search ? "No matching recent audit" : "The ledger is ready for its first page."}</strong><p>{search ? "This filter covers the 12 most recent audits. Try a domain or number in that range." : "Run an audit above and the finalized result will appear here."}</p></div> : null}
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
        <div className="footer-copy">
          <p>Built and operated by Leokings for public-interest interface evidence, resolved by GenLayer consensus.</p>
          <details id="data-terms"><summary>Data &amp; use terms</summary><p>No personal information is requested. Submitted URLs, optional focus text, and finalized reports are permanent public StudioNet records. Audit only public pages you are permitted to review. See our <a href="/privacy.html">privacy notice</a> and <a href="/terms.html">use terms</a>.</p></details>
        </div>
        <div><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="AccessLens GitHub repository (opens in a new tab)">GitHub ↗</a><a href={CONTRACT_EXPLORER_URL} target="_blank" rel="noopener noreferrer" aria-label="AccessLens StudioNet contract (opens in a new tab)">Contract ↗</a><code>{shortAddress(CONTRACT_ADDRESS)}</code></div>
      </footer>
    </div>
  );
}

export default App;
