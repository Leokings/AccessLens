import deployment from "../../deployments/studionet.json";

export const CONTRACT_ADDRESS = deployment.contractAddress as `0x${string}`;
export const EXPLORER_URL = deployment.explorerUrl.replace(/\/$/, "");
export const CONTRACT_EXPLORER_URL = `${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`;
export const PREVIOUS_CONTRACT_EXPLORER_URL = `${EXPLORER_URL}/address/${deployment.supersedesContractAddress}`;
export const GITHUB_URL = "https://github.com/Leokings/AccessLens";

export function transactionExplorerUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
