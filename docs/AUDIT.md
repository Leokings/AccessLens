# AccessLens release audit

Audit date: 2026-10-01

Release: 1.0.0

## Outcome

The contract, client, and deployment boundary are ready for a public StudioNet demonstration. No known critical, high, or medium implementation defect remains after the checks below.

## Findings closed during the audit

1. **Validator result-shape mismatch — fixed.** The leader returns deterministically derived `overall_score` and `verdict`; the initial validator parser accepted only the pre-derived shape. A direct validator replay exposed the mismatch. The validator now accepts either shape and recomputes both fields, rejecting any mismatch.
2. **Address readback serialization — fixed.** GLSim exposed that returning the SDK `Address` object inside a public dictionary is not wire-serializable. Public audit views now return the canonical lowercase address string.
3. **Initial bundle included wallet SDK — fixed.** The GenLayer client is now dynamically imported. The public landing bundle is about 68 kB gzip, while the wallet/RPC code loads only when contract or wallet functionality is requested.
4. **Two low-contrast helper colors — fixed.** Lighthouse identified the form status helper and method step numbers. Both colors were strengthened and the production-preview accessibility score increased from 96 to 100.
5. **Inline-style CSP exception — removed.** Score rings now use SVG progress strokes instead of inline custom properties, so production `style-src` is restricted to `'self'`.

## Verified controls

- Pinned GenVM dependency
- GenVM lint and type check clean
- Strict structured LLM output validation
- Exact finding-to-page excerpt binding
- Prompt-injection boundary around page and user text
- Independent semantic validator review
- SSRF-oriented public URL restrictions
- Deterministic scores and verdicts
- Per-wallet request idempotency
- Immutable same-URL re-audit lineage
- Finality plus execution-success checks in the client
- Session-only reviewer wallet
- Security headers and restrictive CSP
- Zero runtime npm vulnerabilities

## Test evidence

- 18/18 direct contract tests passed
- 2/2 five-validator GLSim tests passed
- 9/9 frontend tests passed
- ESLint passed
- TypeScript passed
- Production build passed
- `npm audit --omit=dev`: 0 vulnerabilities
- Lighthouse production preview: 100 Performance, 100 Accessibility, 100 Best Practices
- StudioNet deployment finalized with five validator agreements and successful execution

## Deployment evidence

- Contract: `0xA8a7C97530505b9Ce5A37e0EafAc6c9726650396`
- Deployment transaction: `0x19976cc22382a9f65075899159f7ed0a4b1f5b654d8ef9de070ff1ffbdbc0f5b`
- Configuration digest: `2fa778e52f1829788bd1cafecc2f562e894322c1df2018ebc5f547fb8efde7a0`
- Contract source SHA-256: `08a43915b310eea038f97f3e8bca9afa24c5be682c490471c4a57e67e1e4ee69`

The production frontend URL and live self-audit transaction are added to the deployment record after the verified Vercel artifact is promoted.
