import { describe, expect, it } from "vitest";
import { classifyAuditTransaction } from "./transaction";

describe("StudioNet audit transaction outcomes", () => {
  it("recognizes a successful finalized StudioNet receipt", () => {
    expect(classifyAuditTransaction({
      statusName: "FINALIZED",
      result_name: "MAJORITY_AGREE",
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
    })).toBe("succeeded");
  });

  it("rejects a finalized majority disagreement", () => {
    expect(classifyAuditTransaction({
      statusName: "FINALIZED",
      result_name: "MAJORITY_DISAGREE",
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
    })).toBe("failed");
  });

  it("does not treat absent execution fields as success", () => {
    expect(classifyAuditTransaction({ statusName: "FINALIZED" })).toBe("unknown");
  });

  it("does not treat an undecided transaction as final", () => {
    expect(classifyAuditTransaction({
      statusName: "ACCEPTED",
      result_name: "MAJORITY_AGREE",
      consensus_data: { leader_receipt: [{ execution_result: "SUCCESS" }] },
    })).toBe("pending");
  });
});
