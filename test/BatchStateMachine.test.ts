import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import type { BatchStateMachine, MockUSDC } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BatchStateMachine", function () {
  let batchContract: BatchStateMachine;
  let usdcToken: MockUSDC;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let users: HardhatEthersSigner[];

  // USDC has 6 decimals
  const USDC_DECIMALS = 6;
  const DEPOSIT_AMOUNT = BigInt(25 * 10 ** USDC_DECIMALS); // 25 USDC
  const BALANCE_AMOUNT = BigInt(75 * 10 ** USDC_DECIMALS); // 75 USDC

  async function approveAndJoin(user: HardhatEthersSigner) {
    await usdcToken.connect(user).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);
    return batchContract.connect(user).joinBatch();
  }

  async function approveAndPayBalance(user: HardhatEthersSigner, batchId: number) {
    await usdcToken.connect(user).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
    return batchContract.connect(user).payBalance(batchId);
  }

  beforeEach(async function () {
    [owner, user1, user2, user3, ...users] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdcToken = await MockUSDC.deploy();
    await usdcToken.waitForDeployment();

    // Deploy BatchStateMachine with USDC token address
    const BatchStateMachine = await ethers.getContractFactory(
      "BatchStateMachine"
    );
    batchContract = await BatchStateMachine.deploy(await usdcToken.getAddress());
    await batchContract.waitForDeployment();

    // Mint USDC to test accounts
    const mintAmount = BigInt(1000 * 10 ** USDC_DECIMALS); // 1000 USDC each
    await usdcToken.mint(user1.address, mintAmount);
    await usdcToken.mint(user2.address, mintAmount);
    await usdcToken.mint(user3.address, mintAmount);
    for (const user of users.slice(0, 24)) {
      await usdcToken.mint(user.address, mintAmount);
    }
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await batchContract.owner()).to.equal(owner.address);
    });

    it("Should initialize with batch ID 1", async function () {
      expect(await batchContract.currentBatchId()).to.equal(1);
    });

    it("Should create first batch in Pending state", async function () {
      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(0); // Pending
      expect(batchInfo.participantCount).to.equal(0);
    });
  });

  describe("Joining Batch", function () {
    it("Should allow user to join with correct USDC deposit", async function () {
      await usdcToken.connect(user1).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);

      await expect(approveAndJoin(user1))
        .to.emit(batchContract, "UserJoined")
        .withArgs(1, user1.address, DEPOSIT_AMOUNT);

      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.participantCount).to.equal(1);
      expect(await batchContract.isParticipant(1, user1.address)).to.be.true;
    });

    it("Should reject join without USDC approval", async function () {
      await expect(
        batchContract.connect(user1).joinBatch()
      ).to.be.reverted; // ERC20 insufficient allowance
    });

    it("Should transfer correct USDC amount from user", async function () {
      const balanceBefore = await usdcToken.balanceOf(user1.address);
      await approveAndJoin(user1);
      const balanceAfter = await usdcToken.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should prevent duplicate joins", async function () {
      await approveAndJoin(user1);
      await usdcToken.connect(user1).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);
      await expect(
        batchContract.connect(user1).joinBatch()
      ).to.be.revertedWith("Already joined this batch");
    });

    it("Should transition to Staged when batch is full (24 users)", async function () {
      // Get all available signers
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25); // Skip owner, get next 24

      // Join 23 users
      for (let i = 0; i < 23; i++) {
        await approveAndJoin(allUsers[i]);
      }

      let batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(0); // Still Pending

      // 24th user joins - batch should transition to Staged
      await approveAndJoin(allUsers[23]);

      batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(1); // Staged
      expect(batchInfo.participantCount).to.equal(24);
    });

    it("Should create new batch when current becomes Staged", async function () {
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);

      // Fill batch 1
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }

      expect(await batchContract.currentBatchId()).to.equal(2);

      const newBatchInfo = await batchContract.getBatchInfo(2);
      expect(newBatchInfo.state).to.equal(0); // Pending
      expect(newBatchInfo.participantCount).to.equal(0);
    });
  });

  describe("State Transitions", function () {
    beforeEach(async function () {
      // Fill a batch
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }
    });

    it("Should allow owner to transition batch to Active with balance price", async function () {
      const tx = await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT);
      // Event includes timestamp so we just verify it was emitted
      await expect(tx).to.emit(batchContract, "BatchStateChanged");

      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(2); // Active

      const balancePrice = await batchContract.batchBalancePrice(1);
      expect(balancePrice).to.equal(BALANCE_AMOUNT);
    });

    it("Should set payment deadlines when transitioning to Active", async function () {
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT);

      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      const currentTime = await time.latest();

      // Payment deadline should be set and in the future
      expect(participantInfo.paymentDeadline).to.be.gt(currentTime);

      // Deadline should be set (could be 7 or 14 days depending on implementation)
      // Just verify it's reasonable (between 1 day and 30 days)
      const timeDiff = Number(participantInfo.paymentDeadline) - currentTime;
      expect(timeDiff).to.be.gte(86400); // At least 1 day
      expect(timeDiff).to.be.lte(30 * 86400); // At most 30 days
    });

    it("Should not allow non-owner to transition state", async function () {
      await expect(
        batchContract.connect(user1).transitionBatchState(1, 2, BALANCE_AMOUNT)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });

    it("Should progress through all states", async function () {
      // First transition to Active
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT);

      // All participants must pay balance before moving to Sequencing
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndPayBalance(allUsers[i], 1);
      }

      // Now can transition through remaining states
      await batchContract.transitionBatchState(1, 3, 0); // Sequencing
      await batchContract.transitionBatchState(1, 4, 0); // Completed
      await batchContract.transitionBatchState(1, 5, 0); // Purged

      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(5); // Purged
    });
  });

  describe("Balance Payment", function () {
    beforeEach(async function () {
      // Fill and activate batch
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT); // Active
    });

    it("Should allow user to pay balance in Active state with USDC", async function () {
      await expect(approveAndPayBalance(user1, 1))
        .to.emit(batchContract, "BalancePaymentReceived")
        .withArgs(1, user1.address, BALANCE_AMOUNT);

      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      expect(participantInfo.balancePaid).to.be.true;
      expect(participantInfo.balanceAmount).to.equal(BALANCE_AMOUNT);
    });

    it("Should reject balance payment if not Active", async function () {
      // All participants must pay before transitioning to Sequencing
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndPayBalance(allUsers[i], 1);
      }

      await batchContract.transitionBatchState(1, 3, 0); // Sequencing

      // Try to pay balance when not in Active state
      await usdcToken.connect(user1).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
      await expect(
        batchContract.connect(user1).payBalance(1)
      ).to.be.revertedWith("Batch not active");
    });

    it("Should reject balance payment without USDC approval", async function () {
      await expect(
        batchContract.connect(user1).payBalance(1)
      ).to.be.reverted; // ERC20 insufficient allowance
    });

    it("Should reject balance payment after patience window", async function () {
      // Fast forward 7 months (beyond patience window)
      await time.increase(210 * 24 * 60 * 60);

      await usdcToken.connect(user1).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
      await expect(
        batchContract.connect(user1).payBalance(1)
      ).to.be.revertedWith("Payment window and patience timer expired");
    });

    it("Should prevent duplicate balance payments", async function () {
      await approveAndPayBalance(user1, 1);

      await usdcToken.connect(user1).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
      await expect(
        batchContract.connect(user1).payBalance(1)
      ).to.be.revertedWith("Balance already paid");
    });
  });

  describe("Commitment Hash Storage", function () {
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("KitID123:PIN456"));

    beforeEach(async function () {
      // Fill, activate, and pay balance
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT); // Active
      await approveAndPayBalance(user1, 1);
    });

    it("Should store commitment hash after balance payment", async function () {
      await expect(batchContract.connect(user1).storeCommitmentHash(1, testHash))
        .to.emit(batchContract, "CommitmentHashStored")
        .withArgs(1, user1.address, testHash);

      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      expect(participantInfo.commitmentHash).to.equal(testHash);
    });

    it("Should require balance payment before storing commitment", async function () {
      await expect(
        batchContract.connect(user2).storeCommitmentHash(1, testHash)
      ).to.be.revertedWith("Balance payment required first");
    });

    it("Should allow updating commitment hash", async function () {
      await batchContract.connect(user1).storeCommitmentHash(1, testHash);

      const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
      expect(participantInfo.commitmentHash).to.equal(testHash);

      // Can update commitment hash (e.g., kit swap, forgotten PIN)
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("NewKitID:NewPIN"));
      await expect(
        batchContract.connect(user1).storeCommitmentHash(1, newHash)
      ).to.emit(batchContract, "CommitmentHashStored")
        .withArgs(1, user1.address, newHash);

      const updatedInfo = await batchContract.getParticipantInfo(1, user1.address);
      expect(updatedInfo.commitmentHash).to.equal(newHash);
    });

    it("Should allow storing commitment in Sequencing state", async function () {
      // User1 already has a commitment from beforeEach
      // Pay for another user and transition to test commitment in Sequencing
      await approveAndPayBalance(user2, 1);

      // All participants must pay before transitioning to Sequencing
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        if (allUsers[i].address !== user1.address && allUsers[i].address !== user2.address) {
          await approveAndPayBalance(allUsers[i], 1);
        }
      }

      await batchContract.transitionBatchState(1, 3, 0); // Sequencing

      // User2 paid but hasn't stored commitment yet
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("User2Kit:PIN"));
      await expect(
        batchContract.connect(user2).storeCommitmentHash(1, newHash)
      ).to.emit(batchContract, "CommitmentHashStored");
    });
  });

  describe("Slashing", function () {
    beforeEach(async function () {
      // Fill and activate batch
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT); // Active
    });

    it("Should slash user after payment deadline expires", async function () {
      // Get participant info to check the deadline
      const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
      const deadline = participantInfo.paymentDeadline;

      // Fast forward past the deadline
      await time.increaseTo(deadline + 86400n); // 1 day after deadline

      const penaltyAmount = (DEPOSIT_AMOUNT * 50n) / 100n; // 50% penalty
      const remainingDeposit = DEPOSIT_AMOUNT - penaltyAmount;

      await expect(batchContract.slashUser(1, user1.address))
        .to.emit(batchContract, "UserSlashed")
        .withArgs(1, user1.address, penaltyAmount, remainingDeposit);

      const updatedInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      expect(updatedInfo.slashed).to.be.true;
    });

    it("Should not slash user before deadline", async function () {
      await expect(
        batchContract.slashUser(1, user1.address)
      ).to.be.revertedWith("Payment window not expired");
    });

    it("Should not slash user who already paid", async function () {
      await approveAndPayBalance(user1, 1);
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        batchContract.slashUser(1, user1.address)
      ).to.be.revertedWith("User already paid");
    });

    it("Should not slash user twice", async function () {
      // Get participant info to check the deadline
      const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
      const deadline = participantInfo.paymentDeadline;

      // Fast forward past the deadline
      await time.increaseTo(deadline + 86400n);

      await batchContract.slashUser(1, user1.address);

      await expect(
        batchContract.slashUser(1, user1.address)
      ).to.be.revertedWith("Already slashed");
    });
  });

  describe("Patience Timer", function () {
    beforeEach(async function () {
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await approveAndJoin(allUsers[i]);
      }
      await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT); // Active
    });

    it("Should allow payment within patience window after slashing", async function () {
      // Get participant info to check the deadline
      const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
      const deadline = participantInfo.paymentDeadline;

      // Fast forward 10 days after deadline (within 14-day patience window but past payment deadline)
      await time.increaseTo(deadline + BigInt(10 * 24 * 60 * 60));

      // User should be slashed but can still pay (within patience window)
      await batchContract.slashUser(1, user1.address);

      expect(await batchContract.canStillPay(1, user1.address)).to.be.true;
    });

    it("Should not allow payment after patience window", async function () {
      // Fast forward 7 months (beyond patience window)
      await time.increase(210 * 24 * 60 * 60);

      expect(await batchContract.canStillPay(1, user1.address)).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to withdraw USDC funds", async function () {
      // Fill batch to add USDC to contract
      await approveAndJoin(user1);
      await approveAndJoin(user2);

      const contractUsdcBalance = await usdcToken.balanceOf(await batchContract.getAddress());
      const ownerBalanceBefore = await usdcToken.balanceOf(owner.address);

      await expect(batchContract.withdrawFunds(contractUsdcBalance))
        .to.emit(batchContract, "FundsWithdrawn")
        .withArgs(owner.address, contractUsdcBalance);

      const ownerBalanceAfter = await usdcToken.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + contractUsdcBalance);
    });

    it("Should not allow non-owner to withdraw funds", async function () {
      await approveAndJoin(user1);

      await expect(
        batchContract.connect(user1).withdrawFunds(DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await approveAndJoin(user1);
    });

    it("Should return correct batch info", async function () {
      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(0); // Pending
      expect(batchInfo.participantCount).to.equal(1);
      expect(batchInfo.createdAt).to.be.gt(0);
      expect(batchInfo.stateChangedAt).to.be.gt(0);
    });

    it("Should return correct participant info", async function () {
      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      expect(participantInfo.depositAmount).to.equal(DEPOSIT_AMOUNT);
      expect(participantInfo.balancePaid).to.be.false;
      expect(participantInfo.slashed).to.be.false;
      expect(participantInfo.joinedAt).to.be.gt(0);
    });

    it("Should correctly identify participants", async function () {
      expect(await batchContract.isParticipant(1, user1.address)).to.be.true;
      expect(await batchContract.isParticipant(1, user2.address)).to.be.false;
    });
  });

  describe("Deposit Price Management", function () {
    it("Should return default deposit price", async function () {
      const depositPrice = await batchContract.depositPrice();
      expect(depositPrice).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should allow owner to update deposit price", async function () {
      const newDepositPrice = BigInt(50 * 10 ** USDC_DECIMALS); // 50 USDC

      await expect(batchContract.setDepositPrice(newDepositPrice))
        .to.emit(batchContract, "DepositPriceChanged")
        .withArgs(DEPOSIT_AMOUNT, newDepositPrice);

      expect(await batchContract.depositPrice()).to.equal(newDepositPrice);
    });

    it("Should not allow non-owner to update deposit price", async function () {
      const newDepositPrice = BigInt(50 * 10 ** USDC_DECIMALS);

      await expect(
        batchContract.connect(user1).setDepositPrice(newDepositPrice)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero deposit price", async function () {
      await expect(
        batchContract.setDepositPrice(0)
      ).to.be.revertedWith("Deposit price must be greater than 0");
    });

    it("Should use new deposit price for future batch joins", async function () {
      const newDepositPrice = BigInt(50 * 10 ** USDC_DECIMALS); // 50 USDC
      await batchContract.setDepositPrice(newDepositPrice);

      // User joins with new deposit price
      await usdcToken.connect(user1).approve(await batchContract.getAddress(), newDepositPrice);
      await expect(batchContract.connect(user1).joinBatch())
        .to.emit(batchContract, "UserJoined")
        .withArgs(1, user1.address, newDepositPrice);

      const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
      expect(participantInfo.depositAmount).to.equal(newDepositPrice);
    });

    it("Should reject joins with insufficient USDC allowance after price update", async function () {
      const newDepositPrice = BigInt(50 * 10 ** USDC_DECIMALS);
      await batchContract.setDepositPrice(newDepositPrice);

      // Try to join with old deposit amount approval
      await usdcToken.connect(user1).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);
      await expect(
        batchContract.connect(user1).joinBatch()
      ).to.be.reverted; // ERC20: insufficient allowance
    });

    it("Should not affect existing participants when deposit price changes", async function () {
      // User1 joins with original deposit price
      await approveAndJoin(user1);

      const oldParticipantInfo = await batchContract.getParticipantInfo(1, user1.address);
      expect(oldParticipantInfo.depositAmount).to.equal(DEPOSIT_AMOUNT);

      // Owner changes deposit price
      const newDepositPrice = BigInt(50 * 10 ** USDC_DECIMALS);
      await batchContract.setDepositPrice(newDepositPrice);

      // User1's deposit amount should remain unchanged
      const newParticipantInfo = await batchContract.getParticipantInfo(1, user1.address);
      expect(newParticipantInfo.depositAmount).to.equal(DEPOSIT_AMOUNT);

      // New user joins with new deposit price
      await usdcToken.connect(user2).approve(await batchContract.getAddress(), newDepositPrice);
      await batchContract.connect(user2).joinBatch();
      const user2Info = await batchContract.getParticipantInfo(1, user2.address);
      expect(user2Info.depositAmount).to.equal(newDepositPrice);
    });
  });

  describe("Discount Codes", function () {
    const discountCode = "SAVE20";
    const discountCodeHash = ethers.keccak256(ethers.toUtf8Bytes(discountCode));
    const percentageDiscount = 20n; // 20%
    const fixedDiscount = BigInt(5 * 10 ** USDC_DECIMALS); // 5 USDC
    const maxUses = 10;

    describe("Discount Code Registration", function () {
      it("Should allow owner to register percentage discount code", async function () {
        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            percentageDiscount,
            true, // isPercentage
            maxUses,
            true, // appliesToDeposit
            true  // appliesToBalance
          )
        )
          .to.emit(batchContract, "DiscountCodeRegistered")
          .withArgs(discountCodeHash, percentageDiscount, true, maxUses, true, true);

        const codeInfo = await batchContract.discountCodes(discountCodeHash);
        expect(codeInfo.discountValue).to.equal(percentageDiscount);
        expect(codeInfo.isPercentage).to.be.true;
        expect(codeInfo.remainingUses).to.equal(maxUses);
        expect(codeInfo.active).to.be.true;
        expect(codeInfo.appliesToDeposit).to.be.true;
        expect(codeInfo.appliesToBalance).to.be.true;
      });

      it("Should allow owner to register fixed amount discount code", async function () {
        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            fixedDiscount,
            false, // isPercentage
            maxUses,
            true,
            false // only for deposits
          )
        )
          .to.emit(batchContract, "DiscountCodeRegistered")
          .withArgs(discountCodeHash, fixedDiscount, false, maxUses, true, false);

        const codeInfo = await batchContract.discountCodes(discountCodeHash);
        expect(codeInfo.discountValue).to.equal(fixedDiscount);
        expect(codeInfo.isPercentage).to.be.false;
        expect(codeInfo.appliesToBalance).to.be.false;
      });

      it("Should not allow non-owner to register discount code", async function () {
        await expect(
          batchContract.connect(user1).registerDiscountCode(
            discountCodeHash,
            percentageDiscount,
            true,
            maxUses,
            true,
            true
          )
        ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
      });

      it("Should reject invalid percentage values", async function () {
        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            0n, // 0%
            true,
            maxUses,
            true,
            true
          )
        ).to.be.revertedWith("Percentage must be between 1-100");

        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            101n, // 101%
            true,
            maxUses,
            true,
            true
          )
        ).to.be.revertedWith("Percentage must be between 1-100");
      });

      it("Should reject zero max uses", async function () {
        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            percentageDiscount,
            true,
            0, // zero uses
            true,
            true
          )
        ).to.be.revertedWith("Max uses must be greater than 0");
      });

      it("Should reject code that doesn't apply to any payment type", async function () {
        await expect(
          batchContract.registerDiscountCode(
            discountCodeHash,
            percentageDiscount,
            true,
            maxUses,
            false, // doesn't apply to deposit
            false  // doesn't apply to balance
          )
        ).to.be.revertedWith("Code must apply to at least one payment type");
      });
    });

    describe("Discount Code Deactivation", function () {
      beforeEach(async function () {
        await batchContract.registerDiscountCode(
          discountCodeHash,
          percentageDiscount,
          true,
          maxUses,
          true,
          true
        );
      });

      it("Should allow owner to deactivate discount code", async function () {
        await expect(batchContract.deactivateDiscountCode(discountCodeHash))
          .to.emit(batchContract, "DiscountCodeDeactivated")
          .withArgs(discountCodeHash);

        const codeInfo = await batchContract.discountCodes(discountCodeHash);
        expect(codeInfo.active).to.be.false;
      });

      it("Should not allow non-owner to deactivate discount code", async function () {
        await expect(
          batchContract.connect(user1).deactivateDiscountCode(discountCodeHash)
        ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
      });
    });

    describe("Join Batch With Discount", function () {
      beforeEach(async function () {
        // Register 20% discount code for deposits
        await batchContract.registerDiscountCode(
          discountCodeHash,
          percentageDiscount,
          true,
          maxUses,
          true, // applies to deposit
          false // doesn't apply to balance
        );
      });

      it("Should allow joining with valid percentage discount code", async function () {
        const discountedAmount = (DEPOSIT_AMOUNT * 80n) / 100n; // 20% off
        const discountSaved = DEPOSIT_AMOUNT - discountedAmount;

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);

        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(discountCodeHash)
        )
          .to.emit(batchContract, "UserJoined")
          .withArgs(1, user1.address, discountedAmount)
          .and.to.emit(batchContract, "DiscountCodeUsed")
          .withArgs(discountCodeHash, user1.address, discountSaved, true);

        const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
        expect(participantInfo.depositAmount).to.equal(discountedAmount);

        // Check code remaining uses decremented
        const codeInfo = await batchContract.discountCodes(discountCodeHash);
        expect(codeInfo.remainingUses).to.equal(maxUses - 1);

        // Check user marked as having used the code
        expect(await batchContract.userUsedDiscount(user1.address, discountCodeHash)).to.be.true;
      });

      it("Should allow joining with fixed amount discount code", async function () {
        // Register fixed amount discount
        const fixedDiscountHash = ethers.keccak256(ethers.toUtf8Bytes("FIXED5"));
        await batchContract.registerDiscountCode(
          fixedDiscountHash,
          fixedDiscount, // 5 USDC off
          false,
          maxUses,
          true,
          false
        );

        const discountedAmount = DEPOSIT_AMOUNT - fixedDiscount;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);

        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(fixedDiscountHash)
        )
          .to.emit(batchContract, "UserJoined")
          .withArgs(1, user1.address, discountedAmount);

        const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
        expect(participantInfo.depositAmount).to.equal(discountedAmount);
      });

      it("Should handle 100% discount (free join)", async function () {
        const freeCodeHash = ethers.keccak256(ethers.toUtf8Bytes("FREE100"));
        await batchContract.registerDiscountCode(
          freeCodeHash,
          100n, // 100% off
          true,
          5,
          true,
          false
        );

        // No approval needed for 0 amount
        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(freeCodeHash)
        )
          .to.emit(batchContract, "UserJoined")
          .withArgs(1, user1.address, 0n);

        const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
        expect(participantInfo.depositAmount).to.equal(0n);
      });

      it("Should reject inactive discount code", async function () {
        await batchContract.deactivateDiscountCode(discountCodeHash);

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);
        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(discountCodeHash)
        ).to.be.revertedWith("Discount code is not active");
      });

      it("Should reject discount code with no remaining uses", async function () {
        // Register code with only 1 use
        const oneUseHash = ethers.keccak256(ethers.toUtf8Bytes("ONEUSE"));
        await batchContract.registerDiscountCode(
          oneUseHash,
          percentageDiscount,
          true,
          1, // only 1 use
          true,
          false
        );

        // First user uses it successfully
        const discountedAmount = (DEPOSIT_AMOUNT * 80n) / 100n;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);
        await batchContract.connect(user1).joinBatchWithDiscount(oneUseHash);

        // Second user should be rejected
        await usdcToken.connect(user2).approve(await batchContract.getAddress(), discountedAmount);
        await expect(
          batchContract.connect(user2).joinBatchWithDiscount(oneUseHash)
        ).to.be.revertedWith("Discount code has no remaining uses");
      });

      it("Should reject reuse of discount code by same user", async function () {
        const discountedAmount = (DEPOSIT_AMOUNT * 80n) / 100n;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);
        await batchContract.connect(user1).joinBatchWithDiscount(discountCodeHash);

        // Try to join another batch with same code (after batch 1 fills)
        const allSigners = await ethers.getSigners();
        const allUsers = allSigners.slice(2, 26); // Fill batch 1
        for (let i = 0; i < 23; i++) {
          await approveAndJoin(allUsers[i]);
        }

        // Batch 2 should now be current
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);
        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(discountCodeHash)
        ).to.be.revertedWith("You have already used this discount code");
      });

      it("Should reject discount code that doesn't apply to deposits", async function () {
        // Register code only for balance payments
        const balanceOnlyHash = ethers.keccak256(ethers.toUtf8Bytes("BALANCEONLY"));
        await batchContract.registerDiscountCode(
          balanceOnlyHash,
          percentageDiscount,
          true,
          maxUses,
          false, // doesn't apply to deposits
          true   // only applies to balance
        );

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), DEPOSIT_AMOUNT);
        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(balanceOnlyHash)
        ).to.be.revertedWith("This code does not apply to deposits");
      });

      it("Should reject with insufficient USDC allowance", async function () {
        // Approve less than discounted amount
        const discountedAmount = (DEPOSIT_AMOUNT * 80n) / 100n;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount - 1n);

        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(discountCodeHash)
        ).to.be.reverted; // ERC20 insufficient allowance
      });
    });

    describe("Pay Balance With Discount", function () {
      const balanceDiscountHash = ethers.keccak256(ethers.toUtf8Bytes("BALANCE15"));
      const balancePercentageDiscount = 15n; // 15%

      beforeEach(async function () {
        // Fill and activate batch
        const allSigners = await ethers.getSigners();
        const allUsers = allSigners.slice(1, 25);
        for (let i = 0; i < 24; i++) {
          await approveAndJoin(allUsers[i]);
        }
        await batchContract.transitionBatchState(1, 2, BALANCE_AMOUNT); // Active

        // Register discount code for balance payments
        await batchContract.registerDiscountCode(
          balanceDiscountHash,
          balancePercentageDiscount,
          true,
          maxUses,
          false, // doesn't apply to deposits
          true   // applies to balance
        );
      });

      it("Should allow paying balance with valid discount code", async function () {
        const discountedAmount = (BALANCE_AMOUNT * 85n) / 100n; // 15% off
        const discountSaved = BALANCE_AMOUNT - discountedAmount;

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);

        await expect(
          batchContract.connect(user1).payBalanceWithDiscount(1, balanceDiscountHash)
        )
          .to.emit(batchContract, "BalancePaymentReceived")
          .withArgs(1, user1.address, discountedAmount)
          .and.to.emit(batchContract, "DiscountCodeUsed")
          .withArgs(balanceDiscountHash, user1.address, discountSaved, false);

        const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
        expect(participantInfo.balanceAmount).to.equal(discountedAmount);
        expect(participantInfo.balancePaid).to.be.true;
      });

      it("Should reject discount code that doesn't apply to balance", async function () {
        // Register code only for deposits
        const depositOnlyHash = ethers.keccak256(ethers.toUtf8Bytes("DEPOSITONLY"));
        await batchContract.registerDiscountCode(
          depositOnlyHash,
          percentageDiscount,
          true,
          maxUses,
          true,  // only applies to deposits
          false  // doesn't apply to balance
        );

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
        await expect(
          batchContract.connect(user1).payBalanceWithDiscount(1, depositOnlyHash)
        ).to.be.revertedWith("This code does not apply to balance payments");
      });

      it("Should reject inactive discount code", async function () {
        await batchContract.deactivateDiscountCode(balanceDiscountHash);

        await usdcToken.connect(user1).approve(await batchContract.getAddress(), BALANCE_AMOUNT);
        await expect(
          batchContract.connect(user1).payBalanceWithDiscount(1, balanceDiscountHash)
        ).to.be.revertedWith("Discount code is not active");
      });

      it("Should allow different users to use same discount code", async function () {
        const discountedAmount = (BALANCE_AMOUNT * 85n) / 100n;

        // User1 uses code
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discountedAmount);
        await batchContract.connect(user1).payBalanceWithDiscount(1, balanceDiscountHash);

        // User2 also uses code
        await usdcToken.connect(user2).approve(await batchContract.getAddress(), discountedAmount);
        await expect(
          batchContract.connect(user2).payBalanceWithDiscount(1, balanceDiscountHash)
        ).to.emit(batchContract, "BalancePaymentReceived");

        // Check remaining uses decremented twice
        const codeInfo = await batchContract.discountCodes(balanceDiscountHash);
        expect(codeInfo.remainingUses).to.equal(maxUses - 2);
      });

      it("Should handle fixed amount discount larger than balance (floor at 0)", async function () {
        const largeDiscountHash = ethers.keccak256(ethers.toUtf8Bytes("HUGE"));
        const hugeDiscount = BigInt(100 * 10 ** USDC_DECIMALS); // 100 USDC discount on 75 USDC balance

        await batchContract.registerDiscountCode(
          largeDiscountHash,
          hugeDiscount,
          false, // fixed amount
          5,
          false,
          true
        );

        // Should result in 0 payment
        await expect(
          batchContract.connect(user1).payBalanceWithDiscount(1, largeDiscountHash)
        )
          .to.emit(batchContract, "BalancePaymentReceived")
          .withArgs(1, user1.address, 0n);

        const participantInfo = await batchContract.getParticipantInfo(1, user1.address);
        expect(participantInfo.balanceAmount).to.equal(0n);
        expect(participantInfo.balancePaid).to.be.true;
      });
    });

    describe("Discount Code Edge Cases", function () {
      it("Should handle multiple discount codes with same hash collision prevention", async function () {
        // Two different codes with different hashes
        const code1Hash = ethers.keccak256(ethers.toUtf8Bytes("CODE1"));
        const code2Hash = ethers.keccak256(ethers.toUtf8Bytes("CODE2"));

        await batchContract.registerDiscountCode(code1Hash, 10n, true, 5, true, true);
        await batchContract.registerDiscountCode(code2Hash, 20n, true, 5, true, true);

        const code1Info = await batchContract.discountCodes(code1Hash);
        const code2Info = await batchContract.discountCodes(code2Hash);

        expect(code1Info.discountValue).to.equal(10n);
        expect(code2Info.discountValue).to.equal(20n);
      });

      it("Should track user discount usage independently per code", async function () {
        const code1Hash = ethers.keccak256(ethers.toUtf8Bytes("CODE1"));
        const code2Hash = ethers.keccak256(ethers.toUtf8Bytes("CODE2"));

        await batchContract.registerDiscountCode(code1Hash, 10n, true, 5, true, false);
        await batchContract.registerDiscountCode(code2Hash, 20n, true, 5, true, false);

        // Use CODE1
        const discount1Amount = (DEPOSIT_AMOUNT * 90n) / 100n;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discount1Amount);
        await batchContract.connect(user1).joinBatchWithDiscount(code1Hash);

        // Should still be able to use CODE2 in a different batch
        const allSigners = await ethers.getSigners();
        const allUsers = allSigners.slice(2, 26);
        for (let i = 0; i < 23; i++) {
          await approveAndJoin(allUsers[i]);
        }

        // Batch 2 is now current
        const discount2Amount = (DEPOSIT_AMOUNT * 80n) / 100n;
        await usdcToken.connect(user1).approve(await batchContract.getAddress(), discount2Amount);
        await expect(
          batchContract.connect(user1).joinBatchWithDiscount(code2Hash)
        ).to.emit(batchContract, "UserJoined");

        // User1 should have used both codes
        expect(await batchContract.userUsedDiscount(user1.address, code1Hash)).to.be.true;
        expect(await batchContract.userUsedDiscount(user1.address, code2Hash)).to.be.true;
      });
    });
  });
});
