import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  CalldataAddress,
  TransactionHashVariant,
  TransactionStatus,
  type CalldataEncodable,
  type TransactionHash,
} from "genlayer-js/types";
import { getAddress, hexToBytes, isAddress } from "viem";
import type { AuditRecord, ConnectedWallet, ContractInfo, WalletKind } from "../types";
import { normalizePublicUrl, parseAudit, parseContractInfo } from "./audit";
import { CONTRACT_ADDRESS } from "./config";
import { classifyAuditTransaction } from "./transaction";

const STUDIO_SESSION_KEY = "accesslens:v1:studio-session-private-key";
const PENDING_AUDIT_KEY = "accesslens:v1:pending-audit";
const DEFAULT_RPC_URL = "https://studio.genlayer.com/api";
const RPC_URL = import.meta.env.VITE_GENLAYER_RPC_URL?.trim() || DEFAULT_RPC_URL;
const configuredAddress =
  import.meta.env.VITE_ACCESSLENS_CONTRACT_ADDRESS?.trim() || CONTRACT_ADDRESS;

if (!/^0x[a-fA-F0-9]{40}$/.test(configuredAddress)) {
  throw new Error("VITE_ACCESSLENS_CONTRACT_ADDRESS is not a valid address.");
}

const contractAddress = getAddress(configuredAddress);

const chain = {
  ...studionet,
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const readClient = createClient({ chain, endpoint: RPC_URL });

type ClientConfig = NonNullable<Parameters<typeof createClient>[0]>;
type WalletProvider = NonNullable<ClientConfig["provider"]>;
type ProviderRequest = { method: string; params?: unknown[] };
type InjectedProvider = WalletProvider & {
  request(args: ProviderRequest): Promise<unknown>;
};

let activeBrowserProvider: InjectedProvider | undefined;

export type PendingAudit = {
  hash: TransactionHash;
  reference: string;
  requester: string;
  url: string;
};

class FinalizedAuditError extends Error {}

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

function asTransactionHash(value: unknown): TransactionHash {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("GenLayer did not return a valid transaction ID.");
  }
  return value as TransactionHash;
}

function injectedProvider(): InjectedProvider {
  const provider = window.ethereum;
  if (!provider || typeof provider.request !== "function") {
    throw new Error(
      "No browser wallet was detected. Use the one-click temporary Studio wallet, or open a wallet extension first.",
    );
  }
  return provider;
}

