# AccessLens evidence, scope, and comparison limits

AccessLens v1.0.4 produces an **advisory about one captured public HTTPS page**. It is not a WCAG certification, security assessment, legal finding, or whole-site audit. Scores are estimates about the HTML the validators observed; a high score cannot establish that no problem exists.

## What the validators observe

The contract canonicalizes the requested URL and calls `gl.nondet.web.render(url, mode="html")`. It collapses whitespace and inspects at most the first 48,000 normalized characters. Every validator must independently obtain the **same bounded prefix digest, original normalized character count, and truncation flag** as the leader. A different observation is rejected, even when an individual finding excerpt appears in both versions.

The audit record exposes `capture_method`, `capture_scope`, `captured_chars`, `page_chars`, `page_truncated`, and `provenance_version`. `page_digest` is a domain-separated Keccak-256 commitment to the canonical URL, capture version and limit, and inspected HTML prefix. Each finding stores an exact excerpt from that prefix. The raw HTML is **not archived on-chain**; a digest alone cannot reconstruct it. The transaction timestamp is not an independently measured webpage fetch or finalization time.

This establishes agreement on the observed prefix among the validators that finalized the transaction. It does not prove that the site served the same content to every visitor, that it still serves that content, or that the page belongs to the requester. Dynamic, personalized, region-dependent, login-gated, or bot-protected pages may fail or show only partial content. Truncated captures exclude everything after the limit.

## What the report digest commits

`audit_digest` commits to the contract configuration digest and canonical JSON of the entire stored report: audit ID, reference, requester, URL, domain, optional focus, selected parent ID and parent digest, all four scores, verdict, exact serialized findings, summary, page digest and coverage fields, capture metadata, policy/provenance versions, and transaction time. It is recomputable from `get_audit` plus `get_contract_info`. Changing even the summary changes the recomputed digest. This is an integrity commitment, not proof that a subjective finding is correct.

## What a comparison link means

`previous_audit_id` is **chosen by the caller**. The contract verifies that the referenced audit exists in this same deployment and has the same canonical URL, then stores its `audit_digest` in the new record. The old record is immutable. This lets readers verify exactly which earlier report was cited.

The link does **not** authenticate site ownership, prove that a fix was made, force a linear history, or prove that the earlier and later scores are directly comparable. Branches are permitted: different callers can cite different earlier reports. `get_latest_for_url` means newest stored report for that URL, not the tip of a single verified remediation chain. IDs and links are scoped to one contract. The v1.0.3 archive remains readable at its own address, but a v1.0.4 record cannot claim an on-chain parent in the older deployment. Policy changes also make cross-version scores non-equivalent without human review.

## What to check manually

Open the cited transaction and contract record, read the exact finding excerpts, inspect the current webpage, and confirm that each recommendation follows from what is visible. Use browser, keyboard, screen reader, and legal/accessibility specialists when those claims matter. A later audit is a new observation, not an automatic certificate of remediation.
