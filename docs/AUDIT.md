# AccessLens release audit

Audit date: 2026-10-01

Current contract: v1.0.3 (`ACCESSLENS_PUBLIC_WEB_V2`)

Current frontend: `https://access-lens-lilac.vercel.app/`

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

The earlier v1.0.2 contract and its immutable audits are preserved in `deployments/studionet.json` for traceability. The public app now uses v1.0.3.
