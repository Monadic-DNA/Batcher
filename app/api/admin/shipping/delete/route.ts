import { NextRequest, NextResponse } from "next/server";
import { deleteData } from "@/lib/nillion/client";

export async function POST(request: NextRequest) {
  try {
    // Delete all shipping data from nilDB
    // Standard collection: Admin can delete all records via API key

    console.log("Deleting all shipping data from Nillion...");

    // Delete all shipping records (empty filter deletes all)
    const deletedCount = await deleteData('shipping', {});

    console.log(`Deleted ${deletedCount} shipping records`);

    return NextResponse.json({
      success: true,
      deletedCount,
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
