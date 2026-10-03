# AccessLens release audit

Current release audit date: 2026-10-03

Current contract: v1.0.4 (`ACCESSLENS_PUBLIC_WEB_V3`, `EXACT_RENDER_PREFIX_V1`)

Current frontend: `https://access-lens-lilac.vercel.app/` (Vercel deployment `dpl_4z3DZKuRWoHNqucpVx51ZyyvJZNx`, `READY`)

## Steward response: advisory scope, provenance, and lineage

The project now calls each result a **one-page HTML advisory**, not an accessibility or safety certification. The contract prompts forbid whole-site, unseen-interaction, color-contrast, or legal-compliance claims; the interface and public terms explain those boundaries before submission and inside each report. The original HTML is not archived, and the report tells readers that a digest cannot reconstruct it.

Validator agreement is now tied to the exact inspected HTML prefix, not merely to matching individual finding excerpts. Each validator independently renders the page and must match the leader's domain-separated prefix digest, original normalized character count, and truncation flag. The record exposes method, scope, count, limit, and provenance version. A separate full-report digest commits to every stored report field, including findings, scores, summary, and chosen parent digest. The direct suite rejects changed HTML even where an excerpt survives and recomputes the report commitment after tampering.

Comparison links remain deliberately permissionless. The contract requires a parent in the same deployment with the same canonical URL and stores the parent's complete report digest. The UI and [provenance guide](PROVENANCE.md) say plainly that the link is caller-selected: it proves neither site ownership nor remediation, linear history, score comparability, or continuity across contract deployments.

The v1.0.4 verification gate passed: GenVM lint and type checking, 25 direct tests, two five-validator GLSim integration tests, ESLint, 21 frontend tests, TypeScript, and a production build. The public app loads contract v1.0.4 and displays new reports with coverage and limitation panels. Both successful StudioNet audit transactions were `FINALIZED`, `MAJORITY_AGREE`, had successful leader execution, and passed contract readback. A fresh temporary wallet also submitted linked audit #2 through the public UI and saw the finalized report there.

### Current live evidence

