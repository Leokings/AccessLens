# AccessLens

AccessLens is a GenLayer-native web application that turns a public website URL into an immutable, evidence-backed interface audit. Validators render the live page, inspect accessibility structure, dark-pattern risk, and trust clarity, then decide whether the proposed report is materially supported by the page.

StudioNet contract: [`0xA8a7C97530505b9Ce5A37e0EafAc6c9726650396`](https://genlayer-explorer.vercel.app/address/0xA8a7C97530505b9Ce5A37e0EafAc6c9726650396)

Deployment transaction: [`0x19976cc22382a9f65075899159f7ed0a4b1f5b654d8ef9de070ff1ffbdbc0f5b`](https://genlayer-explorer.vercel.app/tx/0x19976cc22382a9f65075899159f7ed0a4b1f5b654d8ef9de070ff1ffbdbc0f5b)

## First-time flow

1. Open AccessLens and choose **Use instant Studio wallet**. The key is generated locally, kept only in that browser tab, and needs no funds on gasless StudioNet.
2. Paste the exact public HTTPS page to review. A homepage, signup flow, pricing page, checkout page, or policy page all work.
3. Optionally describe a journey that deserves extra attention. This text cannot replace the fixed audit policy.
4. Submit the audit and wait for GenLayer finality.
5. Read the stored scores, exact page excerpts, recommendations, page digest, audit digest, requester, policy version, and transaction evidence.
6. After improving the page, choose **Re-audit this page**. The new report links to the earlier one without overwriting it.

## Why GenLayer is necessary

A normal smart contract cannot open a live website and make a contextual judgment about whether an interface is accessible, manipulative, or clear. AccessLens uses GenLayer for both abilities:

- `gl.nondet.web.render(..., mode="html")` renders the public page independently for the leader and validators.
- An Intelligent Contract applies a fixed, prompt-injection-resistant audit policy to the rendered HTML.
- Every finding must contain an exact excerpt from the page evidence.
- Validators independently re-render the page and accept only a materially supported candidate report.
- The finalized audit, policy version, evidence digest, lineage, and scores are stored on-chain.

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
  └─ stores immutable audit + re-audit lineage
```

Read [the architecture](docs/ARCHITECTURE.md), [security model](SECURITY.md), [testing guide](docs/TESTING.md), and [audit report](docs/AUDIT.md) for the implementation details.

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
- 18 direct contract tests
- 2 five-validator GLSim integration tests
- 9 frontend unit tests
- ESLint and TypeScript
- Production Vite build
- `npm audit --omit=dev` with zero vulnerabilities
- Lighthouse production-preview scores of 100 Performance, 100 Accessibility, and 100 Best Practices

## Deployment integrity

The contract dependency is pinned in the first source line. The StudioNet deployment record in [`deployments/studionet.json`](deployments/studionet.json) binds the address to the contract version, policy version, configuration digest, source SHA-256, deployer, and finalized deployment transaction.

## License

MIT