async function ensureStudionet(provider: InjectedProvider): Promise<void> {
  const chainId = `0x${chain.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (cause) {
    const code = cause && typeof cause === "object" && "code" in cause
      ? Number((cause as { code?: unknown }).code)
      : 0;
    if (code === -32_002) throw new Error("A wallet network request is already waiting for approval.");
    if (code !== 4_902) throw cause;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [RPC_URL],
          blockExplorerUrls: chain.blockExplorers?.default
            ? [chain.blockExplorers.default.url]
            : undefined,
        },
      ],
    });
  }
}

function readStudioAccount(address?: string) {
  try {
    const privateKey = window.sessionStorage.getItem(STUDIO_SESSION_KEY);
    if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) return undefined;
    const account = createAccount(privateKey as `0x${string}`);
    if (address && account.address.toLowerCase() !== address.toLowerCase()) return undefined;
    return account;
  } catch {
    return undefined;
  }
}

export function restoreStudioWallet(): ConnectedWallet | null {
  if (typeof window === "undefined") return null;
  const account = readStudioAccount();
  return account ? { address: account.address.toLowerCase(), kind: "studio" } : null;
}

export async function connectWallet(kind: WalletKind): Promise<ConnectedWallet> {
  if (kind === "studio") {
    let account = readStudioAccount();
    if (!account) {
      const privateKey = generatePrivateKey();
      window.sessionStorage.setItem(STUDIO_SESSION_KEY, privateKey);
      account = createAccount(privateKey);
    }
    return { address: account.address.toLowerCase(), kind };
  }

  const provider = injectedProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !isAddress(accounts[0])) {
    throw new Error("The browser wallet did not return a valid account.");
  }
  await ensureStudionet(provider);
  activeBrowserProvider = provider;
  return { address: getAddress(accounts[0]), kind };
}

async function writeClient(wallet: ConnectedWallet) {
  if (wallet.kind === "studio") {
    const account = readStudioAccount(wallet.address);
    if (!account) throw new Error("The temporary wallet ended with this browser tab. Create a new one to continue.");
    return createClient({ account, chain, endpoint: RPC_URL });
  }
  const provider = activeBrowserProvider ?? injectedProvider();
  await ensureStudionet(provider);
  activeBrowserProvider = provider;
  return createClient({
    account: getAddress(wallet.address),
    chain,
    endpoint: RPC_URL,
    provider,
  });
}

async function read(functionName: string, args: CalldataEncodable[] = []) {
  return readClient.readContract({
    address: contractAddress,
    functionName,
    args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
}

export async function getContractInfo(): Promise<ContractInfo> {
  return parseContractInfo(await read("get_contract_info"));
}

export async function getRecentAudits(limit = 8): Promise<AuditRecord[]> {
  const value = await read("get_recent_audits", [BigInt(limit)]);
  if (!Array.isArray(value)) throw new Error("GenLayer returned an invalid audit list.");
  return value.map(parseAudit);
}

export async function getAuditByReference(
  requester: string,
  reference: string,
): Promise<AuditRecord> {
  const addressArgument = new CalldataAddress(hexToBytes(getAddress(requester)));
  return parseAudit(await read("get_audit_by_reference", [addressArgument, reference]));
}

export function getPendingAudit(): PendingAudit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_AUDIT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const pending = value as Record<string, unknown>;
    if (
      typeof pending.hash !== "string" || !/^0x[\da-fA-F]{64}$/.test(pending.hash) ||
      typeof pending.reference !== "string" || !/^[-\w.]{8,72}$/.test(pending.reference) ||
      typeof pending.requester !== "string" || !isAddress(pending.requester) ||
      typeof pending.url !== "string" || !pending.url.startsWith("https://")
    ) return null;
    return pending as PendingAudit;
  } catch {
    return null;
  }
}

function forgetPendingAudit(hash: TransactionHash): void {
  if (getPendingAudit()?.hash === hash) {
    window.sessionStorage.removeItem(PENDING_AUDIT_KEY);
  }
}

function requestReference(): string {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `audit-${Date.now().toString(36)}-${suffix}`;
}

async function waitForSuccessfulFinality(hash: TransactionHash): Promise<void> {
  let waitError: unknown;
  try {
    await readClient.waitForTransactionReceipt({
      hash,
      interval: 3_000,
      retries: 400,
      status: TransactionStatus.FINALIZED,
    });
  } catch (cause) {
    waitError = cause;
  }

  let transaction: Awaited<ReturnType<typeof readClient.getTransaction>>;
  try {
    transaction = await readClient.getTransaction({ hash });
  } catch (cause) {
    throw waitError ?? cause;
  }

  const outcome = classifyAuditTransaction(transaction);
  if (outcome === "failed") {
    throw new FinalizedAuditError(
      "Validators did not approve this audit, so no report was stored. Try a stable public page or retry later.",
    );
  }
  if (outcome === "pending") {
    throw new Error("StudioNet has not finalized this audit. Resume it after refreshing the page.");
  }
  // Some StudioNet nodes omit the execution result from their normalized read.
  // A finalized result with incomplete fields must also pass the contract readback.
}

async function finishPendingAudit(
  pending: PendingAudit,
  onUpdate?: (phase: "signing" | "submitted" | "finalizing" | "reading", hash?: string) => void,
): Promise<{ audit: AuditRecord; hash: string }> {
  onUpdate?.("finalizing", pending.hash);
  try {
    await waitForSuccessfulFinality(pending.hash);
  } catch (cause) {
    if (cause instanceof FinalizedAuditError) forgetPendingAudit(pending.hash);
    throw cause;
  }

  onUpdate?.("reading", pending.hash);
  let audit: AuditRecord;
  try {
    audit = await getAuditByReference(pending.requester, pending.reference);
  } catch {
    // The latest-final read can lag the transaction on a StudioNet RPC node.
    // Search the finalized ledger for the exact requester/reference before
    // treating this as an uncertain read, never as a fresh-write invitation.
    const recent = await getRecentAudits(20).catch(() => []);
    const recovered = recent.find(
      (item) => item.requester.toLowerCase() === pending.requester.toLowerCase()
        && item.requestReference === pending.reference,
    );
    if (!recovered) {
      throw new Error("The transaction finalized, but its audit record could not be read yet. Resume this transaction; do not submit it again.");
    }
    audit = recovered;
  }

  forgetPendingAudit(pending.hash);
  return { audit: { ...audit, transactionHash: pending.hash }, hash: pending.hash };
}

export async function resumePendingAudit(
  onUpdate?: (phase: "signing" | "submitted" | "finalizing" | "reading", hash?: string) => void,
): Promise<{ audit: AuditRecord; hash: string }> {
  const pending = getPendingAudit();
  if (!pending) throw new Error("No pending StudioNet audit was found in this browser tab.");
  return finishPendingAudit(pending, onUpdate);
}

export async function submitAudit(
  wallet: ConnectedWallet,
  input: { url: string; focus: string; previousAuditId?: number },
  onUpdate?: (phase: "signing" | "submitted" | "finalizing" | "reading", hash?: string) => void,
): Promise<{ audit: AuditRecord; hash: string }> {
  if (getPendingAudit()) {
    throw new Error("A previous audit transaction is still pending. Resume it before starting another audit.");
  }
  const url = normalizePublicUrl(input.url);
  const reference = requestReference();
  const client = await writeClient(wallet);
  onUpdate?.("signing");
  const hash = asTransactionHash(
    await client.writeContract({
      address: contractAddress,
      functionName: "audit_site",
      args: [reference, url, input.focus.trim(), BigInt(input.previousAuditId ?? 0)],
      leaderOnly: false,
      value: 0n,
    }),
  );
  const pending: PendingAudit = {
    hash,
    reference,
    requester: wallet.address,
    url,
  };
  window.sessionStorage.setItem(PENDING_AUDIT_KEY, JSON.stringify(pending));
  onUpdate?.("submitted", hash);
  return finishPendingAudit(pending, onUpdate);
}
