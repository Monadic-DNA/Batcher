import { ethers } from "ethers";

// Smart contract ABI (from compiled contracts/BatchStateMachine.sol)
const BATCH_STATE_MACHINE_ABI = [
  "function joinBatch() external",
  "function joinBatchWithDiscount(bytes32 discountCodeHash) external",
  "function payBalance(uint256 batchId) external",
  "function payBalanceWithDiscount(uint256 batchId, bytes32 discountCodeHash) external",
  "function markBalanceAsPaid(uint256 batchId, address user, uint256 balanceAmount) external",
  "function usdcToken() external view returns (address)",
  "function pause() external",
  "function unpause() external",
  "function paused() external view returns (bool)",
  "function storeCommitmentHash(uint256 batchId, bytes32 commitmentHash) external",
  "function slashUser(uint256 batchId, address user) external",
  "function canStillPay(uint256 batchId, address user) external view returns (bool)",
  "function allParticipantsPaid(uint256 batchId) external view returns (bool)",
  "function getBatchInfo(uint256 batchId) external view returns (uint8 state, uint256 participantCount, uint256 activeParticipantCount, uint256 unpaidActiveParticipants, uint256 maxBatchSize, uint256 createdAt, uint256 stateChangedAt)",
  "function getParticipantInfo(uint256 batchId, address user) external view returns (bytes32 commitmentHash, uint256 depositAmount, uint256 balanceAmount, bool balancePaid, bool slashed, uint256 joinedAt, uint256 paymentDeadline)",
  "function isParticipant(uint256 batchId, address user) external view returns (bool)",
  "function getParticipantAddress(uint256 batchId, uint256 index) external view returns (address)",
  "function currentBatchId() external view returns (uint256)",
  "function depositPrice() external view returns (uint256)",
  "function batchBalancePrice(uint256 batchId) external view returns (uint256)",
  "function defaultBatchSize() external view returns (uint256)",
  "function setDefaultBatchSize(uint256 newSize) external",
  "function setBatchSize(uint256 batchId, uint256 newSize) external",
  "function transitionBatchState(uint256 batchId, uint8 newState, uint256 balancePrice) external",
  "function setDepositPrice(uint256 newPrice) external",
  "function setBatchBalancePrice(uint256 batchId, uint256 balancePrice) external",
  "function withdrawFunds(uint256 amount) external",
  "function withdrawSlashedFunds() external",
  "function slashedFunds() external view returns (uint256)",
  "function removeParticipant(uint256 batchId, address user) external",
  "function registerDiscountCode(bytes32 codeHash, uint256 discountValue, bool isPercentage, uint256 maxUses, bool appliesToDeposit, bool appliesToBalance) external",
  "function deactivateDiscountCode(bytes32 codeHash) external",
  "function discountCodes(bytes32 codeHash) external view returns (uint256 discountValue, bool isPercentage, uint256 remainingUses, bool active, bool appliesToDeposit, bool appliesToBalance)",
  "function userUsedDiscount(address user, bytes32 codeHash) external view returns (bool)",
  "function owner() external view returns (address)",
  "event BatchCreated(uint256 indexed batchId, uint256 maxBatchSize, uint256 timestamp)",
  "event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount)",
  "event BalancePaymentReceived(uint256 indexed batchId, address indexed user, uint256 amount)",
  "event BalanceManuallyMarked(uint256 indexed batchId, address indexed user, uint256 amount, bool wasSlashed, bool afterDeadline)",
  "event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount, uint256 remainingDeposit)",
  "event BatchStateChanged(uint256 indexed batchId, uint8 newState, uint256 timestamp)",
  "event CommitmentHashStored(uint256 indexed batchId, address indexed user, bytes32 commitmentHash)",
  "event FundsWithdrawn(address indexed admin, uint256 amount)",
  "event SlashedFundsWithdrawn(address indexed admin, uint256 amount)",
  "event DefaultBatchSizeChanged(uint256 oldSize, uint256 newSize, uint256 timestamp)",
  "event BatchSizeChanged(uint256 indexed batchId, uint256 oldSize, uint256 newSize, uint256 timestamp)",
  "event ParticipantRemoved(uint256 indexed batchId, address indexed user, uint256 refundAmount, bool balancePaid, bool slashed)",
  "event DepositPriceChanged(uint256 oldPrice, uint256 newPrice)",
  "event BalancePriceSet(uint256 indexed batchId, uint256 balancePrice)",
  "event DiscountCodeRegistered(bytes32 indexed codeHash, uint256 discountValue, bool isPercentage, uint256 maxUses, bool appliesToDeposit, bool appliesToBalance)",
  "event DiscountCodeUsed(bytes32 indexed codeHash, address indexed user, uint256 discountAmount, bool forDeposit)",
  "event DiscountCodeDeactivated(bytes32 indexed codeHash)",
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
  activeParticipantCount: number;
  unpaidActiveParticipants: number;
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
  const info = await contract.getBatchInfo(batchId);
  return {
    state: Number(info[0]) as BatchState,
    participantCount: Number(info[1]),
    activeParticipantCount: Number(info[2]),
    unpaidActiveParticipants: Number(info[3]),
    maxBatchSize: Number(info[4]),
    createdAt: Number(info[5]),
    stateChangedAt: Number(info[6]),
  };
}

