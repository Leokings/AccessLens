import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  TransactionHashVariant,
  TransactionStatus,
  type CalldataEncodable,
  type TransactionHash,
} from "genlayer-js/types";
import { getAddress, isAddress } from "viem";
import type { AuditRecord, ConnectedWallet, ContractInfo, WalletKind } from "../types";
import { normalizePublicUrl, parseAudit, parseContractInfo } from "./audit";
import { CONTRACT_ADDRESS } from "./config";

const STUDIO_SESSION_KEY = "accesslens:v1:studio-session-private-key";
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
  return parseAudit(await read("get_audit_by_reference", [getAddress(requester), reference]));
}

function requestReference(): string {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `audit-${Date.now().toString(36)}-${suffix}`;
}

async function waitForSuccessfulFinality(hash: TransactionHash): Promise<void> {
  await readClient.waitForTransactionReceipt({
    hash,
    interval: 3_000,
    retries: 400,
    status: TransactionStatus.FINALIZED,
  });
  const transaction = await readClient.getTransaction({ hash });
  if (transaction.statusName !== TransactionStatus.FINALIZED) {
    throw new Error("The audit has not reached GenLayer finality yet.");
  }
  if (
    transaction.txExecutionResultName &&
    transaction.txExecutionResultName !== "FINISHED_WITH_RETURN"
  ) {
    throw new Error(`The finalized audit failed: ${transaction.txExecutionResultName}.`);
  }
}

export async function submitAudit(
  wallet: ConnectedWallet,
  input: { url: string; focus: string; previousAuditId?: number },
  onUpdate?: (phase: "signing" | "submitted" | "finalizing" | "reading", hash?: string) => void,
): Promise<{ audit: AuditRecord; hash: string }> {
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
  onUpdate?.("submitted", hash);
  onUpdate?.("finalizing", hash);
  await waitForSuccessfulFinality(hash);
  onUpdate?.("reading", hash);
  const audit = await getAuditByReference(wallet.address, reference);
  return { audit: { ...audit, transactionHash: hash }, hash };
}
