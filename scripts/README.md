# Batcher Testing Scripts

Scripts to help test the BatchStateMachine contract locally.

## Prerequisites

1. **Start Hardhat Node** (Terminal 1):
   ```bash
   npx hardhat node
   ```

2. **Keep this terminal running** - it provides the local blockchain with 30 pre-funded accounts.

## Scripts

### 1. Deploy Contract

Deploys a fresh BatchStateMachine contract to the local network.

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**Output:**
- Contract address
- Initial batch ID
- Pricing information

**Next Step:** Copy the contract address and update your `.env.local`:
```
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://localhost:8545
```

### 2. Populate Batch (23/24)

Adds 23 participants to the current batch, leaving room for one more.

```bash
CONTRACT_ADDRESS=0x5FbDB... npx hardhat run scripts/populate-batch.ts --network localhost
```

**What it does:**
- Uses test accounts 1-23 (account 0 is the owner)
- Each participant pays 10% deposit
- Leaves batch at 23/24 participants (Pending state)

**Result:** Your UI should show a batch with 23/24 participants ready to join.

### 3. Complete Batch Payments

Completes all balance payments (90%) for the most recent completed batch.

```bash
CONTRACT_ADDRESS=0x5FbDB... npx hardhat run scripts/complete-batch-payments.ts --network localhost
```

**What it does:**
- Finds the previous batch (currentBatchId - 1)
- Activates it if needed (Staged → Active)
- All 24 participants pay their 90% balance
- Batch is ready to transition to Sequencing

**Prerequisites:**
- Batch must be Staged (24/24 participants) or Active
- Run after a batch has been filled

## Full Testing Workflow

### Scenario 1: Test User Joining

```bash
# 1. Deploy
npx hardhat run scripts/deploy.ts --network localhost

# 2. Populate to 23/24
CONTRACT_ADDRESS=0x... npx hardhat run scripts/populate-batch.ts --network localhost

# 3. Update .env.local with contract address

# 4. Start UI
npm run dev

# 5. Connect wallet and join as 24th participant!
```

### Scenario 2: Test Full Batch Lifecycle

```bash
# 1. Deploy
npx hardhat run scripts/deploy.ts --network localhost

# 2. Fill first batch completely (24/24)
CONTRACT_ADDRESS=0x... npx hardhat run scripts/populate-batch.ts --network localhost

# 3. Join with one more account to trigger Staged state
# (Use Hardhat console or UI)

# 4. Activate and complete payments
CONTRACT_ADDRESS=0x... npx hardhat run scripts/complete-batch-payments.ts --network localhost

# 5. Now you have a completed batch with all payments done
```

## Using Hardhat Console

For manual testing and state transitions:

```bash
npx hardhat console --network localhost
```

Then:

```javascript
// Get contract
const BatchStateMachine = await ethers.getContractFactory("BatchStateMachine");
const contract = BatchStateMachine.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Check current batch
const batchId = await contract.currentBatchId();
console.log("Current Batch:", batchId.toString());

// Get batch info
const info = await contract.getBatchInfo(1);
console.log("State:", info.state.toString());
console.log("Participants:", info.participantCount.toString());

// Transition batch state (owner only)
await contract.transitionBatchState(1, 2); // 2 = Active
await contract.transitionBatchState(1, 3); // 3 = Sequencing
await contract.transitionBatchState(1, 4); // 4 = Completed
```

## Batch States

- `0` = Pending (collecting participants)
- `1` = Staged (24/24, awaiting activation)
- `2` = Active (kits being sent, balance payments due)
- `3` = Sequencing (lab processing)
- `4` = Completed (results available)
- `5` = Purged (data deleted)

## Troubleshooting

### "Error: could not detect network"
Make sure Hardhat node is running in another terminal.

### "Transaction reverted"
Check:
- Batch state is correct
- Sender has enough ETH
- Payment amount matches requirement

### "Already joined this batch"
Each address can only join once per batch. Use a different account.

## Account Setup

Hardhat provides 30 accounts by default:
- Account 0: Owner/Deployer
- Accounts 1-24: Test participants
- Accounts 25-29: Extra for testing

You can connect to any of these in your UI using Dynamic wallet or MetaMask (import private keys from Hardhat node output).