/**
 * Get deposit price from contract
 */
export async function getDepositPrice(): Promise<bigint> {
  const contract = getContract();
  return await contract.depositPrice();
}

/**
 * Get balance price for a specific batch
 */
export async function getBatchBalancePrice(batchId: number): Promise<bigint> {
  const contract = getContract();
  return await contract.batchBalancePrice(batchId);
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
 * Check if all active participants have paid their balance
 */
export async function allParticipantsPaid(batchId: number): Promise<boolean> {
  const contract = getContract();
  return await contract.allParticipantsPaid(batchId);
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
 * User must have approved USDC spending before calling this
 */
export async function joinBatch(
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.joinBatch();
  return await tx.wait();
}

/**
 * Pay balance (requires signer)
 * User must have approved USDC spending before calling this
 */
export async function payBalance(
  batchId: number,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.payBalance(batchId);
  return await tx.wait();
}

/**
 * Manually mark balance as paid (admin only)
 * Use case: Off-chain payments, manual corrections
 */
export async function markBalanceAsPaid(
  batchId: number,
  userAddress: string,
  balanceAmount: bigint,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.markBalanceAsPaid(batchId, userAddress, balanceAmount);
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
 * When transitioning from Staged to Active, balancePrice must be provided
 */
export async function transitionBatchState(
  batchId: number,
  newState: BatchState,
  signer: ethers.Signer,
  balancePrice: bigint = 0n
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.transitionBatchState(batchId, newState, balancePrice);
  return await tx.wait();
}

/**
 * Set deposit price (owner only)
 */
export async function setDepositPrice(newPrice: bigint, signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.setDepositPrice(newPrice);
  return await tx.wait();
}

/**
 * Set balance price for a specific batch (owner only)
 */
export async function setBatchBalancePrice(
  batchId: number,
  balancePrice: bigint,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.setBatchBalancePrice(batchId, balancePrice);
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

/**
 * Remove participant and refund them (admin only)
 */
export async function removeParticipant(
  batchId: number,
  userAddress: string,
  signer: ethers.Signer
) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.removeParticipant(batchId, userAddress);
  return await tx.wait();
}


// ERC20 ABI for USDC interactions
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

/**
 * Get USDC token address from contract
 */
export async function getUsdcTokenAddress(): Promise<string> {
  const contract = getContract();
  return await contract.usdcToken();
}

/**
 * Get USDC contract instance
 */
export function getUsdcContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!usdcAddress) {
    throw new Error("USDC address not configured");
  }
  return new ethers.Contract(
    usdcAddress,
    ERC20_ABI,
    signerOrProvider || getProvider()
  );
}

/**
 * Approve USDC spending for the contract
 */
export async function approveUsdcSpending(
  amount: bigint,
  signer: ethers.Signer
) {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not configured");
  }

  const usdcContract = getUsdcContract(signer);
  const tx = await usdcContract.approve(contractAddress, amount);
  return await tx.wait();
}