- Contract deployment: [`0x0deb8380a83f49294d9988e0fdcde37344c0ff678cf1b5bd2e0c61b64e831aa5`](https://genlayer-explorer.vercel.app/tx/0x0deb8380a83f49294d9988e0fdcde37344c0ff678cf1b5bd2e0c61b64e831aa5).
- Controlled HTML audit #1: [`0x3664595216e96c59a50030d8efc53c31ddb95b144e6d38fdf30e502e4b2bc565`](https://genlayer-explorer.vercel.app/tx/0x3664595216e96c59a50030d8efc53c31ddb95b144e6d38fdf30e502e4b2bc565). The 465-character fixture produced supported form-label and privacy-detail findings; `page_truncated=false`.
- First-time browser wallet, linked audit #2: [`0x1a9b1f952e67c5927757399167abefeffce09980fc8030389d325305da425314`](https://genlayer-explorer.vercel.app/tx/0x1a9b1f952e67c5927757399167abefeffce09980fc8030389d325305da425314). The new report stores audit #1's digest as its chosen parent and explicitly disclaims ownership or remediation. Both audits share the same page-prefix digest, while their report digests differ.
- New contract: [`0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB`](https://genlayer-explorer.vercel.app/address/0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB); source SHA-256 `41c205875d72170c7e73d3ae74100869d96defda9801377508a0a475847e7f16`.

The earlier contract and its reports remain available as archives. The first CLI attempt at a v1.0.4 audit finalized with an execution error because the CLI passed `0` for an empty text argument; it stored no audit. The successful controlled and public-browser paths above are the evidence for this release. The installed browser-wallet option and highly dynamic sites are not claimed as newly verified.

## Prior v1.0.3 release (historical)

Audit date: 2026-10-01

Contract at that release: v1.0.3 (`ACCESSLENS_PUBLIC_WEB_V2`)

Frontend URL at that release: `https://access-lens-lilac.vercel.app/`

## Outcome

The first-time temporary-wallet path is live and has been exercised end to end on StudioNet: submit, consensus finality, contract readback, report display, re-audit lineage, and automatic recovery after a page reload. Contract v1.0.3 and the final frontend are suitable for a reviewer to try. This is not a guarantee that every target page will produce a report or that every AI finding is correct; limitations are listed below.

## Defects found and closed

1. **Successful audit shown as an RPC error.** The frontend serialized the requester as a string when `get_audit_by_reference` requires a GenLayer `Address`. A finalized controlled-page audit was stored, but the UI showed “Missing or invalid parameters.” The read now uses `CalldataAddress`, followed by exact reference readback.
2. **Ambiguous transaction outcome.** StudioNet's transaction response exposes consensus and execution fields under raw names that the SDK did not normalize. The app now checks `FINALIZED`, consensus agreement, execution success where provided, and confirmed contract readback before declaring success. A failed or uncertain result cannot silently become a new write.
3. **Refresh during submission.** The transaction hash, reference, requester, and URL are saved in the tab session immediately after submission. Reload resumes the same hash and reads the finalized record. A new audit is disabled while one is pending. This was verified live with a linked re-audit.
4. **Inconsistent client URL checks.** The frontend now rejects reserved names, nonstandard ports, credentials, fragments, whitespace, ambiguous paths, and invalid host labels before attempting a contract write.
5. **Praise presented as a defect.** The original policy allowed positive observations to appear in the findings list. Contract v1.0.3 instructs the proposer and validators that findings must describe concrete problems and corrective changes. The new live controlled-page audit contained one real missing-label finding and no praise findings.
6. **Earlier homepage audit findings.** Audit #1 on the superseded v1.0.2 contract was an immutable snapshot of an older UI. Step descriptions, URL guidance, disabled-button guidance, external-link names, ledger loading announcements, wallet lifetime wording, operator information, privacy/use terms, and contact route have been addressed in the current build.
7. **Later minor homepage findings.** The current UI now gives the ledger search a result-count description, keeps the permanence warning next to Submit, hides decorative hero/status/spinner elements from assistive technology, shows a direct GitHub issue channel, and describes the optional focus character counter with an announcement near its limit.

## Independent verification

- GenVM lint and typecheck: clean.
- Direct contract tests: 22 passed.
- Five-validator GLSim integration tests: 2 passed.
- Frontend unit tests: 20 passed; ESLint, TypeScript, and production build passed.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- Lighthouse accessibility on the public production URL: 100/100, zero weighted failures. `html-has-lang` and `html-lang-valid` both passed.
- Public privacy and terms pages: HTTP 200.
- Final Vercel production deployment: `READY`; public alias serves contract v1.0.3.
- Security headers checked on the public alias: CSP, HSTS, and frame denial present.

## Live StudioNet evidence

- Current contract deployment: `0x88ee391c6957c60c5dd8cab6f267efa214145d5f96afdee557ce7fb513a8124e` — `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`.
- Controlled page audit #1: `0xae9aeb4d0b801f5d371e52e4ea8d36e79b15ae39d753567af893889f039bb582` — finalized and stored, 80/100, one supported missing-label finding. The page is intentionally flawed: `https://access-lens-lilac.vercel.app/audit-demo.html`.
- Current homepage audit #5: `0x16cd4c2a71c127d308a0809920859c5f749fad3164f7fc339339ae0e3ead8a34` — finalized and stored, 94/100, `CLEAR`, linked to audit #4. Its single low-severity counter finding was corrected in the final frontend deployment; the on-chain snapshot remains unchanged.
- Recovery after reload was verified against the superseded contract with linked audit #4 transaction `0xb96869429582147216452f1092c8e768da952185a1d658b8be6eef931b6784ce`. The current contract's normal submission/readback path was separately verified live.

## Important limitations

- A stable public HTTPS page is the reviewer path. Dynamic, region-dependent, login-gated, or bot-protected sites can fail consensus or render incomplete HTML; a failed transaction stores no report.
- The GenLayer report is contextual decision support, not a legal certification. Exact excerpts and validator agreement reduce invented findings but cannot eliminate model mistakes.
- An earlier v1.0.3 homepage audit repeatedly claimed the root `<html>` lacked a language declaration. This is a **false positive**: the shipped `index.html` has `<html lang="en">`, and independent Lighthouse checks pass both language audits. The final audit #5 did not repeat that claim.
- The browser-extension wallet option has not been exercised end to end in this audit. The temporary Studio wallet path is the demonstrated reviewer route.
- The on-page search filters the 12 most recent audits, not the full chain history. Older records remain readable through the contract's `get_audit` view.

## Release identifiers

- Contract: `0x0fA5F9e20F640BB260fcF422F868D3Dac21A247f`
- Contract source SHA-256: `98918e8107b480703ce869a47135ac5c58d84e118c7f16af38e076bd3cf1181d`
- Configuration digest: `d3b502251686e1a40459bdae1b260ff255130e3d30473a48b2f587d2fe971e55`
- Vercel deployment: `dpl_EQ6nrFFSqbeH6hMCRzHfh5BM9s5x` (`READY`)
- Final homepage audit digest: `d432ec1a6d3d60b0fd8a826f7b10b0d9428f123c3c8ced8a075ef820c9ce53cd`
- Final homepage page digest: `9964ad8bb59967f8c94aaf12afd0955dfac5fad96f60299599158b64e49f3afb`

The v1.0.2 and v1.0.3 contracts and their immutable audits are preserved in `deployments/studionet.json` for traceability. The public app now uses v1.0.4.
