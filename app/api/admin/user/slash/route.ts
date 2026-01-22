import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { slashUser, getProvider } from "@/lib/contract";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";
import { withAdminAuth } from "@/lib/middleware/adminAuth";

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId, userAddress, privateKey } = body;

    // Validate input
    if (!batchId || isNaN(parseInt(batchId))) {
      return NextResponse.json(
        { error: "Valid batch ID is required" },
        { status: 400 }
      );
    }

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: "Valid user wallet address is required" },
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

    // Create signer from private key (uses Alchemy if configured)
    const provider = getProvider();
    const signer = new ethers.Wallet(privateKey, provider);

    // Slash user
    const receipt = await slashUser(batchIdNum, userAddress, signer);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      userAddress,
      batchId: batchIdNum,
    });
  } catch (error) {
    console.error("Error slashing user:", error);
    return NextResponse.json(
      {
        error: "Failed to slash user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const POST = withAdminAuth(
  withRateLimit(handlePOST, RateLimitPresets.strict)
);
