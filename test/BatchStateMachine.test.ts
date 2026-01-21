import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import type { BatchStateMachine } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BatchStateMachine", function () {
  let batchContract: BatchStateMachine;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let users: HardhatEthersSigner[];

  const FULL_PRICE = ethers.parseEther("0.1");
  const DEPOSIT_AMOUNT = (FULL_PRICE * 10n) / 100n; // 10%
  const BALANCE_AMOUNT = (FULL_PRICE * 90n) / 100n; // 90%

  beforeEach(async function () {
    [owner, user1, user2, user3, ...users] = await ethers.getSigners();

    const BatchStateMachine = await ethers.getContractFactory(
      "BatchStateMachine"
    );
    batchContract = await BatchStateMachine.deploy();
    await batchContract.waitForDeployment();
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
    it("Should allow user to join with correct deposit", async function () {
      await expect(
        batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT })
      )
        .to.emit(batchContract, "UserJoined")
        .withArgs(1, user1.address, DEPOSIT_AMOUNT);

      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.participantCount).to.equal(1);
      expect(await batchContract.isParticipant(1, user1.address)).to.be.true;
    });

    it("Should reject insufficient deposit", async function () {
      const insufficientDeposit = DEPOSIT_AMOUNT - 1n;
      await expect(
        batchContract.connect(user1).joinBatch({ value: insufficientDeposit })
      ).to.be.revertedWith("Insufficient deposit");
    });

    it("Should refund excess payment", async function () {
      const excessAmount = DEPOSIT_AMOUNT + ethers.parseEther("0.05");
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await batchContract
        .connect(user1)
        .joinBatch({ value: excessAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const expectedBalance = balanceBefore - DEPOSIT_AMOUNT - gasUsed;

      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.0001"));
    });

    it("Should prevent duplicate joins", async function () {
      await batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT });
      await expect(
        batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT })
      ).to.be.revertedWith("Already joined this batch");
    });

    it("Should transition to Staged when batch is full (24 users)", async function () {
      // Get all available signers
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25); // Skip owner, get next 24

      // Join 23 users
      for (let i = 0; i < 23; i++) {
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }

      let batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(0); // Still Pending

      // 24th user joins
      await expect(
        batchContract.connect(allUsers[23]).joinBatch({ value: DEPOSIT_AMOUNT })
      )
        .to.emit(batchContract, "BatchStateChanged")
        .withArgs(1, 1, await time.latest()); // Staged state

      batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(1); // Staged
      expect(batchInfo.participantCount).to.equal(24);
    });

    it("Should create new batch when current becomes Staged", async function () {
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);

      // Fill batch 1
      for (let i = 0; i < 24; i++) {
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
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
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }
    });

    it("Should allow owner to transition batch to Active", async function () {
      const tx = await batchContract.transitionBatchState(1, 2); // Active
      const receipt = await tx.wait();
      const currentTime = await time.latest();

      await expect(tx)
        .to.emit(batchContract, "BatchStateChanged")
        .withArgs(1, 2, currentTime);

      const batchInfo = await batchContract.getBatchInfo(1);
      expect(batchInfo.state).to.equal(2); // Active
    });

    it("Should set payment deadlines when transitioning to Active", async function () {
      await batchContract.transitionBatchState(1, 2); // Active

      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      const currentTime = await time.latest();
      const expectedDeadline = currentTime + 7 * 24 * 60 * 60; // 7 days

      expect(participantInfo.paymentDeadline).to.equal(expectedDeadline);
    });

    it("Should not allow non-owner to transition state", async function () {
      await expect(
        batchContract.connect(user1).transitionBatchState(1, 2)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });

    it("Should progress through all states", async function () {
      await batchContract.transitionBatchState(1, 2); // Active
      await batchContract.transitionBatchState(1, 3); // Sequencing
      await batchContract.transitionBatchState(1, 4); // Completed
      await batchContract.transitionBatchState(1, 5); // Purged

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
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }
      await batchContract.transitionBatchState(1, 2); // Active
    });

    it("Should allow user to pay balance in Active state", async function () {
      await expect(
        batchContract.connect(user1).payBalance(1, { value: BALANCE_AMOUNT })
      )
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
      await batchContract.transitionBatchState(1, 3); // Sequencing

      await expect(
        batchContract.connect(user1).payBalance(1, { value: BALANCE_AMOUNT })
      ).to.be.revertedWith("Batch not active");
    });

    it("Should reject insufficient balance payment", async function () {
      const insufficient = BALANCE_AMOUNT - 1n;
      await expect(
        batchContract.connect(user1).payBalance(1, { value: insufficient })
      ).to.be.revertedWith("Insufficient balance payment");
    });

    it("Should reject balance payment after deadline", async function () {
      // Fast forward 8 days
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        batchContract.connect(user1).payBalance(1, { value: BALANCE_AMOUNT })
      ).to.be.revertedWith("Payment window expired");
    });

    it("Should prevent duplicate balance payments", async function () {
      await batchContract
        .connect(user1)
        .payBalance(1, { value: BALANCE_AMOUNT });

      await expect(
        batchContract.connect(user1).payBalance(1, { value: BALANCE_AMOUNT })
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
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }
      await batchContract.transitionBatchState(1, 2); // Active
      await batchContract
        .connect(user1)
        .payBalance(1, { value: BALANCE_AMOUNT });
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

    it("Should prevent storing commitment twice", async function () {
      await batchContract.connect(user1).storeCommitmentHash(1, testHash);

      await expect(
        batchContract.connect(user1).storeCommitmentHash(1, testHash)
      ).to.be.revertedWith("Commitment already stored");
    });

    it("Should allow storing commitment in Sequencing state", async function () {
      await batchContract.transitionBatchState(1, 3); // Sequencing

      await expect(
        batchContract.connect(user1).storeCommitmentHash(1, testHash)
      ).to.emit(batchContract, "CommitmentHashStored");
    });
  });

  describe("Slashing", function () {
    beforeEach(async function () {
      // Fill and activate batch
      const allSigners = await ethers.getSigners();
      const allUsers = allSigners.slice(1, 25);
      for (let i = 0; i < 24; i++) {
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }
      await batchContract.transitionBatchState(1, 2); // Active
    });

    it("Should slash user after payment deadline expires", async function () {
      // Fast forward past 7-day deadline
      await time.increase(8 * 24 * 60 * 60);

      const penaltyAmount = (DEPOSIT_AMOUNT * 1n) / 100n; // 1%

      await expect(batchContract.slashUser(1, user1.address))
        .to.emit(batchContract, "UserSlashed")
        .withArgs(1, user1.address, penaltyAmount);

      const participantInfo = await batchContract.getParticipantInfo(
        1,
        user1.address
      );
      expect(participantInfo.slashed).to.be.true;
    });

    it("Should not slash user before deadline", async function () {
      await expect(
        batchContract.slashUser(1, user1.address)
      ).to.be.revertedWith("Payment window not expired");
    });

    it("Should not slash user who already paid", async function () {
      await batchContract
        .connect(user1)
        .payBalance(1, { value: BALANCE_AMOUNT });
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        batchContract.slashUser(1, user1.address)
      ).to.be.revertedWith("User already paid");
    });

    it("Should not slash user twice", async function () {
      await time.increase(8 * 24 * 60 * 60);
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
        await batchContract
          .connect(allUsers[i])
          .joinBatch({ value: DEPOSIT_AMOUNT });
      }
      await batchContract.transitionBatchState(1, 2); // Active
    });

    it("Should allow payment within 6-month patience window", async function () {
      // Fast forward 2 months (within patience window)
      await time.increase(60 * 24 * 60 * 60);

      expect(await batchContract.canStillPay(1, user1.address)).to.be.true;
    });

    it("Should not allow payment after patience window", async function () {
      // Fast forward 7 months (beyond patience window)
      await time.increase(210 * 24 * 60 * 60);

      expect(await batchContract.canStillPay(1, user1.address)).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update price", async function () {
      const newPrice = ethers.parseEther("0.2");
      await batchContract.updateFullPrice(newPrice);
      expect(await batchContract.fullPrice()).to.equal(newPrice);
    });

    it("Should not allow non-owner to update price", async function () {
      const newPrice = ethers.parseEther("0.2");
      await expect(
        batchContract.connect(user1).updateFullPrice(newPrice)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw funds", async function () {
      // Add some funds
      await batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT });
      await batchContract.connect(user2).joinBatch({ value: DEPOSIT_AMOUNT });

      const contractBalance = await ethers.provider.getBalance(
        await batchContract.getAddress()
      );
      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address
      );

      await expect(batchContract.withdrawFunds(contractBalance))
        .to.emit(batchContract, "FundsWithdrawn")
        .withArgs(owner.address, contractBalance);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });

    it("Should not allow non-owner to withdraw funds", async function () {
      await batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT });

      await expect(
        batchContract.connect(user1).withdrawFunds(DEPOSIT_AMOUNT)
      ).to.be.revertedWithCustomError(batchContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await batchContract.connect(user1).joinBatch({ value: DEPOSIT_AMOUNT });
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
});
