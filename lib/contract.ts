import { ethers } from "ethers";

// Smart contract ABI (from compiled contracts/BatchStateMachine.sol)
const BATCH_STATE_MACHINE_ABI = [
  "function joinBatch() external payable",
  "function payBalance(uint256 batchId) external payable",
  "function storeCommitmentHash(uint256 batchId, bytes32 commitmentHash) external",
  "function slashUser(uint256 batchId, address user) external",
  "function canStillPay(uint256 batchId, address user) external view returns (bool)",
  "function getBatchInfo(uint256 batchId) external view returns (uint8 state, uint256 participantCount, uint256 maxBatchSize, uint256 createdAt, uint256 stateChangedAt)",
  "function getParticipantInfo(uint256 batchId, address user) external view returns (bytes32 commitmentHash, uint256 depositAmount, uint256 balanceAmount, bool balancePaid, bool slashed, uint256 joinedAt, uint256 paymentDeadline)",
  "function isParticipant(uint256 batchId, address user) external view returns (bool)",
  "function getParticipantAddress(uint256 batchId, uint256 index) external view returns (address)",
  "function currentBatchId() external view returns (uint256)",
  "function fullPrice() external view returns (uint256)",
  "function defaultBatchSize() external view returns (uint256)",
  "function setDefaultBatchSize(uint256 newSize) external",
  "function setBatchSize(uint256 batchId, uint256 newSize) external",
  "function transitionBatchState(uint256 batchId, uint8 newState) external",
  "function updateFullPrice(uint256 newPrice) external",
  "function withdrawFunds(uint256 amount) external",
  "function owner() external view returns (address)",
  "event BatchCreated(uint256 indexed batchId, uint256 maxBatchSize, uint256 timestamp)",
  "event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount)",
  "event BalancePaymentReceived(uint256 indexed batchId, address indexed user, uint256 amount)",
  "event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount)",
  "event BatchStateChanged(uint256 indexed batchId, uint8 newState, uint256 timestamp)",
  "event CommitmentHashStored(uint256 indexed batchId, address indexed user, bytes32 commitmentHash)",
  "event FundsWithdrawn(address indexed admin, uint256 amount)",
  "event DefaultBatchSizeChanged(uint256 oldSize, uint256 newSize, uint256 timestamp)",
  "event BatchSizeChanged(uint256 indexed batchId, uint256 oldSize, uint256 newSize, uint256 timestamp)",
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
  maxBatchSize: number;
  createdAt: number;
  stateChangedAt: number;
}

export interface ParticipantInfo {
  commitmentHash: string;
  depositAmount: bigint;
  balanceAmount: bigint;
  balancePaid: boolean;
  slashed: boolean;
  joinedAt: number;
  paymentDeadline: number;
}

/**
 * Get RPC URL with Alchemy support and CSP-safe localhost proxying
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

  // For localhost in browser, use API proxy to avoid CSP issues
  if (typeof window !== "undefined" && explicitRpcUrl?.includes("localhost")) {
    return `${window.location.origin}/api/rpc`;
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
  const batchId = await contract.currentBatchId();
  return Number(batchId);
}

/**
 * Get batch info (state, participant count, max size, timestamps)
 */
export async function getBatchInfo(batchId: number): Promise<BatchInfo> {
  const contract = getContract();

  try {
    // Try new contract version with maxBatchSize
    const info = await contract.getBatchInfo(batchId);
    return {
      state: Number(info[0]) as BatchState,
      participantCount: Number(info[1]),
      maxBatchSize: Number(info[2]),
      createdAt: Number(info[3]),
      stateChangedAt: Number(info[4]),
    };
  } catch (error: any) {
    // Fallback for old contract version without maxBatchSize
    if (error.code === 'BAD_DATA') {
      // Use old ABI temporarily
      const oldABI = ["function getBatchInfo(uint256 batchId) external view returns (uint8 state, uint256 participantCount, uint256 createdAt, uint256 stateChangedAt)"];
      const oldContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
        oldABI,
        getProvider()
      );
      const info = await oldContract.getBatchInfo(batchId);
      return {
        state: Number(info[0]) as BatchState,
        participantCount: Number(info[1]),
        maxBatchSize: 24, // Default fallback
        createdAt: Number(info[2]),
        stateChangedAt: Number(info[3]),
      };
    }
    throw error;
  }
}

/**
 * Get full price from contract
 */
export async function getFullPrice(): Promise<bigint> {
  const contract = getContract();
  return await contract.fullPrice();
}

/**
 * Get participant info
 */
export async function getParticipantInfo(
  batchId: number,
  userAddress: string
): Promise<ParticipantInfo> {
  const contract = getContract();
  const info = await contract.getParticipantInfo(batchId, userAddress);
  return {
    commitmentHash: info.commitmentHash,
    depositAmount: info.depositAmount,
    balanceAmount: info.balanceAmount,
    balancePaid: info.balancePaid,
    slashed: info.slashed,
    joinedAt: Number(info.joinedAt),
    paymentDeadline: Number(info.paymentDeadline),
  };
}

/**
 * Check if user is participant in batch
 */
export async function isParticipant(
  batchId: number,
  userAddress: string
): Promise<boolean> {
  const contract = getContract();
  return await contract.isParticipant(batchId, userAddress);
}

/**
 * Get all participant addresses for a batch by iterating through participants array
 */
export async function getBatchParticipants(batchId: number): Promise<string[]> {
  const contract = getContract();
  const batchInfo = await contract.getBatchInfo(batchId);
  const participantCount = Number(batchInfo.participantCount);

  const addresses: string[] = [];
  // Participants are 1-indexed in the contract
  for (let i = 1; i <= participantCount; i++) {
    const address = await contract.getParticipantAddress(batchId, i);
    addresses.push(address);
  }

  return addresses;
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
 * Check if address is owner
 */
export async function isOwner(address: string): Promise<boolean> {
  const contract = getContract();
  const ownerAddress = await contract.owner();
  return ownerAddress.toLowerCase() === address.toLowerCase();
}

/**
 * Join batch (requires signer) - joins current pending batch
 */
export async function joinBatch(
  depositAmount: bigint,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.joinBatch({ value: depositAmount });
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
 * Transition batch state (owner only)
 */
export async function transitionBatchState(
  batchId: number,
  newState: BatchState,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.transitionBatchState(batchId, newState);
  return await tx.wait();
}

/**
 * Update full price (owner only)
 */
export async function updateFullPrice(newPrice: bigint, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.updateFullPrice(newPrice);
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

/**
 * Get default batch size
 */
export async function getDefaultBatchSize(): Promise<number> {
  const contract = getContract();
  const size = await contract.defaultBatchSize();
  return Number(size);
}

/**
 * Set default batch size (admin only)
 */
export async function setDefaultBatchSize(newSize: number, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.setDefaultBatchSize(newSize);
  return await tx.wait();
}

/**
 * Set batch size for a specific batch (admin only)
 */
export async function setBatchSize(
  batchId: number,
  newSize: number,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.setBatchSize(batchId, newSize);
  return await tx.wait();
}
