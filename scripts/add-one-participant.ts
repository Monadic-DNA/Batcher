import hre from "hardhat";

/**
 * Add one more participant to the current batch
 * Useful for testing batch completion (24/24)
 */
async function main() {
  const { ethers } = hre;

  console.log("➕ Adding one participant to current batch...\n");

  // Get contract address from environment or command line
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ Error: Please set CONTRACT_ADDRESS environment variable");
    console.log("   Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/add-one-participant.ts --network localhost");
    process.exit(1);
  }

  // Get contract instance
  const BatchStateMachine = await ethers.getContractFactory("BatchStateMachine");
  const batchContract = BatchStateMachine.attach(contractAddress);

  // Get signers (use the last available one that hasn't joined yet)
  const signers = await ethers.getSigners();
  const participant = signers[24]; // Index 24 (25th account) - should be unused

  // Get current batch info
  const currentBatchId = await batchContract.currentBatchId();
  const batchInfo = await batchContract.getBatchInfo(currentBatchId);
  const participantCount = Number(batchInfo.participantCount);

  console.log(`📊 Current Batch Status:`);
  console.log(`   Batch ID: ${currentBatchId}`);
  console.log(`   Participants: ${participantCount} / 24\n`);

  if (participantCount >= 24) {
    console.log("✅ Batch is already full (24/24)!");
    process.exit(0);
  }

  if (participantCount < 23) {
    console.log("⚠️  Warning: Current batch has fewer than 23 participants.");
    console.log("   Run populate-batch.ts first to add 23 participants.\n");
  }

  // Check if this participant already joined
  const isParticipant = await batchContract.isParticipant(currentBatchId, participant.address);
  if (isParticipant) {
    console.log("❌ Error: This account has already joined the batch.");
    console.log("   All test accounts may already be used. Deploy a new contract to reset.");
    process.exit(1);
  }

  // Get pricing
  const fullPrice = await batchContract.fullPrice();
  const depositAmount = fullPrice * 10n / 100n;

  console.log(`💰 Joining batch with:`);
  console.log(`   Participant: ${participant.address}`);
  console.log(`   Deposit: ${ethers.formatEther(depositAmount)} ETH\n`);

  // Join the batch
  const participantContract = batchContract.connect(participant);
  const tx = await participantContract.joinBatch({ value: depositAmount });
  await tx.wait();

  // Get updated batch info
  const updatedBatchInfo = await batchContract.getBatchInfo(currentBatchId);
  const updatedCount = Number(updatedBatchInfo.participantCount);
  const updatedState = Number(updatedBatchInfo.state);

  const stateNames = ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"];

  console.log(`✅ Successfully joined batch!\n`);
  console.log(`📊 Updated Batch Status:`);
  console.log(`   Batch ID: ${currentBatchId}`);
  console.log(`   Participants: ${updatedCount} / 24`);
  console.log(`   State: ${stateNames[updatedState]}`);

  if (updatedCount === 24) {
    console.log(`\n🎉 Batch is now FULL! It has automatically transitioned to "Staged" state.`);
    console.log(`   The batch is ready to be activated by an admin.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
