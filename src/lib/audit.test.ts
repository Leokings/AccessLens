import { describe, expect, it } from "vitest";
import { normalizePublicUrl, parseAudit, parseContractInfo, verdictLabel } from "./audit";

describe("normalizePublicUrl", () => {
  it("adds HTTPS and normalizes the hostname", () => {
    expect(normalizePublicUrl("Example.COM/signup?from=home")).toBe(
      "https://example.com/signup?from=home",
    );
  });

  it.each([
    "http://example.com",
    "https://localhost:3000",
    "https://127.0.0.1/admin",
    "https://user:pass@example.com",
    "https://example.com/#pricing",
    "https://example.test/",
    "https://example.com:8443/",
    "https://example.com/../pricing",
    "https://example.com/path//more",
    "https://example.com/contact@support",
    "https://example.com/a b",
    "https://sub_domain.example.com/",
  ])("rejects unsafe or unstable target %s", (value) => {
    expect(() => normalizePublicUrl(value)).toThrow();
  });
});

describe("GenLayer result parsing", () => {
  it("parses an audit without losing integer fields", () => {
    const result = parseAudit({
      audit_id: 3n,
      request_reference: "audit-example-003",
      requester: "0x1111111111111111111111111111111111111111",
      url: "https://example.com/",
      domain: "example.com",
      focus: "",
      previous_audit_id: 2n,
      previous_audit_digest: "c".repeat(64),
      overall_score: 82n,
      accessibility_score: 80n,
      dark_pattern_score: 85n,
      trust_score: 80n,
      verdict: "NEEDS_WORK",
      findings_json: JSON.stringify([
        {
          category: "ACCESSIBILITY",
          severity: "MEDIUM",
          title: "Missing field label",
          evidence: "Enter your email",
          recommendation: "Associate a visible label with the email field.",
        },
      ]),
      summary: "The page is usable but one form control needs a programmatic label before it is ready.",
      page_digest: "a".repeat(64),
      page_chars: 1200n,
      page_truncated: false,
      captured_chars: 1200n,
      capture_method: "web.render(mode=html)",
      capture_scope: "WHITESPACE_NORMALIZED_HTML_PREFIX",
      provenance_version: "EXACT_RENDER_PREFIX_V1",
      policy_version: "ACCESSLENS_PUBLIC_WEB_V3",
      created_at: 1_799_999_999n,
      audit_digest: "b".repeat(64),
    });

    expect(result.auditId).toBe(3);
    expect(result.previousAuditId).toBe(2);
    expect(result.previousAuditDigest).toBe("c".repeat(64));
    expect(result.capturedChars).toBe(1200);
    expect(result.findings[0].severity).toBe("MEDIUM");
  });

  it("rejects an unknown verdict", () => {
    expect(() => parseAudit({ verdict: "MAYBE" })).toThrow("unknown audit verdict");
  });

  it("parses contract health", () => {
    expect(
      parseContractInfo({
        contract_version: "1.0.0",
        audit_schema_version: "ACCESSLENS_AUDIT_V2",
        policy_version: "ACCESSLENS_PUBLIC_WEB_V3",
        provenance_version: "EXACT_RENDER_PREFIX_V1",
        capture_limit_chars: 48000,
        predecessor_contract: "0x0fA5F9e20F640BB260fcF422F868D3Dac21A247f",
        audit_count: "4",
        config_digest: "c".repeat(64),
      }).auditCount,
    ).toBe(4);
  });

  it("labels verdicts as advisory observations", () => {
    expect(verdictLabel("CLEAR")).toBe("No major issue seen");
    expect(verdictLabel("NEEDS_WORK")).toBe("Review suggested");
    expect(verdictLabel("HIGH_RISK")).toBe("Priority review");
  });
});
