import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  console.log("💰 Completing batch payments...\n");

  // Get contract address from environment
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ Error: Please set CONTRACT_ADDRESS environment variable");
    console.log("   Example: CONTRACT_ADDRESS=0x... npx hardhat run scripts/complete-batch-payments.ts --network localhost");
    process.exit(1);
  }

  // Connect to contract
  const BatchStateMachine = await ethers.getContractFactory("BatchStateMachine");
  const batchContract = BatchStateMachine.attach(contractAddress);

  // Get current and previous batch
  const currentBatchId = await batchContract.currentBatchId();
  const targetBatchId = currentBatchId - 1n;

  if (targetBatchId < 1n) {
    console.error("❌ Error: No completed batches yet. Current batch is:", currentBatchId.toString());
    process.exit(1);
  }

  console.log("📊 Contract Info:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Current Batch ID:", currentBatchId.toString());
  console.log("   Target Batch ID:", targetBatchId.toString(), "\n");

  // Get batch info
  const batchInfo = await batchContract.getBatchInfo(targetBatchId);
  console.log("📋 Batch Status:");
  console.log("   State:", ["Pending", "Staged", "Active", "Sequencing", "Completed", "Purged"][Number(batchInfo.state)]);
  console.log("   Participants:", batchInfo.participantCount.toString());

  // Get owner signer
  const [owner] = await ethers.getSigners();
  const ownerContract = batchContract.connect(owner);

  // If batch is Staged, activate it first
  if (batchInfo.state === 1n) {
    console.log("\n🔄 Activating batch...");
    const activateTx = await ownerContract.transitionBatchState(targetBatchId, 2); // Active
    await activateTx.wait();
    console.log("✅ Batch activated");
  } else if (batchInfo.state !== 2n) {
    console.error("❌ Error: Batch must be in Staged or Active state. Current state:", batchInfo.state.toString());
    process.exit(1);
  }

  // Get all signers (participants are accounts 1-24)
  const signers = await ethers.getSigners();
  const participantCount = Number(batchInfo.participantCount);
  const participants = signers.slice(1, participantCount + 1);

  // Get balance amount (90%)
  const fullPrice = await batchContract.fullPrice();
  const balanceAmount = fullPrice * 9n / 10n;

  console.log("\n💳 Processing balance payments...");
  console.log("   Balance Amount:", ethers.formatEther(balanceAmount), "ETH per participant\n");

  let successCount = 0;
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const participantContract = batchContract.connect(participant);

    try {
      // Check if already paid
      const participantInfo = await batchContract.getParticipantInfo(targetBatchId, participant.address);

      if (participantInfo.balancePaid) {
        console.log(`⏭️  Participant ${i + 1}/${participantCount} already paid: ${participant.address.substring(0, 8)}...`);
        successCount++;
        continue;
      }

      const tx = await participantContract.payBalance(targetBatchId, { value: balanceAmount });
      await tx.wait();

      console.log(`✅ Participant ${i + 1}/${participantCount} paid balance: ${participant.address.substring(0, 8)}...`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed payment for participant ${i + 1}:`, error.message);
    }
  }

  console.log("\n📊 Payment Summary:");
  console.log("   Successful Payments:", successCount, "/", participantCount);
  console.log("   Failed Payments:", participantCount - successCount);

  if (successCount === participantCount) {
    console.log("\n✨ Success! All participants have paid their balance.");
    console.log("   Next steps:");
    console.log("   1. Transition to Sequencing: npx hardhat console --network localhost");
    console.log("      > const contract = await ethers.getContractAt('BatchStateMachine', 'CONTRACT_ADDRESS')");
    console.log(`      > await contract.transitionBatchState(${targetBatchId}, 3)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
