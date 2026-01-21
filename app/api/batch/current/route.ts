import { NextRequest, NextResponse } from "next/server";
import { getCurrentBatchId, getBatchState, getBatchParticipantCount } from "@/lib/contract";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";

async function handleGET(request: NextRequest) {
  try {
    // Get current batch ID
    const batchId = await getCurrentBatchId();

    // Get batch details
    const [state, participantCount] = await Promise.all([
      getBatchState(batchId),
      getBatchParticipantCount(batchId),
    ]);

    return NextResponse.json({
      batchId,
      state,
      participantCount,
      maxParticipants: 24,
      spotsRemaining: Math.max(0, 24 - participantCount),
    });
  } catch (error) {
    console.error("Error fetching current batch:", error);
    return NextResponse.json(
      { error: "Failed to fetch current batch" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGET, RateLimitPresets.standard);
