# AccessLens

AccessLens is a GenLayer-native web application that turns one public HTTPS page into an immutable, evidence-backed **HTML advisory**. Validators render and compare the same bounded HTML prefix, inspect accessibility structure, dark-pattern signals, and trust clarity, then decide whether the proposed report is materially supported. It is not a WCAG certification, full-site audit, or test of interactive behavior.

Live app: [https://access-lens-lilac.vercel.app/](https://access-lens-lilac.vercel.app/)

StudioNet contract (v1.0.4): [`0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB`](https://genlayer-explorer.vercel.app/address/0x1fEDe5eff4851E72d042A10B22EF13311EE82eEB)

Deployment transaction: [`0x0deb8380a83f49294d9988e0fdcde37344c0ff678cf1b5bd2e0c61b64e831aa5`](https://genlayer-explorer.vercel.app/tx/0x0deb8380a83f49294d9988e0fdcde37344c0ff678cf1b5bd2e0c61b64e831aa5)

Finalized controlled-page audit transaction: [`0x3664595216e96c59a50030d8efc53c31ddb95b144e6d38fdf30e502e4b2bc565`](https://genlayer-explorer.vercel.app/tx/0x3664595216e96c59a50030d8efc53c31ddb95b144e6d38fdf30e502e4b2bc565) — audit #1, 79/100, 465/465 HTML characters captured, including a correctly identified missing form label.

Finalized first-time browser re-audit: [`0x1a9b1f952e67c5927757399167abefeffce09980fc8030389d325305da425314`](https://genlayer-explorer.vercel.app/tx/0x1a9b1f952e67c5927757399167abefeffce09980fc8030389d325305da425314) — audit #2, signed with a new temporary Studio wallet, linked to audit #1 by ID and full-report digest. Both read back from the new contract.

## First-time flow

1. Open AccessLens and choose **Use instant Studio wallet**. The key is generated locally, kept only in that browser tab, and needs no funds on gasless StudioNet.
2. Paste the exact public HTTPS page to review. Homepages, signup, pricing, checkout, and policy pages can be tested, though dynamic or bot-protected pages may fail without storing a report.
3. Optionally describe a journey that deserves extra attention. This text cannot replace the fixed audit policy.
4. Submit the audit and wait for GenLayer finality. If the tab reloads after submission, AccessLens resumes the saved transaction rather than submitting a duplicate.
5. Read the stored scores, exact page excerpts, recommendations, capture coverage, page-prefix digest, full-report digest, requester, policy version, and transaction evidence. Verify AI findings against the page; the HTML-only advisory is not a certification.
6. To compare another observation of the same URL, choose **Re-audit this page**. The new report cites the earlier one without overwriting it. That caller-selected link does not prove page ownership, a fix, or a complete remediation history.

## Why GenLayer is necessary

A normal smart contract cannot open a live website and make a contextual judgment about whether an interface is accessible, manipulative, or clear. AccessLens uses GenLayer for both abilities:

- `gl.nondet.web.render(..., mode="html")` renders the public page independently for the leader and validators.
- An Intelligent Contract applies a fixed, prompt-injection-resistant audit policy to the rendered HTML.
- Every finding must contain an exact excerpt from the page evidence.
- Validators independently re-render the page, require an exact inspected-prefix digest/count/truncation match, and accept only a materially supported candidate report.
- The finalized audit, policy and capture metadata, full-report commitment, caller-selected comparison link, and scores are stored on-chain.

The browser does not generate audit results and there is no application database or private AI key.

## Architecture

```text
Browser (Vercel)
  ├─ temporary Studio wallet or injected wallet
  ├─ finalized contract reads
  └─ signed audit_site transaction
            │
            ▼
GenLayer StudioNet Intelligent Contract
  ├─ validates public HTTPS target
  ├─ renders live HTML
  ├─ leader proposes structured report
  ├─ validators independently check material support
  └─ stores immutable advisory + same-contract comparison link
```

Read [the architecture](docs/ARCHITECTURE.md), [evidence and lineage limits](docs/PROVENANCE.md), [security model](SECURITY.md), [testing guide](docs/TESTING.md), and [audit report](docs/AUDIT.md) for the implementation details.

## Contract interface

- `audit_site(request_reference, url, focus, previous_audit_id)` — render, evaluate, validate, and store a report.
- `get_audit(audit_id)` — read one finalized audit.
- `get_audit_by_reference(requester, request_reference)` — recover a submitted result safely.
- `get_latest_for_url(url)` — find the newest finalized audit for a page.
- `get_recent_audits(limit)` — read the public ledger.
- `get_contract_info()` — verify the contract, schema, policy, configuration digest, and audit count.

## Local development

```powershell
python -m pip install -r requirements.txt
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Verification

Run the complete static, contract, browser-library, and production-build gate:

```powershell
npm run verify
```

For five-validator consensus testing, run in two terminals:

```powershell
npm run contract:sim
npm run contract:test:integration
```

The current release passes:

- GenVM lint and type checking
- 25 direct contract tests
- 2 five-validator GLSim integration tests
- 21 frontend unit tests
- ESLint and TypeScript
- Production Vite build
- `npm audit --omit=dev` with zero vulnerabilities
- Previous v1.0.3 Lighthouse production scores of 98 Performance, 100 Accessibility, and 100 Best Practices; these have not yet been remeasured on v1.0.4

## Deployment integrity

The contract dependency is pinned in the first source line. The StudioNet deployment record in [`deployments/studionet.json`](deployments/studionet.json) binds the address to the contract version, policy version, configuration digest, source SHA-256, deployer, finalized deployment transaction, public Vercel artifact, and live audit evidence.

## License

MIT
