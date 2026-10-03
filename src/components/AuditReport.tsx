import type { AuditRecord } from "../types";
import { categoryLabel, shortAddress, shortDigest, verdictLabel } from "../lib/audit";
import { transactionExplorerUrl } from "../lib/config";
import { ScoreGauge } from "./ScoreGauge";

export function AuditReport({
  audit,
  onReaudit,
}: {
  audit: AuditRecord;
  onReaudit: (audit: AuditRecord) => void;
}) {
  const date = new Date(audit.createdAt * 1000);
  return (
    <article className="report" aria-labelledby={`report-title-${audit.auditId}`}>
      <header className="report__header">
        <div>
          <span className="eyebrow">Finalized HTML advisory #{audit.auditId}</span>
          <h2 id={`report-title-${audit.auditId}`} tabIndex={-1}>{audit.domain}</h2>
          <a className="report__url" href={audit.url} target="_blank" rel="noopener noreferrer" aria-label={`${audit.url} (opens in a new tab)`}>
            {audit.url}
          </a>
        </div>
        <div className={`verdict verdict--${audit.verdict.toLowerCase().replace("_", "-")}`}>
          <span className="verdict__dot" />
          {verdictLabel(audit.verdict)}
        </div>
      </header>

      <p className="report__summary">{audit.summary}</p>

      <div className="report__scope" role="note">
        <strong>Advisory, not certification.</strong> Scores describe only the captured HTML of this one URL.
        They do not establish WCAG compliance, keyboard or screen-reader behavior, page ownership,
        unseen interactions, or the state of the page after this transaction.
      </div>

      <section className="score-board" aria-label="Advisory scores for captured HTML">
        <ScoreGauge score={audit.overallScore} label="Overall" tone="overall" />
        <ScoreGauge score={audit.accessibilityScore} label="Accessibility" tone="access" />
        <ScoreGauge score={audit.darkPatternScore} label="User respect" tone="respect" />
        <ScoreGauge score={audit.trustScore} label="Trust clarity" tone="trust" />
      </section>

      <section className="findings" aria-labelledby={`findings-${audit.auditId}`}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">What validators found</span>
            <h3 id={`findings-${audit.auditId}`}>Evidence you can act on</h3>
          </div>
          <span className="count-pill">{audit.findings.length} finding{audit.findings.length === 1 ? "" : "s"}</span>
        </div>

        {audit.findings.length === 0 ? (
          <div className="empty-findings">
            <span aria-hidden="true">✦</span>
            <p>No material issue was established from the captured HTML. This is not proof that the page has no issues.</p>
          </div>
        ) : (
          <div className="finding-list">
            {audit.findings.map((finding, index) => (
              <article className="finding-card" key={`${finding.category}-${finding.title}-${index}`}>
                <div className="finding-card__meta">
                  <span className={`severity severity--${finding.severity.toLowerCase()}`}>
                    {finding.severity}
                  </span>
                  <span>{categoryLabel(finding.category)}</span>
                </div>
                <h4>{finding.title}</h4>
                <blockquote>“{finding.evidence}”</blockquote>
                <div className="fix-note">
                  <span aria-hidden="true">↗</span>
                  <p>{finding.recommendation}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="proof-strip" aria-label="On-chain evidence and capture scope">
        <div>
          <span>Full-report commitment</span>
          <code title={audit.auditDigest}>{shortDigest(audit.auditDigest)}</code>
        </div>
        <div>
          <span>Captured HTML prefix digest</span>
          <code title={audit.pageDigest}>{shortDigest(audit.pageDigest)}</code>
        </div>
        <div>
          <span>Capture coverage</span>
          <strong>{audit.capturedChars.toLocaleString()} of {audit.pageChars.toLocaleString()} normalized characters{audit.pageTruncated ? " · truncated" : ""}</strong>
        </div>
        <div>
          <span>Policy / provenance</span>
          <strong>{audit.policyVersion} · {audit.provenanceVersion}</strong>
        </div>
        <div>
          <span>Requested by</span>
          <code title={audit.requester}>{shortAddress(audit.requester)}</code>
        </div>
        <div>
          <span>Transaction time</span>
          <strong>{date.toLocaleString()}</strong>
        </div>
      </section>

      <aside className="report__provenance" aria-label="Evidence and lineage limits">
        <p><strong>What is bound:</strong> Validators had to match the same whitespace-normalized HTML prefix before accepting this advisory. The stored digest commits to that prefix and URL; finding excerpts are stored with the report. The full source HTML is not archived, so the digest alone cannot reconstruct the page.</p>
        {audit.previousAuditId > 0 ? (
          <p><strong>Comparison link:</strong> Audit #{audit.previousAuditId} ({shortDigest(audit.previousAuditDigest)}) is an earlier record on this contract for the same canonical URL. The link was chosen by the caller; it does not verify site ownership, a fix, or an unbroken cross-deployment history.</p>
        ) : (
          <p><strong>Comparison link:</strong> None selected. Audit IDs belong to this contract; this does not mean the page was never reviewed on an older deployment.</p>
        )}
      </aside>

      <footer className="report__footer">
        <div className="report__links">
          {audit.transactionHash ? (
            <a href={transactionExplorerUrl(audit.transactionHash)} target="_blank" rel="noopener noreferrer" aria-label="View transaction (opens in a new tab)">
              View transaction <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <a href={audit.url} target="_blank" rel="noopener noreferrer" aria-label="Open audited page (opens in a new tab)">
            Open audited page <span aria-hidden="true">↗</span>
          </a>
        </div>
        <button className="button button--ghost" type="button" onClick={() => onReaudit(audit)}>
          Re-audit this page
        </button>
      </footer>
    </article>
  );
}
