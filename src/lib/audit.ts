import type {
  AuditRecord,
  ContractInfo,
  Finding,
  FindingCategory,
  FindingSeverity,
  Verdict,
} from "../types";

const VERDICTS = new Set<Verdict>(["CLEAR", "NEEDS_WORK", "HIGH_RISK"]);
const CATEGORIES = new Set<FindingCategory>(["ACCESSIBILITY", "DARK_PATTERN", "TRUST"]);
const SEVERITIES = new Set<FindingSeverity>(["HIGH", "MEDIUM", "LOW"]);

export function recordFrom(value: unknown, label: string): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries());
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`GenLayer returned invalid ${label}.`);
}

export function textFrom(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`GenLayer returned invalid ${label}.`);
  return value;
}

export function numberFrom(value: unknown, label: string): number {
  let parsed: bigint;
  if (typeof value === "bigint") parsed = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) parsed = BigInt(value);
  else if (typeof value === "string" && /^\d+$/.test(value)) parsed = BigInt(value);
  else throw new Error(`GenLayer returned invalid ${label}.`);

  const result = Number(parsed);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`GenLayer returned out-of-range ${label}.`);
  }
  return result;
}

function booleanFrom(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`GenLayer returned invalid ${label}.`);
  return value;
}

function findingsFrom(value: unknown): Finding[] {
  const raw = textFrom(value, "findings");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GenLayer returned malformed findings JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length > 8) {
    throw new Error("GenLayer returned invalid findings.");
  }
  return parsed.map((value, index) => {
    const finding = recordFrom(value, `finding ${index + 1}`);
    const category = textFrom(finding.category, "finding category") as FindingCategory;
    const severity = textFrom(finding.severity, "finding severity") as FindingSeverity;
    if (!CATEGORIES.has(category) || !SEVERITIES.has(severity)) {
      throw new Error("GenLayer returned an unknown finding classification.");
    }
    return {
      category,
      severity,
      title: textFrom(finding.title, "finding title"),
      evidence: textFrom(finding.evidence, "finding evidence"),
      recommendation: textFrom(finding.recommendation, "finding recommendation"),
    };
  });
}

export function parseAudit(value: unknown): AuditRecord {
  const audit = recordFrom(value, "audit record");
  const verdict = textFrom(audit.verdict, "audit verdict") as Verdict;
  if (!VERDICTS.has(verdict)) throw new Error("GenLayer returned an unknown audit verdict.");
  return {
    auditId: numberFrom(audit.audit_id, "audit ID"),
    requestReference: textFrom(audit.request_reference, "request reference"),
    requester: String(audit.requester ?? ""),
    url: textFrom(audit.url, "audit URL"),
    domain: textFrom(audit.domain, "audit domain"),
    focus: textFrom(audit.focus, "audit focus"),
    previousAuditId: numberFrom(audit.previous_audit_id, "previous audit ID"),
    overallScore: numberFrom(audit.overall_score, "overall score"),
    accessibilityScore: numberFrom(audit.accessibility_score, "accessibility score"),
    darkPatternScore: numberFrom(audit.dark_pattern_score, "dark-pattern score"),
    trustScore: numberFrom(audit.trust_score, "trust score"),
    verdict,
    findings: findingsFrom(audit.findings_json),
    summary: textFrom(audit.summary, "audit summary"),
    pageDigest: textFrom(audit.page_digest, "page digest"),
    pageChars: numberFrom(audit.page_chars, "page character count"),
    pageTruncated: booleanFrom(audit.page_truncated, "page truncation flag"),
    policyVersion: textFrom(audit.policy_version, "policy version"),
    createdAt: numberFrom(audit.created_at, "creation time"),
    auditDigest: textFrom(audit.audit_digest, "audit digest"),
  };
}

export function parseContractInfo(value: unknown): ContractInfo {
  const info = recordFrom(value, "contract information");
  return {
    contractVersion: textFrom(info.contract_version, "contract version"),
    auditSchemaVersion: textFrom(info.audit_schema_version, "audit schema version"),
    policyVersion: textFrom(info.policy_version, "policy version"),
    auditCount: numberFrom(info.audit_count, "audit count"),
    configDigest: textFrom(info.config_digest, "configuration digest"),
  };
}

export function normalizePublicUrl(input: string): string {
  const withScheme = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Enter a complete public website address, such as example.com or https://example.com/page.");
  }
  if (parsed.protocol !== "https:") throw new Error("AccessLens audits HTTPS pages only.");
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error("Remove login details and #fragments from the website address.");
  }
  const host = parsed.hostname.toLowerCase();
  const isNumeric = /^[\d.]+$/.test(host);
  if (!host.includes(".") || host === "localhost" || isNumeric || host.endsWith(".local")) {
    throw new Error("Use a public domain name. Localhost and IP addresses cannot be audited.");
  }
  parsed.hostname = host;
  return parsed.toString();
}

export function verdictLabel(verdict: Verdict): string {
  if (verdict === "CLEAR") return "Clear path";
  if (verdict === "NEEDS_WORK") return "Needs work";
  return "High risk";
}

export function categoryLabel(category: FindingCategory): string {
  if (category === "DARK_PATTERN") return "Dark pattern";
  return category[0] + category.slice(1).toLowerCase();
}

export function shortAddress(value: string): string {
  return value.length > 14 ? `${value.slice(0, 7)}…${value.slice(-5)}` : value;
}

export function shortDigest(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
}
