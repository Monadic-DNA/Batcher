import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy RPC requests to avoid CSP issues with localhost:8545
 * This allows the frontend to make requests to /api/rpc instead of directly to localhost
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RPC proxy error:", error);
    return NextResponse.json(
      { error: "RPC request failed" },
      { status: 500 }
    );
  }
}
