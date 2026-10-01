export type Verdict = "CLEAR" | "NEEDS_WORK" | "HIGH_RISK";
export type FindingCategory = "ACCESSIBILITY" | "DARK_PATTERN" | "TRUST";
export type FindingSeverity = "HIGH" | "MEDIUM" | "LOW";

export type Finding = {
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  evidence: string;
  recommendation: string;
};

export type AuditRecord = {
  auditId: number;
  requestReference: string;
  requester: string;
  url: string;
  domain: string;
  focus: string;
  previousAuditId: number;
  overallScore: number;
  accessibilityScore: number;
  darkPatternScore: number;
  trustScore: number;
  verdict: Verdict;
  findings: Finding[];
  summary: string;
  pageDigest: string;
  pageChars: number;
  pageTruncated: boolean;
  policyVersion: string;
  createdAt: number;
  auditDigest: string;
  transactionHash?: string;
};

export type ContractInfo = {
  contractVersion: string;
  auditSchemaVersion: string;
  policyVersion: string;
  auditCount: number;
  configDigest: string;
};

export type WalletKind = "browser" | "studio";

export type ConnectedWallet = {
  address: string;
  kind: WalletKind;
};

export type AuditStatus =
  | { phase: "idle"; message: string }
  | { phase: "signing" | "submitted" | "finalizing" | "reading"; message: string; hash?: string }
  | { phase: "success"; message: string; hash: string }
  | { phase: "error"; message: string; hash?: string };
