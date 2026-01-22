import { ethers } from "ethers";

// Smart contract ABI (from compiled contracts/BatchStateMachine.sol)
const BATCH_STATE_MACHINE_ABI = [
  "function joinBatch(uint256 batchId) external payable",
  "function payBalance(uint256 batchId) external payable",
  "function storeCommitmentHash(uint256 batchId, bytes32 commitmentHash) external",
  "function slashUser(uint256 batchId, address user) external",
  "function canStillPay(uint256 batchId, address user) external view returns (bool)",
  "function getUserBatchInfo(uint256 batchId, address user) external view returns (bool depositPaid, bool balancePaid, uint256 depositPaidAt, uint256 balancePaidAt)",
  "function getBatchState(uint256 batchId) external view returns (uint8)",
  "function getBatchParticipantCount(uint256 batchId) external view returns (uint256)",
  "function getCurrentBatchId() external view returns (uint256)",
  "function createBatch() external",
  "function stageBatch(uint256 batchId) external",
  "function activateBatch(uint256 batchId) external",
  "function startSequencing(uint256 batchId) external",
  "function completeBatch(uint256 batchId) external",
  "function purgeBatch(uint256 batchId) external",
  "function withdrawFunds(uint256 amount) external",
  "function isAdmin(address account) external view returns (bool)",
  "event BatchCreated(uint256 indexed batchId, uint256 timestamp)",
  "event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount)",
  "event BalancePaid(uint256 indexed batchId, address indexed user, uint256 balanceAmount)",
  "event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount)",
  "event BatchStateChanged(uint256 indexed batchId, uint8 newState)",
];

export enum BatchState {
  Pending = 0,
  Staged = 1,
  Active = 2,
  Sequencing = 3,
  Completed = 4,
  Purged = 5,
}

export const BATCH_STATE_NAMES: Record<BatchState, string> = {
  [BatchState.Pending]: "Pending",
  [BatchState.Staged]: "Staged",
  [BatchState.Active]: "Active",
  [BatchState.Sequencing]: "Sequencing",
  [BatchState.Completed]: "Completed",
  [BatchState.Purged]: "Purged",
};

export interface BatchInfo {
  state: BatchState;
  participantCount: number;
}

export interface UserBatchInfo {
  depositPaid: boolean;
  balancePaid: boolean;
  depositPaidAt: number;
  balancePaidAt: number;
}

/**
 * Get RPC URL with Alchemy support
 */
function getRpcUrl(): string {
  const alchemyKey = process.env.ALCHEMY_API_KEY;
  const explicitRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

  // If Alchemy API key is set, use it to construct the URL
  if (alchemyKey) {
    // Determine network from chain ID or default to Sepolia
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

    // Map chain IDs to Alchemy network names
    const networkMap: Record<string, string> = {
      "1": "eth-mainnet",
      "11155111": "eth-sepolia",
      "42161": "arb-mainnet",
      "421614": "arb-sepolia",
      "8453": "base-mainnet",
      "84532": "base-sepolia",
    };

    const network = chainId ? networkMap[chainId] || "eth-sepolia" : "eth-sepolia";
    return `https://${network}.g.alchemy.com/v2/${alchemyKey}`;
  }

  // Fall back to explicit RPC URL or localhost
  return explicitRpcUrl || "http://localhost:8545";
}

/**
 * Get a read-only contract instance (for queries)
 */
export function getContract(providerOrSigner?: ethers.Provider | ethers.Signer) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not configured");
  }

  if (!providerOrSigner) {
    // Use Alchemy or default provider
    const rpcUrl = getRpcUrl();
    providerOrSigner = new ethers.JsonRpcProvider(rpcUrl);
  }

  return new ethers.Contract(
    contractAddress,
    BATCH_STATE_MACHINE_ABI,
    providerOrSigner
  );
}

/**
 * Get a contract instance with a signer (for transactions)
 */
export function getContractWithSigner(signer: ethers.Signer) {
  return getContract(signer);
}

/**
 * Get a provider instance (uses Alchemy if configured)
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = getRpcUrl();
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get current batch ID
 */
export async function getCurrentBatchId(): Promise<number> {
  const contract = getContract();
  const batchId = await contract.getCurrentBatchId();
  return Number(batchId);
}

/**
 * Get batch state
 */
export async function getBatchState(batchId: number): Promise<BatchState> {
  const contract = getContract();
  const state = await contract.getBatchState(batchId);
  return Number(state) as BatchState;
}

/**
 * Get batch participant count
 */
export async function getBatchParticipantCount(batchId: number): Promise<number> {
  const contract = getContract();
  const count = await contract.getBatchParticipantCount(batchId);
  return Number(count);
}

/**
 * Get user's batch info
 */
export async function getUserBatchInfo(
  batchId: number,
  userAddress: string
): Promise<UserBatchInfo> {
  const contract = getContract();
  const info = await contract.getUserBatchInfo(batchId, userAddress);
  return {
    depositPaid: info.depositPaid,
    balancePaid: info.balancePaid,
    depositPaidAt: Number(info.depositPaidAt),
    balancePaidAt: Number(info.balancePaidAt),
  };
}

/**
 * Check if user can still pay
 */
export async function canUserStillPay(
  batchId: number,
  userAddress: string
): Promise<boolean> {
  const contract = getContract();
  return await contract.canStillPay(batchId, userAddress);
}

/**
 * Check if address is admin
 */
export async function isAdmin(address: string): Promise<boolean> {
  const contract = getContract();
  return await contract.isAdmin(address);
}

/**
 * Join batch (requires signer)
 */
export async function joinBatch(
  batchId: number,
  depositAmount: bigint,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.joinBatch(batchId, { value: depositAmount });
  return await tx.wait();
}

/**
 * Pay balance (requires signer)
 */
export async function payBalance(
  batchId: number,
  balanceAmount: bigint,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.payBalance(batchId, { value: balanceAmount });
  return await tx.wait();
}

/**
 * Store commitment hash (requires signer)
 */
export async function storeCommitmentHash(
  batchId: number,
  commitmentHash: string,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.storeCommitmentHash(batchId, commitmentHash);
  return await tx.wait();
}

// Admin functions

/**
 * Create new batch (admin only)
 */
export async function createBatch(signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.createBatch();
  return await tx.wait();
}

/**
 * Stage batch (admin only)
 */
export async function stageBatch(batchId: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.stageBatch(batchId);
  return await tx.wait();
}

/**
 * Activate batch (admin only)
 */
export async function activateBatch(batchId: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.activateBatch(batchId);
  return await tx.wait();
}

/**
 * Start sequencing (admin only)
 */
export async function startSequencing(batchId: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.startSequencing(batchId);
  return await tx.wait();
}

/**
 * Complete batch (admin only)
 */
export async function completeBatch(batchId: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.completeBatch(batchId);
  return await tx.wait();
}

/**
 * Purge batch (admin only)
 */
export async function purgeBatch(batchId: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.purgeBatch(batchId);
  return await tx.wait();
}

/**
 * Slash user (admin only)
 */
export async function slashUser(
  batchId: number,
  userAddress: string,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.slashUser(batchId, userAddress);
  return await tx.wait();
}

/**
 * Withdraw funds (admin only)
 */
export async function withdrawFunds(amount: bigint, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.withdrawFunds(amount);
  return await tx.wait();
}
