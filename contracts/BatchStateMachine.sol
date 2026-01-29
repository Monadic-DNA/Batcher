// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BatchStateMachine
 * @dev Manages DNA testing batches with state machine, deposits, and privacy commitments
 * State Flow: Pending → Staged → Active → Sequencing → Completed → Purged
 */
contract BatchStateMachine is Ownable, ReentrancyGuard {
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
        mapping(uint256 => Participant) participants; // index => participant
        mapping(address => uint256) participantIndex; // wallet => index
        uint256 createdAt;
        uint256 stateChangedAt;
    }

    // Constants
    uint256 public constant MAX_BATCH_SIZE = 24;
    uint256 public constant DEPOSIT_PERCENTAGE = 10; // 10% deposit
    uint256 public constant BALANCE_PERCENTAGE = 90; // 90% balance
    uint256 public constant PAYMENT_WINDOW = 7 days;
    uint256 public constant CLAIM_WINDOW = 60 days;
    uint256 public constant PATIENCE_TIMER = 180 days; // 6 months
    uint256 public constant SLASH_PERCENTAGE = 1; // 1% penalty

    // Pricing (can be updated by owner)
    uint256 public fullPrice = 0.1 ether; // Example: 0.1 ETH or equivalent USDC

    // State
    uint256 public currentBatchId;
    mapping(uint256 => Batch) public batches;

    // Events
    event BatchCreated(uint256 indexed batchId, uint256 timestamp);
    event UserJoined(uint256 indexed batchId, address indexed user, uint256 depositAmount);
    event BatchStateChanged(uint256 indexed batchId, BatchState newState, uint256 timestamp);
    event BalancePaymentReceived(uint256 indexed batchId, address indexed user, uint256 amount);
    event UserSlashed(uint256 indexed batchId, address indexed user, uint256 penaltyAmount);
    event CommitmentHashStored(uint256 indexed batchId, address indexed user, bytes32 commitmentHash);
    event FundsWithdrawn(address indexed admin, uint256 amount);

    constructor() Ownable(msg.sender) {
        // Initialize first batch
        currentBatchId = 1;
        Batch storage batch = batches[currentBatchId];
        batch.batchId = currentBatchId;
        batch.state = BatchState.Pending;
        batch.createdAt = block.timestamp;
        batch.stateChangedAt = block.timestamp;
        emit BatchCreated(currentBatchId, block.timestamp);
    }

    /**
     * @dev Join the current pending batch with 10% deposit
     */
    function joinBatch() external payable nonReentrant {
        Batch storage batch = batches[currentBatchId];
        require(batch.state == BatchState.Pending, "Batch not accepting participants");
        require(batch.participantCount < MAX_BATCH_SIZE, "Batch is full");
        require(batch.participantIndex[msg.sender] == 0, "Already joined this batch");

        uint256 depositAmount = (fullPrice * DEPOSIT_PERCENTAGE) / 100;
        require(msg.value >= depositAmount, "Insufficient deposit");

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

        // Refund excess payment
        if (msg.value > depositAmount) {
            payable(msg.sender).transfer(msg.value - depositAmount);
        }

        // Auto-transition to Staged if batch is full
        if (batch.participantCount == MAX_BATCH_SIZE) {
            _transitionBatchState(currentBatchId, BatchState.Staged);
        }
    }

    /**
     * @dev Pay the 90% balance (called after batch becomes Active)
     */
    function payBalance(uint256 batchId) external payable nonReentrant {
        Batch storage batch = batches[batchId];
        require(batch.state == BatchState.Active, "Batch not active");

        uint256 index = batch.participantIndex[msg.sender];
        require(index > 0, "Not a participant in this batch");

        Participant storage participant = batch.participants[index];
        require(!participant.balancePaid, "Balance already paid");
        require(block.timestamp <= participant.paymentDeadline, "Payment window expired");

        uint256 balanceAmount = (fullPrice * BALANCE_PERCENTAGE) / 100;
        require(msg.value >= balanceAmount, "Insufficient balance payment");

        participant.balanceAmount = balanceAmount;
        participant.balancePaid = true;

        emit BalancePaymentReceived(batchId, msg.sender, balanceAmount);

        // Refund excess payment
        if (msg.value > balanceAmount) {
            payable(msg.sender).transfer(msg.value - balanceAmount);
        }
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
        newBatch.createdAt = block.timestamp;
        newBatch.stateChangedAt = block.timestamp;
        emit BatchCreated(currentBatchId, block.timestamp);
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
     * @dev Withdraw collected funds (admin only)
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Insufficient contract balance");
        payable(owner()).transfer(amount);
        emit FundsWithdrawn(owner(), amount);
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
            uint256 createdAt,
            uint256 stateChangedAt
        )
    {
        Batch storage batch = batches[batchId];
        return (batch.state, batch.participantCount, batch.createdAt, batch.stateChangedAt);
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
}
