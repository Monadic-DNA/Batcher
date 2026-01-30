import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, data, dataType } = body;

    // Validate input
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Valid wallet address is required" },
        { status: 400 }
      );
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Data object is required" },
        { status: 400 }
      );
    }

    if (!dataType || !["shipping", "metadata", "results"].includes(dataType)) {
      return NextResponse.json(
        { error: "Valid data type is required (shipping, metadata, or results)" },
        { status: 400 }
      );
    }

    // TODO: Store encrypted data in Nillion
    // Steps:
    // 1. Initialize Nillion client with API key
    // 2. Encrypt data using Nillion's encryption
    // 3. Store in nilDB with wallet address as key
    // 4. Set retention policy based on data type
    // 5. Return store_id for future retrieval

    console.log("Storing data in Nillion:", {
      walletAddress,
      dataType,
      dataSize: JSON.stringify(data).length,
    });

    // Mock response
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Set retention based on data type
    const retentionMap: Record<string, number> = {
      shipping: 7, // Delete after kits shipped
      metadata: 180, // Keep for 6 months
      results: 60, // Delete 60 days after completion
    };
    const retentionDays = retentionMap[dataType];

    return NextResponse.json({
      success: true,
      storeId,
      expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error storing data in Nillion:", error);
    return NextResponse.json(
      { error: "Failed to store data" },
      { status: 500 }
    );
  }
}
