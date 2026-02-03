import { NextRequest, NextResponse } from "next/server";
import { findData } from "@/lib/nillion/client";

export async function POST(request: NextRequest) {
  try {
    // Query nilDB for all shipping data
    // Standard collection: Admin has access to all records via API key
    // Admin creates records on behalf of participants (Dynamic wallets not compatible with Nillion)

    console.log("Fetching all shipping data from Nillion...");

    // Fetch all shipping records (empty filter)
    const records = await findData('shipping', {});

    // Transform records to expected format
    const shippingData = records.map((record: any) => ({
      kitId: record.kitId,
      email: record.email,
      name: record.name,
      address: record.address,
      city: record.city,
      state: record.state,
      zip: record.zip,
      country: record.country,
      storedAt: record.storedAt,
      walletAddress: record.walletAddress, // For internal tracking
    }));

    console.log(`Retrieved ${shippingData.length} shipping records`);

    return NextResponse.json({
      success: true,
      shippingData,
      participantCount: shippingData.length,
    });
  } catch (error) {
    console.error("Error fetching shipping data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch shipping data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
