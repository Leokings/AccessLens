# AccessLens architecture

## Trust boundary

The frontend is a transaction and read interface. It may normalize a URL for convenience, but it cannot mint a report, choose the verdict, or change stored evidence. The Intelligent Contract owns URL validation, page rendering, audit policy, structured-output validation, consensus, score derivation, verdict derivation, digests, lineage, and storage.

## Consensus path

1. `audit_site` validates the caller's request reference, URL, optional focus, value, and previous-audit link.
2. The leader renders the canonical public HTTPS URL in HTML mode.
3. Page content is whitespace-normalized and bounded to the first 48,000 characters. The prompt labels it as untrusted data and refuses instructions from the page.
4. The leader proposes three bounded scores, up to eight findings, and a plain-language summary.
5. Contract code rejects unknown fields, non-step scores, unsupported categories, overlong text, duplicate findings, and findings whose evidence excerpt does not occur in the rendered page.
6. The contract derives the weighted overall score and verdict deterministically.
7. Each validator independently renders the URL and must match the leader's exact bounded-prefix digest, original character count, and truncation flag. It then rechecks excerpts and asks whether the report is materially fair under the fixed advisory policy. Ordinary professional variance is allowed; fabricated evidence, unobserved claims, an omitted obvious high-risk issue, or a wrong risk band is rejected.
8. On consensus, the contract stores the report with capture metadata, the committed prefix digest, and a digest over the **complete** report.

## Re-audits

A re-audit is a new immutable record. `previous_audit_id` must reference an existing record in the same contract for the same canonical URL. The child's stored `previous_audit_digest` binds the chosen parent. This is a caller-selected comparison, not proof of ownership, remediation, a linear history, or continuity across contract redeployments. Branches are allowed; later results never erase earlier ones.

## Score meaning

- Accessibility: 0 means unusable; 100 means strongly accessible based on what the rendered HTML can establish.
- User respect: 0 means highly manipulative; 100 means no material dark pattern is established.
- Trust clarity: 0 means opaque; 100 means important identity, pricing, privacy, and commitment information is clear.
- Overall: `45% accessibility + 35% user respect + 20% trust clarity`.

Any high-severity finding or overall score below 50 produces `HIGH_RISK`. A medium-severity finding or overall score below 80 produces `NEEDS_WORK`. Otherwise the verdict is `CLEAR`. The UI labels these as advisory observations, not definitive safety or compliance judgments.

## Known scope

The v1.0.4 policy audits one rendered URL prefix per transaction. It intentionally does not crawl a whole domain, log in, submit forms, claim legal WCAG certification, measure actual assistive-technology output, or inspect behavior hidden behind user interaction. It does not archive full HTML. Dynamic pages may fail exact observation matching. See [evidence and lineage limits](PROVENANCE.md) for precisely what the digests and comparison links do and do not establish.
