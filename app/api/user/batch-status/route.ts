import { NextRequest, NextResponse } from "next/server";
import { getUserBatchInfo, canUserStillPay } from "@/lib/contract";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, batchId } = body;

    // Validate input
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!batchId || isNaN(parseInt(batchId))) {
      return NextResponse.json(
        { error: "Valid batch ID is required" },
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

    const batchIdNum = parseInt(batchId);

    // Get user's batch info
    const [userInfo, canPay] = await Promise.all([
      getUserBatchInfo(batchIdNum, walletAddress),
      canUserStillPay(batchIdNum, walletAddress),
    ]);

    // Calculate payment deadline (7 days from deposit if in Active state)
    let paymentDeadline: string | null = null;
    if (userInfo.depositPaid && !userInfo.balancePaid && userInfo.depositPaidAt > 0) {
      const deadline = new Date((userInfo.depositPaidAt + 7 * 24 * 60 * 60) * 1000);
      paymentDeadline = deadline.toISOString();
    }

    return NextResponse.json({
      joined: userInfo.depositPaid,
      depositPaid: userInfo.depositPaid,
      balancePaid: userInfo.balancePaid,
      depositPaidAt: userInfo.depositPaidAt > 0 ? new Date(userInfo.depositPaidAt * 1000).toISOString() : null,
      balancePaidAt: userInfo.balancePaidAt > 0 ? new Date(userInfo.balancePaidAt * 1000).toISOString() : null,
      canStillPay: canPay,
      paymentDeadline,
    });
  } catch (error) {
    console.error("Error fetching user batch status:", error);
    return NextResponse.json(
      { error: "Failed to fetch user batch status" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePOST, RateLimitPresets.standard);
