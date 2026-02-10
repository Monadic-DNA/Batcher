// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BatchStateMachine
 * @dev Manages DNA testing batches with state machine, deposits, and privacy commitments
 * State Flow: Pending → Staged → Active → Sequencing → Completed → Purged
 * Payments in USDC stablecoin
 */
contract BatchStateMachine is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    // Batch states
    enum BatchState {
        Pending,    // Collecting users (0-23)
        Staged,     // 24/24 reached, awaiting activation
        Active,     // Kits being registered
        Sequencing, // Lab processing
        Completed,  // Results available
        Purged      // Data deleted after claim window
    }

    // User participation data
    struct Participant {
        address wallet;
        bytes32 commitmentHash; // Hash(KitID + PIN)
        uint256 depositAmount;  // Initial deposit amount (set at join time)
        uint256 balanceAmount;  // Balance payment amount (set at payment time)
        bool balancePaid;
        bool slashed;
        uint256 joinedAt;
        uint256 paymentDeadline; // 7 days after batch becomes Active
    }

    // Batch data
    struct Batch {
        uint256 batchId;
        BatchState state;
        uint256 participantCount;     // Total participants ever added (never decrements)
        uint256 activeParticipantCount; // Current active participants (decrements on removal)
        uint256 unpaidActiveParticipants; // Active participants who haven't paid balance (for O(1) payment check)
        uint256 maxBatchSize; // Size for this specific batch
        mapping(uint256 => Participant) participants; // index => participant
        mapping(address => uint256) participantIndex; // wallet => index
        uint256 createdAt;
        uint256 stateChangedAt;
    }

    // USDC token
    IERC20 public immutable usdcToken;

    // Expected decimals for USDC (enforced at construction)
    uint8 public constant EXPECTED_DECIMALS = 6;

    // Constants
    uint256 public constant PAYMENT_WINDOW = 7 days;
    uint256 public constant PATIENCE_TIMER = 180 days; // 6 months
    uint256 public constant SLASH_PERCENTAGE = 1; // 1% penalty

    // Configurable parameters (can be updated by owner)
    uint256 public depositPrice = 10_000000; // 10 USDC deposit (6 decimals)

    // Balance price per batch (set when transitioning Staged -> Active)
    mapping(uint256 => uint256) public batchBalancePrice;

    // Batch size configuration
    uint256 public defaultBatchSize = 24; // Default size for new batches

    // Slashed funds accumulator (admin can withdraw)
    uint256 public slashedFunds;

    // State
    uint256 public currentBatchId;
    mapping(uint256 => Batch) public batches;

    // Events
    event BatchCreated(uint256 indexed batchId, uint256 maxBatchSize, uint256 timestamp);
    event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount);
    event BatchStateChanged(uint256 indexed batchId, BatchState newState, uint256 timestamp);
    event BalancePaymentReceived(uint256 indexed batchId, address indexed user, uint256 amount);
    event BalanceManuallyMarked(uint256 indexed batchId, address indexed user, uint256 amount, bool wasSlashed, bool afterDeadline);
    event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount, uint256 remainingDeposit);
    event CommitmentHashStored(uint256 indexed batchId, address indexed user, bytes32 commitmentHash);
    event FundsWithdrawn(address indexed admin, uint256 amount);
    event SlashedFundsWithdrawn(address indexed admin, uint256 amount);
    event DefaultBatchSizeChanged(uint256 oldSize, uint256 newSize, uint256 timestamp);
    event BatchSizeChanged(uint256 indexed batchId, uint256 oldSize, uint256 newSize, uint256 timestamp);
    event ParticipantRemoved(uint256 indexed batchId, address indexed user, uint256 refundAmount, bool balancePaid, bool slashed);
    event DepositPriceChanged(uint256 oldPrice, uint256 newPrice);
    event BalancePriceSet(uint256 indexed batchId, uint256 balancePrice);

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");

        // Verify token has 6 decimals (standard for USDC)
        uint8 decimals = IERC20Metadata(_usdcToken).decimals();
        require(decimals == EXPECTED_DECIMALS, "Token must have 6 decimals");

        usdcToken = IERC20(_usdcToken);

        // Initialize first batch
        currentBatchId = 1;
        Batch storage batch = batches[currentBatchId];
        batch.batchId = currentBatchId;
        batch.state = BatchState.Pending;
        batch.maxBatchSize = defaultBatchSize;
        batch.createdAt = block.timestamp;
        batch.stateChangedAt = block.timestamp;
        emit BatchCreated(currentBatchId, defaultBatchSize, block.timestamp);
    }

    /**
     * @dev Join the current pending batch with deposit (uses USDC)
     */
    function joinBatch() external nonReentrant whenNotPaused {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.Pending, "Batch not accepting participants");
        require(batch.activeParticipantCount < batch.maxBatchSize, "Batch is full");
        require(batch.participantIndex[msg.sender] == 0, "Already joined this batch");

        // Add participant (EFFECTS - update state before external call)
        uint256 index = batch.participantCount + 1; // 1-indexed to distinguish from default 0
        batch.participants[index] = Participant({
            wallet: msg.sender,
            commitmentHash: bytes32(0),
            depositAmount: depositPrice,
            balanceAmount: 0,
            balancePaid: false,
            slashed: false,
            joinedAt: block.timestamp,
            paymentDeadline: 0
        });
        batch.participantIndex[msg.sender] = index;
        batch.participantCount++;
        batch.activeParticipantCount++;

        emit UserJoined(currentBatchId, msg.sender, depositPrice);

        // Transfer USDC from user to contract (INTERACTIONS - external call last)
        usdcToken.safeTransferFrom(msg.sender, address(this), depositPrice);

        // Auto-transition to Staged if batch is full (optional)
        // Batch can also be manually progressed by admin with fewer participants
        if (batch.activeParticipantCount == batch.maxBatchSize) {
            _transitionBatchState(currentBatchId, BatchState.Staged);
        }
    }

    /**
     * @dev Pay the balance payment (called after batch becomes Active, uses USDC)
     * Allows payment within payment window + patience timer (6 months grace period)
     */
    function payBalance(uint256 batchId) external nonReentrant whenNotPaused {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, "Batch not active");

        uint256 balanceAmount = batchBalancePrice[batchId];
        require(balanceAmount > 0, "Balance price not set for this batch");

        uint256 index = batch.participantIndex[msg.sender];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(!participant.balancePaid, "Balance already paid");

        // Allow payment within deadline + patience timer (consistent with canStillPay)
        require(
            block.timestamp <= participant.paymentDeadline + PATIENCE_TIMER,
            "Payment window and patience timer expired"
        );

        // Update state (EFFECTS - before external call)
        participant.balanceAmount = balanceAmount;
        participant.balancePaid = true;

        // Decrement unpaid counter
        batch.unpaidActiveParticipants--;

        emit BalancePaymentReceived(batchId, msg.sender, balanceAmount);

        // Transfer USDC from user to contract (INTERACTIONS - external call last)
        usdcToken.safeTransferFrom(msg.sender, address(this), balanceAmount);
    }

    /**
     * @dev Manually mark a participant's balance as paid (admin only)
     * Use case: Off-chain payments, manual corrections, pardons
     *
     * IMPORTANT: This function can bypass normal payment flow and slashing penalties.
     * It allows admin to mark payment as received even:
     * - After payment deadline
     * - For participants who were slashed
     * - Without reversing penalties
     *
     * This is intentional to provide flexibility for edge cases (e.g., bank transfers,
     * payment disputes, goodwill gestures), but emits a distinct event for auditability.
     *
     * @param batchId The batch ID
     * @param user The participant's address
     * @param balanceAmount The amount to record (for accounting)
     */
    function markBalanceAsPaid(uint256 batchId, address user, uint256 balanceAmount) external onlyOwner {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, "Can only mark payment in Active state");

        uint256 index = batch.participantIndex[user];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(participant.wallet != address(0), "Participant has been removed");
        require(!participant.balancePaid, "Balance already marked as paid");

        // Capture state for audit trail
        bool wasSlashed = participant.slashed;
        bool afterDeadline = block.timestamp > participant.paymentDeadline;

        participant.balanceAmount = balanceAmount;
        participant.balancePaid = true;

        // Decrement unpaid counter
        batch.unpaidActiveParticipants--;

        // Emit distinct event to flag this bypassed normal payment flow
        emit BalanceManuallyMarked(batchId, user, balanceAmount, wasSlashed, afterDeadline);
    }

    /**
     * @dev Store commitment hash (Hash(KitID + PIN))
     */
    function storeCommitmentHash(uint256 batchId, bytes32 commitmentHash) external nonReentrant {
        Batch storage batch = batches[batchId];
        require(
            batch.state == BatchState.Active || batch.state == BatchState.Sequencing,
            "Cannot store commitment in current state"
        );

        uint256 index = batch.participantIndex[msg.sender];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(participant.balancePaid, "Balance payment required first");
        require(participant.commitmentHash == bytes32(0), "Commitment already stored");
        require(commitmentHash != bytes32(0), "Commitment hash cannot be zero");

        participant.commitmentHash = commitmentHash;
        emit CommitmentHashStored(batchId, msg.sender, commitmentHash);
    }

    /**
     * @dev Admin function to transition batch state
     * When transitioning from Staged to Active, balancePrice must be provided
     */
    function transitionBatchState(uint256 batchId, BatchState newState, uint256 balancePrice) external onlyOwner {
        // Require balance price when transitioning Staged -> Active
        if (batches[batchId].state == BatchState.Staged && newState == BatchState.Active) {
            require(balancePrice > 0, "Balance price must be set when activating batch");
            batchBalancePrice[batchId] = balancePrice;
            emit BalancePriceSet(batchId, balancePrice);
        }

        _transitionBatchState(batchId, newState);
    }

    /**
     * @dev Check if all active participants have paid their balance (O(1))
     */
    function _allParticipantsPaid(uint256 batchId) internal view returns (bool) {
        Batch storage batch = batches[batchId];
        return batch.unpaidActiveParticipants == 0;
    }

    /**
     * @dev Internal function to handle state transitions
     */
    function _transitionBatchState(uint256 batchId, BatchState newState) internal {
        Batch storage batch = batches[batchId];
        require(uint8(newState) > uint8(batch.state), "Can only progress forward");

        // Enforce payment requirement before Sequencing
        if (newState == BatchState.Sequencing) {
            require(_allParticipantsPaid(batchId), "All active participants must pay balance before sequencing");
        }

        BatchState oldState = batch.state;
        batch.state = newState;
        batch.stateChangedAt = block.timestamp;

        // Set payment deadlines when transitioning to Active (skip removed participants)
        if (newState == BatchState.Active) {
            // Initialize unpaid counter to active participants when batch becomes Active
            batch.unpaidActiveParticipants = batch.activeParticipantCount;

            for (uint256 i = 1; i <= batch.participantCount; i++) {
                // Skip removed participants (wallet == address(0))
                if (batch.participants[i].wallet != address(0)) {
                    batch.participants[i].paymentDeadline = block.timestamp + PAYMENT_WINDOW;
                }
            }
        }

        emit BatchStateChanged(batchId, newState, block.timestamp);

        // Create new batch when current one becomes Staged
        if (oldState == BatchState.Pending && newState == BatchState.Staged) {
            _createNewBatch();
        }
    }

    /**
     * @dev Create a new pending batch
     */
    function _createNewBatch() internal {
        currentBatchId++;
        Batch storage newBatch = batches[currentBatchId];
        newBatch.batchId = currentBatchId;
        newBatch.state = BatchState.Pending;
        newBatch.maxBatchSize = defaultBatchSize;
        newBatch.createdAt = block.timestamp;
        newBatch.stateChangedAt = block.timestamp;
        emit BatchCreated(currentBatchId, defaultBatchSize, block.timestamp);
    }

    /**
     * @dev Slash users who didn't pay balance within deadline (1% penalty)
     * Penalty is deducted from deposit and added to slashedFunds
     */
    function slashUser(uint256 batchId, address user) external onlyOwner {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, "Can only slash in Active state");

        uint256 index = batch.participantIndex[user];
        require(index > 0, "Not a participant");

        Participant storage participant = batch.participants[index];
        require(!participant.balancePaid, "User already paid");
        require(block.timestamp > participant.paymentDeadline, "Payment window not expired");
        require(!participant.slashed, "Already slashed");

        // Apply 1% penalty - deduct from deposit
        uint256 penaltyAmount = (participant.depositAmount * SLASH_PERCENTAGE) / 100;

        // Deduct penalty from participant's deposit
        participant.depositAmount -= penaltyAmount;

        // Add to slashed funds (admin can withdraw later)
        slashedFunds += penaltyAmount;

        participant.slashed = true;

        emit UserSlashed(batchId, user, penaltyAmount, participant.depositAmount);
    }

    /**
     * @dev Check if user can still pay after patience timer
     */
    function canStillPay(uint256 batchId, address user) external view returns (bool) {
        Batch storage batch = batches[batchId];
        uint256 index = batch.participantIndex[user];
        if (index == 0) return false;

        Participant storage participant = batch.participants[index];

        // Check if participant has been removed
        if (participant.wallet == address(0)) return false;

        if (participant.balancePaid) return false;

        // Can pay within 6-month patience timer even if slashed
        return block.timestamp <= participant.paymentDeadline + PATIENCE_TIMER;
    }

    /**
     * @dev Update deposit price (admin only)
     */
    function setDepositPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Deposit price must be greater than 0");
        uint256 oldPrice = depositPrice;
        depositPrice = newPrice;
        emit DepositPriceChanged(oldPrice, newPrice);
    }

    /**
     * @dev Set balance price for a specific batch (admin only)
     * Can be called to update the balance price for a Staged batch before activation
     */
    function setBatchBalancePrice(uint256 batchId, uint256 balancePrice) external onlyOwner {
        require(balancePrice > 0, "Balance price must be greater than 0");
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Staged || batch.state == BatchState.Active, "Can only set price for Staged or Active batches");

        batchBalancePrice[batchId] = balancePrice;
        emit BalancePriceSet(batchId, balancePrice);
    }

    /**
     * @dev Withdraw collected USDC funds (admin only)
     * Note: This withdraws from the general contract balance
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = usdcToken.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient contract balance");
        usdcToken.safeTransfer(owner(), amount);
        emit FundsWithdrawn(owner(), amount);
    }

    /**
     * @dev Withdraw slashed funds (admin only)
     * Separate from regular withdrawFunds to track penalty collections
     */
    function withdrawSlashedFunds() external onlyOwner nonReentrant {
        uint256 amount = slashedFunds;
        require(amount > 0, "No slashed funds available");

        slashedFunds = 0;
        usdcToken.safeTransfer(owner(), amount);

        emit SlashedFundsWithdrawn(owner(), amount);
    }

    /**
     * @dev Remove participant and refund their payments in USDC (admin only)
     * Can be called at any time before batch is Completed
     */
    function removeParticipant(uint256 batchId, address user) external onlyOwner nonReentrant {
        Batch storage batch = batches[batchId];
        require(batch.state != BatchState.Completed && batch.state != BatchState.Purged, "Cannot remove from completed/purged batch");

        uint256 index = batch.participantIndex[user];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(participant.wallet != address(0), "Participant already removed");

        // Calculate refund amount (deposit + balance if paid)
        uint256 refundAmount = participant.depositAmount;
        if (participant.balancePaid) {
            refundAmount += participant.balanceAmount;
        }

        // Capture state before removal for event
        bool wasBalancePaid = participant.balancePaid;
        bool wasSlashed = participant.slashed;

        // Remove participant mapping
        batch.participantIndex[user] = 0;

        // Mark as removed and decrement active count
        participant.wallet = address(0);
        batch.activeParticipantCount--;

        // Decrement unpaid counter if participant hadn't paid yet
        if (!wasBalancePaid) {
            batch.unpaidActiveParticipants--;
        }

        // Note: We don't decrement participantCount to maintain historical indices

        emit ParticipantRemoved(batchId, user, refundAmount, wasBalancePaid, wasSlashed);

        // Refund the participant in USDC
        if (refundAmount > 0) {
            usdcToken.safeTransfer(user, refundAmount);
        }
    }


    /**
     * @dev Get batch info
     */
    function getBatchInfo(uint256 batchId)
        external
        view
        returns (
            BatchState state,
            uint256 participantCount,
            uint256 activeParticipantCount,
            uint256 unpaidActiveParticipants,
            uint256 maxBatchSize,
            uint256 createdAt,
            uint256 stateChangedAt
        )
    {
        Batch storage batch = batches[batchId];
        return (batch.state, batch.participantCount, batch.activeParticipantCount, batch.unpaidActiveParticipants, batch.maxBatchSize, batch.createdAt, batch.stateChangedAt);
    }

    /**
     * @dev Check if all active participants have paid their balance (public view)
     */
    function allParticipantsPaid(uint256 batchId) external view returns (bool) {
        return _allParticipantsPaid(batchId);
    }

    /**
     * @dev Get participant info
     */
    function getParticipantInfo(uint256 batchId, address user)
        external
        view
        returns (
            bytes32 commitmentHash,
            uint256 depositAmount,
            uint256 balanceAmount,
            bool balancePaid,
            bool slashed,
            uint256 joinedAt,
            uint256 paymentDeadline
        )
    {
        Batch storage batch = batches[batchId];
        uint256 index = batch.participantIndex[user];
        require(index > 0, "Not a participant");

        Participant storage participant = batch.participants[index];
        return (
            participant.commitmentHash,
            participant.depositAmount,
            participant.balanceAmount,
            participant.balancePaid,
            participant.slashed,
            participant.joinedAt,
            participant.paymentDeadline
        );
    }

    /**
     * @dev Check if user is in batch
     */
    function isParticipant(uint256 batchId, address user) external view returns (bool) {
        return batches[batchId].participantIndex[user] > 0;
    }

    /**
     * @dev Get participant address by index (1-indexed)
     */
    function getParticipantAddress(uint256 batchId, uint256 index) external view returns (address) {
        require(index > 0 && index <= batches[batchId].participantCount, "Invalid index");
        return batches[batchId].participants[index].wallet;
    }

    /**
     * @dev Update the default batch size for future batches
     * @param newSize The new default batch size (must be > 0)
     */
    function setDefaultBatchSize(uint256 newSize) external onlyOwner {
        require(newSize > 0, "Batch size must be greater than 0");
        uint256 oldSize = defaultBatchSize;
        defaultBatchSize = newSize;
        emit DefaultBatchSizeChanged(oldSize, newSize, block.timestamp);
    }

    /**
     * @dev Update the batch size for a specific pending batch
     * @param batchId The batch ID to update
     * @param newSize The new batch size for this batch
     */
    function setBatchSize(uint256 batchId, uint256 newSize) external onlyOwner {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Pending, "Can only modify pending batches");
        require(newSize > 0, "Batch size must be greater than 0");
        require(newSize >= batch.activeParticipantCount, "Cannot set size below active participant count");

        uint256 oldSize = batch.maxBatchSize;
        batch.maxBatchSize = newSize;
        emit BatchSizeChanged(batchId, oldSize, newSize, block.timestamp);

        // Auto-transition to Staged if batch is now full
        if (batch.activeParticipantCount == newSize) {
            _transitionBatchState(batchId, BatchState.Staged);
        }
    }

    /**
     * @dev Emergency pause - stops joinBatch and payBalance
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
