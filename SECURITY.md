# AccessLens security model

## Protected boundaries

- Public HTTPS domain names only. HTTP, localhost, reserved suffixes, literal IP addresses, credentials, fragments, non-default ports, ambiguous path traversal, and whitespace are rejected before rendering.
- Page HTML and optional user focus are explicitly untrusted data. The fixed policy tells the model never to follow instructions found in either source.
- Findings use a strict schema and every evidence excerpt must occur verbatim in independently rendered page content.
- Scores are bounded integers in five-point steps. Overall score and verdict are derived by contract code, not accepted from the model.
- Request references are unique per wallet, preventing an uncertain transaction retry from writing the same request twice.
- Re-audit lineage can only connect records for the same canonical URL.
- There is no owner-only verdict override, hidden database, server signer, custody path, token approval, or paid backend secret.
- Temporary reviewer keys live in browser `sessionStorage`, are limited to gasless StudioNet use, are never transmitted to the application, and disappear when the tab session ends.

## Error handling

Expected input failures, transient rendering failures, and malformed model responses use distinct error prefixes. Failed executions apply no audit state. The UI waits for `FINALIZED` and checks the execution result before treating a write as successful.

## Remaining risks

- Public pages can change between independent validator renders. The semantic validator tolerates normal judgment variance but dynamic pages can still require a retry.
- A page can withhold content by geography, authentication, bot detection, or client state. The report applies only to the HTML validators could render.
- The report is decision support, not a legal accessibility certification.
- The temporary wallet is convenient for review evidence, not long-term custody or production funds.

Report security issues privately to the repository owner before public disclosure.
