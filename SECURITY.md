# AccessLens security model

## Protected boundaries

- Public HTTPS domain names only. HTTP, localhost, reserved suffixes, literal IP addresses, credentials, fragments, non-default ports, ambiguous path traversal, and whitespace are rejected before rendering.
- Page HTML and optional user focus are explicitly untrusted data. The fixed policy tells the model never to follow instructions found in either source.
- Findings use a strict schema and every evidence excerpt must occur verbatim in independently rendered page content.
- Scores are bounded integers in five-point steps. Overall score and verdict are derived by contract code, not accepted from the model.
- Request references are unique per wallet. The browser persists a submitted hash in tab session storage and resumes it after a refresh instead of issuing a new request.
- Re-audit lineage can only connect records for the same canonical URL.
- There is no owner-only verdict override, hidden database, server signer, custody path, token approval, or paid backend secret.
- Temporary reviewer keys live in browser `sessionStorage`, are limited to gasless StudioNet use, are never transmitted to the application, and disappear when the tab session ends.

## Error handling

Expected input failures, transient rendering failures, and malformed model responses use distinct error prefixes. Failed executions apply no audit state. The UI checks `FINALIZED`, consensus and execution fields where present, and exact contract readback before treating a write as successful. An uncertain read retains the pending hash for recovery rather than re-submitting.

## Remaining risks

- Public pages can change between independent validator renders. The semantic validator tolerates normal judgment variance but dynamic pages can still require a retry.
- A page can withhold content by geography, authentication, bot detection, or client state. The report applies only to the HTML validators could render.
- The report is decision support, not a legal accessibility certification.
- Exact page excerpts and validator consensus do not eliminate false positives. A prior audit incorrectly inferred a missing `<html lang>` from a rendered fragment; the shipped document and independent Lighthouse check confirm the attribute is present.
- URL syntax checks block literal private addresses, but DNS resolution and redirects are performed inside GenLayer's web renderer; this app does not independently verify their destination IPs.
- The browser-extension wallet option has not received a live end-to-end test in this release. The temporary Studio wallet is the verified first-time path.
- The temporary wallet is convenient for review evidence, not long-term custody or production funds.

Report security issues privately to the repository owner before public disclosure.
