import { NextRequest, NextResponse } from "next/server";
import {
  getBatchState,
  getBatchParticipantCount,
  BATCH_STATE_NAMES,
  BatchState,
} from "@/lib/contract";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";

async function handleGET(
  request: NextRequest,
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await context.params;
    const batchIdNum = parseInt(batchId);

    if (isNaN(batchIdNum) || batchIdNum < 1) {
      return NextResponse.json(
        { error: "Invalid batch ID" },
        { status: 400 }
      );
    }

    // Get batch info from smart contract
    const [state, participantCount] = await Promise.all([
      getBatchState(batchIdNum),
      getBatchParticipantCount(batchIdNum),
    ]);

    return NextResponse.json({
      batchId: batchIdNum,
      state: BATCH_STATE_NAMES[state as BatchState],
      stateCode: state,
      participantCount,
      maxParticipants: 24,
      isFull: participantCount >= 24,
    });
  } catch (error) {
    console.error("Error fetching batch info:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch information" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGET, RateLimitPresets.standard);
