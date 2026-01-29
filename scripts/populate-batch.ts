import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  console.log("👥 Populating batch with 23 participants...\n");

  // Get contract address from environment or use default
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ Error: Please set CONTRACT_ADDRESS environment variable");
    console.log("   Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/populate-batch.ts --network localhost");
    process.exit(1);
  }

  // Connect to contract
  const BatchStateMachine = await ethers.getContractFactory("BatchStateMachine");
  const batchContract = BatchStateMachine.attach(contractAddress);

  // Get current batch info
  const currentBatchId = await batchContract.currentBatchId();
  const fullPrice = await batchContract.fullPrice();
  const depositAmount = fullPrice / 10n; // 10% deposit

  console.log("📊 Contract Info:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Current Batch ID:", currentBatchId.toString());
  console.log("   Deposit Amount:", ethers.formatEther(depositAmount), "ETH\n");

  // Get signers (Hardhat provides 20 by default, we need 23)
  const signers = await ethers.getSigners();

  if (signers.length < 24) {
    console.error("❌ Error: Need at least 24 accounts. Current:", signers.length);
    console.log("   Update hardhat.config.ts to provide more accounts in networks.hardhat.accounts.count");
    process.exit(1);
  }

  // Skip account 0 (deployer/owner), use accounts 1-23 (23 participants)
  const participants = signers.slice(1, 24);

  console.log("🔄 Joining batch with 23 participants...\n");

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const participantContract = batchContract.connect(participant);

    try {
      const tx = await participantContract.joinBatch({ value: depositAmount });
      await tx.wait();

      console.log(`✅ Participant ${i + 1}/23 joined: ${participant.address.substring(0, 8)}...`);
    } catch (error: any) {
      console.error(`❌ Failed to join with participant ${i + 1}:`, error.message);
      process.exit(1);
    }
  }

  // Get updated batch info
  const batchInfo = await batchContract.getBatchInfo(currentBatchId);

  console.log("\n📊 Batch Status:");
  console.log("   Batch ID:", currentBatchId.toString());
  console.log("   Participants:", batchInfo.participantCount.toString(), "/ 24");
  console.log("   State:", ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"][Number(batchInfo.state)]);

  console.log("\n✨ Success! Batch is ready for one more participant to join.");
  console.log("   The UI should show 23/24 participants.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
