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

    // Delete all shipping data for this batch from Nillion
    // Nillion's admin API key provides access control
    const nillionResponse = await fetch(
      `${process.env.NEXT_PUBLIC_NILLION_API_URL || "https://nillion-api.example.com"}/delete-pattern`,
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
      throw new Error(`Failed to delete from Nillion: ${nillionResponse.statusText}`);
    }

    const nillionData = await nillionResponse.json();

    return NextResponse.json({
      success: true,
      deletedCount: nillionData.deletedCount || 0,
      totalParticipants: nillionData.deletedCount || 0,
    });
  } catch (error) {
    console.error("Error deleting shipping data:", error);
    return NextResponse.json(
      {
        error: "Failed to delete shipping data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
