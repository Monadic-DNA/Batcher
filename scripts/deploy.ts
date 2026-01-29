import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  console.log("🚀 Deploying BatchStateMachine contract...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy contract
  const BatchStateMachine = await ethers.getContractFactory("BatchStateMachine");
  const batchContract = await BatchStateMachine.deploy();
  await batchContract.waitForDeployment();

  const contractAddress = await batchContract.getAddress();
  console.log("✅ BatchStateMachine deployed to:", contractAddress);

  // Get initial state
  const currentBatchId = await batchContract.currentBatchId();
  const fullPrice = await batchContract.fullPrice();

  console.log("\n📊 Initial Contract State:");
  console.log("   Current Batch ID:", currentBatchId.toString());
  console.log("   Full Price:", ethers.formatEther(fullPrice), "ETH");
  console.log("   Deposit (10%):", ethers.formatEther(fullPrice / 10n), "ETH");
  console.log("   Balance (90%):", ethers.formatEther(fullPrice * 9n / 10n), "ETH");

  console.log("\n📋 Next Steps:");
  console.log("   1. Update .env.local:");
  console.log(`      NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("      NEXT_PUBLIC_RPC_URL=http://localhost:8545");
  console.log("\n   2. Run populate script:");
  console.log("      npx hardhat run scripts/populate-batch.ts --network localhost");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
