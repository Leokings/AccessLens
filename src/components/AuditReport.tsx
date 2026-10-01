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
          <span className="eyebrow">Finalized audit #{audit.auditId}</span>
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

      <section className="score-board" aria-label="Audit scores">
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
            <p>No material issue was established from the rendered page.</p>
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

      <section className="proof-strip" aria-label="On-chain proof">
        <div>
          <span>Audit digest</span>
          <code title={audit.auditDigest}>{shortDigest(audit.auditDigest)}</code>
        </div>
        <div>
          <span>Page snapshot digest</span>
          <code title={audit.pageDigest}>{shortDigest(audit.pageDigest)}</code>
        </div>
        <div>
          <span>Requested by</span>
          <code title={audit.requester}>{shortAddress(audit.requester)}</code>
        </div>
        <div>
          <span>Finalized</span>
          <strong>{date.toLocaleString()}</strong>
        </div>
      </section>

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
