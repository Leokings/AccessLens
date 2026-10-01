# AccessLens release audit

Audit date: 2026-10-01

Release: contract v1.0.2

## Outcome

The contract, client, StudioNet deployment, and public Vercel deployment are ready for review. No known critical, high, or medium implementation defect remains after the checks below.

## Findings closed during the audit

1. **Model-output liveness traps — fixed.** Contract v1.0.2 normalizes and safely bounds validator prose instead of reverting when a model returns a short but valid title, evidence excerpt, recommendation, or summary. Exact evidence matching remains mandatory.
2. **Validator result-shape mismatch — fixed.** The validator accepts the candidate's derived fields, recomputes the overall score and verdict, and rejects any mismatch.
3. **Address readback serialization — fixed.** Public audit views return canonical lowercase address strings rather than SDK address objects that GLSim cannot serialize.
4. **Prompt and target hardening — verified.** Public HTTPS domain checks block local names, IP literals, reserved suffixes, userinfo, fragments, nonstandard ports, and path traversal. Page and user text are explicitly treated as untrusted evidence.
5. **Exact-evidence enforcement — verified live.** A remediation audit whose leader cited text that was not in the rendered page was rejected by validator consensus and wrote no state. This is the intended safe-failure behavior.
6. **First-time disclosures and accessibility — fixed.** The production page now explains StudioNet cost, permanent public data, page-size and target limits, temporary-wallet lifetime, URL normalization, disabled-action requirements, external-tab behavior, operator identity, and data/use terms. Step labels and live ledger controls have explicit accessible names.
7. **Live-data Lighthouse regressions — fixed.** A ledger metadata color and the compact StudioNet link name were corrected after testing with a real stored audit. The final deployed page scores 100 for accessibility.
8. **Frontend delivery boundary — hardened.** GenLayer wallet/RPC code is dynamically imported, CSP disallows inline scripts and styles, and production responses carry HSTS, clickjacking, MIME-sniffing, referrer, and browser-permission protections.

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
- Public ledger readback and search
- Security headers and restrictive CSP
- Zero runtime npm vulnerabilities

## Test evidence

- 21/21 direct contract tests passed
- 2/2 five-validator GLSim integration tests passed
- 9/9 frontend tests passed
- GenVM lint and type checking passed
- ESLint and TypeScript passed
- Production build passed
- `npm audit --omit=dev`: 0 vulnerabilities
- Lighthouse on the public production URL: 98 Performance, 100 Accessibility, 100 Best Practices
- Browser readback displayed contract v1.0.2 and finalized audit #1 with no console errors or warnings
- StudioNet contract deployment finalized with successful execution
- StudioNet live audit finalized with successful execution and immutable readback

## Deployment evidence

- Live app: `https://access-lens-lilac.vercel.app/`
- Vercel deployment: `dpl_GvcFfa9hNi2befikqXeZ6pV36beM` (`READY`)
- Contract: `0xE246F465bD8602ceedcC113ABE7b872ED9a041b7`
- Contract version: `1.0.2`
- Deployment transaction: `0xf2e3b596dc4a2200a2ea3c75f51b51e75c08d3d195b81706142edcaeb55a8c54`
- Finalized live audit transaction: `0xb5150329a18a7dd4d7b1c96df1e295eebca68ea5bec2d676d0d9d37abf9c29d2`
- Stored audit ID: `1`
- Audit digest: `68a5684af5d78ba23f73b552c1fd5580aa493b24d3cee2059be417296e1535b6`
- Page digest: `b138c5f87f4054b7489a53e8a510ba24a66027e7eaaa8b9aa5946deaa6e22636`
- Configuration digest: `bd0339c3bb45565db5c4a0a79bca743b42e9d9870879b64ed2009d31c8b6b64b`
- Contract source SHA-256: `4b9d90f1102fe618113886a4afcc3084e5665637e7da865cd60c5de30ba8a2fa`

The stored 81/100 audit is an immutable snapshot taken before the final interface remediation. The live page closes its concrete findings; the record is retained rather than rewritten.
