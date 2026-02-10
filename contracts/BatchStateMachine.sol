// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
        uint256 depositAmount;  // 10% initial deposit
        uint256 balanceAmount;  // 90% balance payment
        bool balancePaid;
        bool slashed;
        uint256 joinedAt;
        uint256 paymentDeadline; // 7 days after batch becomes Active
    }

    // Batch data
    struct Batch {
        uint256 batchId;
        BatchState state;
        uint256 participantCount;
        uint256 maxBatchSize; // Size for this specific batch
        mapping(uint256 => Participant) participants; // index => participant
        mapping(address => uint256) participantIndex; // wallet => index
        uint256 createdAt;
        uint256 stateChangedAt;
    }

    // USDC token
    IERC20 public immutable usdcToken;

    // Constants
    uint256 public constant PAYMENT_WINDOW = 7 days;
    uint256 public constant CLAIM_WINDOW = 60 days;
    uint256 public constant PATIENCE_TIMER = 180 days; // 6 months
    uint256 public constant SLASH_PERCENTAGE = 1; // 1% penalty

    // Configurable parameters (can be updated by owner)
    uint256 public depositPercentage = 10; // 10% deposit (default)
    uint256 public balancePercentage = 90; // 90% balance (default)
    uint256 public fullPrice = 100_000000; // 100 USDC (6 decimals)

    // Batch size configuration
    uint256 public defaultBatchSize = 24; // Default size for new batches

    // State
    uint256 public currentBatchId;
    mapping(uint256 => Batch) public batches;

    // Events
    event BatchCreated(uint256 indexed batchId, uint256 maxBatchSize, uint256 timestamp);
    event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount);
    event BatchStateChanged(uint256 indexed batchId, BatchState newState, uint256 timestamp);
    event BalancePaymentReceived(uint256 indexed batchId, address indexed user, uint256 amount);
    event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount);
    event CommitmentHashStored(uint256 indexed batchId, address indexed user, bytes32 commitmentHash);
    event FundsWithdrawn(address indexed admin, uint256 amount);
    event DefaultBatchSizeChanged(uint256 oldSize, uint256 newSize, uint256 timestamp);
    event BatchSizeChanged(uint256 indexed batchId, uint256 oldSize, uint256 newSize, uint256 timestamp);
    event ParticipantRemoved(uint256 indexed batchId, address indexed user, uint256 refundAmount);
    event DepositPercentageChanged(uint256 oldPercentage, uint256 newPercentage);
    event BalancePercentageChanged(uint256 oldPercentage, uint256 newPercentage);

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
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
        require(batch.participantCount < batch.maxBatchSize, "Batch is full");
        require(batch.participantIndex[msg.sender] == 0, "Already joined this batch");

        uint256 depositAmount = (fullPrice * depositPercentage) / 100;

        // Transfer USDC from user to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), depositAmount);

        // Add participant
        uint256 index = batch.participantCount + 1; // 1-indexed to distinguish from default 0
        batch.participants[index] = Participant({
            wallet: msg.sender,
            commitmentHash: bytes32(0),
            depositAmount: depositAmount,
            balanceAmount: 0,
            balancePaid: false,
            slashed: false,
            joinedAt: block.timestamp,
            paymentDeadline: 0
        });
        batch.participantIndex[msg.sender] = index;
        batch.participantCount++;

        emit UserJoined(currentBatchId, msg.sender, depositAmount);

        // Auto-transition to Staged if batch is full (optional)
        // Batch can also be manually progressed by admin with fewer participants
        if (batch.participantCount == batch.maxBatchSize) {
            _transitionBatchState(currentBatchId, BatchState.Staged);
        }
    }

    /**
     * @dev Pay the balance payment (called after batch becomes Active, uses USDC)
     */
    function payBalance(uint256 batchId) external nonReentrant whenNotPaused {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, "Batch not active");

        uint256 index = batch.participantIndex[msg.sender];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(!participant.balancePaid, "Balance already paid");
        require(block.timestamp <= participant.paymentDeadline, "Payment window expired");

        uint256 balanceAmount = (fullPrice * balancePercentage) / 100;

        // Transfer USDC from user to contract
        usdcToken.safeTransferFrom(msg.sender, address(this), balanceAmount);

        participant.balanceAmount = balanceAmount;
        participant.balancePaid = true;

        emit BalancePaymentReceived(batchId, msg.sender, balanceAmount);
    }

    /**
     * @dev Store commitment hash (Hash(KitID + PIN))
     */
    function storeCommitmentHash(uint256 batchId, bytes32 commitmentHash) external {
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

        participant.commitmentHash = commitmentHash;
        emit CommitmentHashStored(batchId, msg.sender, commitmentHash);
    }

    /**
     * @dev Admin function to transition batch state
     */
    function transitionBatchState(uint256 batchId, BatchState newState) external onlyOwner {
        _transitionBatchState(batchId, newState);
    }

    /**
     * @dev Internal function to handle state transitions
     */
    function _transitionBatchState(uint256 batchId, BatchState newState) internal {
        Batch storage batch = batches[batchId];
        require(uint8(newState) > uint8(batch.state), "Can only progress forward");

        BatchState oldState = batch.state;
        batch.state = newState;
        batch.stateChangedAt = block.timestamp;

        // Set payment deadlines when transitioning to Active
        if (newState == BatchState.Active) {
            for (uint256 i = 1; i <= batch.participantCount; i++) {
                batch.participants[i].paymentDeadline = block.timestamp + PAYMENT_WINDOW;
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

        // Apply 1% penalty
        uint256 penaltyAmount = (participant.depositAmount * SLASH_PERCENTAGE) / 100;
        participant.slashed = true;

        emit UserSlashed(batchId, user, penaltyAmount);
    }

    /**
     * @dev Check if user can still pay after patience timer
     */
    function canStillPay(uint256 batchId, address user) external view returns (bool) {
        Batch storage batch = batches[batchId];
        uint256 index = batch.participantIndex[user];
        if (index == 0) return false;

        Participant storage participant = batch.participants[index];
        if (participant.balancePaid) return false;

        // Can pay within 6-month patience timer even if slashed
        return block.timestamp <= participant.paymentDeadline + PATIENCE_TIMER;
    }

    /**
     * @dev Update full price (admin only)
     */
    function updateFullPrice(uint256 newPrice) external onlyOwner {
        fullPrice = newPrice;
    }

    /**
     * @dev Withdraw collected USDC funds (admin only)
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = usdcToken.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient contract balance");
        usdcToken.safeTransfer(owner(), amount);
        emit FundsWithdrawn(owner(), amount);
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

        // Calculate refund amount (deposit + balance if paid)
        uint256 refundAmount = participant.depositAmount;
        if (participant.balancePaid) {
            refundAmount += participant.balanceAmount;
        }

        // Remove participant mapping
        batch.participantIndex[user] = 0;

        // Note: We don't decrement participantCount or reorganize the array
        // to maintain historical indices. The slot is marked as removed by
        // setting the wallet address to zero.
        participant.wallet = address(0);

        emit ParticipantRemoved(batchId, user, refundAmount);

        // Refund the participant in USDC
        if (refundAmount > 0) {
            usdcToken.safeTransfer(user, refundAmount);
        }
    }

    /**
     * @dev Update deposit percentage (admin only)
     */
    function setDepositPercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage > 0 && newPercentage < 100, "Invalid percentage");
        require(newPercentage + balancePercentage == 100, "Percentages must sum to 100");
        uint256 oldPercentage = depositPercentage;
        depositPercentage = newPercentage;
        emit DepositPercentageChanged(oldPercentage, newPercentage);
    }

    /**
     * @dev Update balance percentage (admin only)
     */
    function setBalancePercentage(uint256 newPercentage) external onlyOwner {
        require(newPercentage > 0 && newPercentage < 100, "Invalid percentage");
        require(depositPercentage + newPercentage == 100, "Percentages must sum to 100");
        uint256 oldPercentage = balancePercentage;
        balancePercentage = newPercentage;
        emit BalancePercentageChanged(oldPercentage, newPercentage);
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
            uint256 maxBatchSize,
            uint256 createdAt,
            uint256 stateChangedAt
        )
    {
        Batch storage batch = batches[batchId];
        return (batch.state, batch.participantCount, batch.maxBatchSize, batch.createdAt, batch.stateChangedAt);
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
        require(newSize >= batch.participantCount, "Cannot set size below current participant count");

        uint256 oldSize = batch.maxBatchSize;
        batch.maxBatchSize = newSize;
        emit BatchSizeChanged(batchId, oldSize, newSize, block.timestamp);

        // Auto-transition to Staged if batch is now full
        if (batch.participantCount == newSize) {
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
