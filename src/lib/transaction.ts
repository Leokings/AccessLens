export type AuditTransactionState = {
  statusName?: string;
  resultName?: string;
  result_name?: string;
  txExecutionResultName?: string;
  consensus_data?: {
    leader_receipt?: Array<{ execution_result?: string }>;
  };
};

export function classifyAuditTransaction(
  transaction: AuditTransactionState,
): "pending" | "succeeded" | "failed" | "unknown" {
  if (transaction.statusName !== "FINALIZED") return "pending";

  const decision = transaction.resultName ?? transaction.result_name;
  const execution = transaction.txExecutionResultName
    ?? transaction.consensus_data?.leader_receipt?.[0]?.execution_result;

  if (decision && decision !== "MAJORITY_AGREE") return "failed";
  if (execution && execution !== "SUCCESS" && execution !== "FINISHED_WITH_RETURN") {
    return "failed";
  }
  return decision === "MAJORITY_AGREE" && execution ? "succeeded" : "unknown";
}
