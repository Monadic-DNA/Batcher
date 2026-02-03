import { NextRequest, NextResponse } from "next/server";
import { storeData } from "@/lib/nillion/client";

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

    if (!dataType || !["shipping", "metadata"].includes(dataType)) {
      return NextResponse.json(
        { error: "Valid data type is required (shipping or metadata)" },
        { status: 400 }
      );
    }

    // Store data in Nillion nilDB
    // Add timestamp and wallet address to data
    const timestamp = new Date().toISOString();
    const recordData = {
      ...data,
      walletAddress,
      ...(dataType === "shipping" ? { storedAt: timestamp } : { submittedAt: timestamp }),
    };

    console.log("Storing data in Nillion:", {
      walletAddress,
      dataType,
      dataSize: JSON.stringify(recordData).length,
    });

    // Store in nilDB using the client
    const recordId = await storeData(dataType as 'shipping' | 'metadata', recordData);

    // Set retention based on data type
    const retentionMap: Record<string, number> = {
      shipping: 7, // Delete after kits shipped (7 days)
      metadata: 60, // Keep for 60 days
    };
    const retentionDays = retentionMap[dataType];

    return NextResponse.json({
      success: true,
      recordId,
      expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error storing data in Nillion:", error);
    return NextResponse.json(
      {
        error: "Failed to store data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