/**
 * Check USDC allowance
 */
export async function getUsdcAllowance(
  ownerAddress: string,
  spenderAddress?: string
): Promise<bigint> {
  const contractAddress = spenderAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not configured");
  }

  const usdcContract = getUsdcContract();
  return await usdcContract.allowance(ownerAddress, contractAddress);
}

/**
 * Get USDC balance
 */
export async function getUsdcBalance(address: string): Promise<bigint> {
  const usdcContract = getUsdcContract();
  return await usdcContract.balanceOf(address);
}

/**
 * Pause contract (admin only)
 */
export async function pauseContract(signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.pause();
  return await tx.wait();
}

/**
 * Unpause contract (admin only)
 */
export async function unpauseContract(signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.unpause();
  return await tx.wait();
}

/**
 * Check if contract is paused
 */
export async function isContractPaused(): Promise<boolean> {
  const contract = getContract();
  return await contract.paused();
}

/**
 * Get total slashed funds available for withdrawal
 */
export async function getSlashedFunds(): Promise<bigint> {
  const contract = getContract();
  return await contract.slashedFunds();
}

/**
 * Withdraw slashed funds (admin only)
 */
export async function withdrawSlashedFunds(signer: ethers.Signer) {
  const contract = getContractWithSigner(signer);
  const tx = await contract.withdrawSlashedFunds();
  return await tx.wait();
}

// Discount code functions

/**
 * Hash a discount code string to bytes32 for on-chain use
 */
export function hashDiscountCode(code: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(code));
}

/**
 * Register a new discount code (admin only)
 */
export async function registerDiscountCode(
  code: string,
  discountValue: bigint,
  isPercentage: boolean,
  maxUses: number,
  appliesToDeposit: boolean,
  appliesToBalance: boolean,
  signer: ethers.Signer
) {
  const codeHash = hashDiscountCode(code);
  const contract = getContractWithSigner(signer);
  const tx = await contract.registerDiscountCode(
    codeHash,
    discountValue,
    isPercentage,
    maxUses,
    appliesToDeposit,
    appliesToBalance
  );
  return await tx.wait();
}

/**
 * Deactivate a discount code (admin only)
 */
export async function deactivateDiscountCode(code: string, signer: ethers.Signer) {
  const codeHash = hashDiscountCode(code);
  const contract = getContractWithSigner(signer);
  const tx = await contract.deactivateDiscountCode(codeHash);
  return await tx.wait();
}

/**
 * Get discount code info
 */
export async function getDiscountCodeInfo(code: string) {
  const codeHash = hashDiscountCode(code);
  const contract = getContract();
  const info = await contract.discountCodes(codeHash);
  return {
    discountValue: info.discountValue,
    isPercentage: info.isPercentage,
    remainingUses: Number(info.remainingUses),
    active: info.active,
    appliesToDeposit: info.appliesToDeposit,
    appliesToBalance: info.appliesToBalance,
  };
}

/**
 * Check if user has used a discount code
 */
export async function hasUserUsedDiscount(userAddress: string, code: string): Promise<boolean> {
  const codeHash = hashDiscountCode(code);
  const contract = getContract();
  return await contract.userUsedDiscount(userAddress, codeHash);
}

/**
 * Join batch with discount code
 */
export async function joinBatchWithDiscount(code: string, signer: ethers.Signer) {
  const codeHash = hashDiscountCode(code);
  const contract = getContractWithSigner(signer);
  const tx = await contract.joinBatchWithDiscount(codeHash);
  return await tx.wait();
}

/**
 * Pay balance with discount code
 */
export async function payBalanceWithDiscount(
  batchId: number,
  code: string,
  signer: ethers.Signer
) {
  const codeHash = hashDiscountCode(code);
  const contract = getContractWithSigner(signer);
  const tx = await contract.payBalanceWithDiscount(batchId, codeHash);
  return await tx.wait();
}
