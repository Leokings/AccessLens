# Testing AccessLens

## Complete gate

```powershell
npm run verify
```

This runs GenVM lint, contract type checking, 25 direct tests, ESLint, 21 frontend tests, TypeScript, and a production build.

## Direct contract coverage

The direct suite covers deployment state, valid report storage, validator acceptance and rejection, high-risk derivation, URL restrictions and canonicalization, exact excerpt binding, malformed output rollback, per-wallet idempotency, same-URL comparison links, cross-site link rejection, requester-bound recovery, and recent-audit ordering. v1.0.4 adds rejection of a different validator HTML prefix even when a finding excerpt still matches, coverage/truncation assertions, a stored parent-report digest, and independent recomputation of the full-report commitment after summary tampering.

## Five-validator consensus

Start GLSim:

```powershell
npm run contract:sim
```

In another terminal:

```powershell
npm run contract:test:integration
```

The integration suite deploys the actual contract through GLSim, verifies its initial state, submits a rendered-page audit with five mock validators, asserts execution success rather than lifecycle status alone, and reads the stored result back.

## Live StudioNet checks

```powershell
genlayer network set studionet
genlayer schema 0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB
genlayer call 0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB get_contract_info
```

For each live write, inspect the finalized receipt and then read the resulting audit by ID or requester/reference. `FINALIZED` alone is not sufficient; the execution result must also be successful.

## Browser verification

- Page renders meaningful content without an error overlay.
- Contract v1.0.4 and finalized audit count load from StudioNet.
- The one-click Studio wallet connects without an extension or funding.
- Entering a URL enables the audit action.
- Keyboard labels and landmarks are present.
- The public ledger displays finalized audits #1 and #2 and their on-chain scores and digests. The live browser test used a new temporary wallet, clicked **Re-audit this page** on audit #1, submitted audit #2, observed finality, and displayed its stored parent digest and explicit lineage limits.
- The previous v1.0.3 production Lighthouse accessibility score was 100, including passing document-language checks; no new v1.0.4 score is claimed.
- Production responses include CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, referrer policy, and permissions policy headers.

## v1.0.4 live evidence

- Deployment `0x0deb8380a83f49294d9988e0fdcde37344c0ff678cf1b5bd2e0c61b64e831aa5`: `FINALIZED`, `MAJORITY_AGREE`, execution `SUCCESS`; `get_contract_info` reports schema `ACCESSLENS_AUDIT_V2`, policy `ACCESSLENS_PUBLIC_WEB_V3`, provenance `EXACT_RENDER_PREFIX_V1`.
- Controlled HTML audit #1 `0x3664595216e96c59a50030d8efc53c31ddb95b144e6d38fdf30e502e4b2bc565`: `FINALIZED`, majority agreement, successful execution and `get_audit(1)` readback. It stores 465/465 characters, no truncation, and two excerpt-backed findings.
- Browser-signed linked audit #2 `0x1a9b1f952e67c5927757399167abefeffce09980fc8030389d325305da425314`: `FINALIZED`, majority agreement, successful execution and `get_audit(2)` readback. Its parent digest equals audit #1's full-report digest. The same page-prefix digest recurs; the different report digest reflects different findings and requester. This is a comparison, not proof of remediation.
- The first CLI attempt `0xd162a0032ed92864f163c498c153b71ca25fe0d867f3bc99dd0c51466f4e2c67` finalized with execution `ERROR` because that CLI coerced an empty focus argument to `0`. It did not store an audit and is not counted as successful evidence. The browser path handled an empty optional focus correctly.
