import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  stageBatch,
  activateBatch,
  startSequencing,
  completeBatch,
  purgeBatch,
  getBatchState,
  getProvider,
  BatchState,
} from "@/lib/contract";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";
import { withAdminAuth } from "@/lib/middleware/adminAuth";

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, privateKey } = body;

    // Validate input
    if (!batchId || isNaN(parseInt(batchId))) {
      return NextResponse.json(
        { error: "Valid batch ID is required" },
        { status: 400 }
      );
    }

    if (!privateKey || typeof privateKey !== "string") {
      return NextResponse.json(
        { error: "Private key is required for transaction signing" },
        { status: 400 }
      );
    }

    const batchIdNum = parseInt(batchId);

    // Get current state
    const currentState = await getBatchState(batchIdNum);

    // Create signer from private key (uses Alchemy if configured)
    const provider = getProvider();
    const signer = new ethers.Wallet(privateKey, provider);

    // Progress to next state
    let receipt;
    switch (currentState) {
      case BatchState.Pending:
        receipt = await stageBatch(batchIdNum, signer);
        break;
      case BatchState.Staged:
        receipt = await activateBatch(batchIdNum, signer);
        break;
      case BatchState.Active:
        receipt = await startSequencing(batchIdNum, signer);
        break;
      case BatchState.Sequencing:
        receipt = await completeBatch(batchIdNum, signer);
        break;
      case BatchState.Completed:
        receipt = await purgeBatch(batchIdNum, signer);
        break;
      case BatchState.Purged:
        return NextResponse.json(
          { error: "Batch is already purged" },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: "Unknown batch state" },
          { status: 500 }
        );
    }

    // Get new state
    const newState = await getBatchState(batchIdNum);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      previousState: currentState,
      newState,
    });
  } catch (error) {
    console.error("Error progressing batch:", error);
    return NextResponse.json(
      {
        error: "Failed to progress batch state",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(
  withRateLimit(handlePOST, RateLimitPresets.strict)
);
