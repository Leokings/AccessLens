# Testing AccessLens

## Complete gate

```powershell
npm run verify
```

This runs GenVM lint, contract type checking, 22 direct tests, ESLint, 20 frontend tests, TypeScript, and a production build.

## Direct contract coverage

The direct suite covers deployment state, valid report storage, validator acceptance and rejection, high-risk derivation, URL restrictions and canonicalization, exact excerpt binding, malformed output rollback, per-wallet idempotency, re-audit lineage, cross-site lineage rejection, requester-bound recovery, and recent-audit ordering.

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
genlayer schema 0x0fA5F9e20F640BB260fcF422F868D3Dac21A247f
genlayer call 0x0fA5F9e20F640BB260fcF422F868D3Dac21A247f get_contract_info
```

For each live write, inspect the finalized receipt and then read the resulting audit by ID or requester/reference. `FINALIZED` alone is not sufficient; the execution result must also be successful.

## Browser verification

- Page renders meaningful content without an error overlay.
- Contract v1.0.3 and finalized audit count load from StudioNet.
- The one-click Studio wallet connects without an extension or funding.
- Entering a URL enables the audit action.
- Keyboard labels and landmarks are present.
- The public ledger displays finalized audits, including current homepage audit #5, and its on-chain scores and digests.
- Production Lighthouse accessibility score: 100, including passing document-language checks.
- Production responses include CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, referrer policy, and permissions policy headers.
