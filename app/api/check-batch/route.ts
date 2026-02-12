import { NextRequest, NextResponse } from "next/server";
import { getCurrentBatchId, getBatchInfo, getParticipantInfo, isParticipant } from "@/lib/contract";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    console.log(`[Batch Check] Checking batch status for: ${walletAddress}`);

    // Get current batch ID
    const currentBatchId = await getCurrentBatchId();
    const states = ['Pending', 'Staged', 'Active', 'Sequencing', 'Completed', 'Purged'];

    // Check all batches from current down to 1 to find ALL batches the user is in
    const userBatches = [];

    for (let batchId = currentBatchId; batchId >= 1; batchId--) {
      const isUserInBatch = await isParticipant(batchId, walletAddress);

      if (isUserInBatch) {
        // User found in this batch
        const participantInfo = await getParticipantInfo(batchId, walletAddress);
        const batchInfo = await getBatchInfo(batchId);

        userBatches.push({
          batchId,
          joined: true,
          depositPaid: participantInfo.depositAmount > 0n,
          balancePaid: participantInfo.balancePaid,
          batchState: states[batchInfo.state],
          commitmentHash: participantInfo.commitmentHash,
        });
      }
    }

    // Return all batches user is in, or indicate they haven't joined any
    if (userBatches.length > 0) {
      return NextResponse.json({
        success: true,
        batches: userBatches,
        // Keep batchInfo for backwards compatibility (use most recent batch)
        batchInfo: userBatches[0],
      });
    }

    // User is not a participant in any batch
    return NextResponse.json({
      success: true,
      batches: [],
      batchInfo: {
        batchId: currentBatchId,
        joined: false,
        depositPaid: false,
        balancePaid: false,
        batchState: "Not Joined",
      },
    });
  } catch (error) {
    console.error("[Batch Check] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to check batch status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
