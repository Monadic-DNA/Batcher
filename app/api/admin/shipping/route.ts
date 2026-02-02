import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId } = body;

    // Validate inputs
    if (!batchId || typeof batchId !== "number") {
      return NextResponse.json(
        { error: "Batch ID is required" },
        { status: 400 }
      );
    }

    // Query Nillion for all shipping data in this batch
    // Nillion's admin API key provides access control - if the key is valid, access is granted
    const nillionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_NILLION_API_URL || "https://nillion-api.example.com"}/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NILLION_ADMIN_API_KEY}`,
        },
        body: JSON.stringify({
          keyPattern: `shipping_${batchId}_*`,
        }),
      }
    );

    if (!nillionResponse.ok) {
      throw new Error(`Failed to query Nillion: ${nillionResponse.statusText}`);
    }

    const nillionData = await nillionResponse.json();

    // Transform Nillion response to shipping data format
    const shippingData = nillionData.results?.map((record: any) => ({
      walletAddress: record.walletAddress,
      batchId,
      email: record.email,
      name: record.name,
      address: record.address,
      city: record.city,
      state: record.state,
      zip: record.zip,
      country: record.country,
      retrievedAt: new Date().toISOString(),
    })) || [];

    return NextResponse.json({
      success: true,
      shippingData,
      batchId,
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
