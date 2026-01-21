import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, RateLimitPresets } from "@/lib/middleware/rateLimit";

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, storeId, pin } = body;

    // Validate input
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Valid wallet address is required" },
        { status: 400 }
      );
    }

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // PIN is optional - only required for results decryption
    if (pin && !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 6 digits" },
        { status: 400 }
      );
    }

    // TODO: Retrieve and decrypt data from Nillion
    // Steps:
    // 1. Initialize Nillion client with API key
    // 2. Fetch encrypted data using store_id
    // 3. Verify wallet address matches
    // 4. If PIN provided, verify against commitment hash
    // 5. Decrypt data using Nillion's decryption
    // 6. Return decrypted data

    console.log("Retrieving data from Nillion:", {
      walletAddress,
      storeId,
      hasPin: !!pin,
    });

    // Mock response - in production, this would be actual decrypted data
    const mockData = {
      walletAddress,
      retrievedAt: new Date().toISOString(),
      data: {
        // Sample data structure
        message: "This would be the actual decrypted data from Nillion",
      },
    };

    return NextResponse.json({
      success: true,
      data: mockData,
    });
  } catch (error) {
    console.error("Error retrieving data from Nillion:", error);
    return NextResponse.json(
      { error: "Failed to retrieve data" },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(handlePOST, RateLimitPresets.standard);
