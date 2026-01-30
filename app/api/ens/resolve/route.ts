import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

/**
 * Server-side ENS resolution to avoid exposing Alchemy API key to client
 */
export async function POST(request: NextRequest) {
  try {
    const { addresses, chainId } = await request.json();

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: "addresses array is required" },
        { status: 400 }
      );
    }

    // Only resolve ENS on mainnet or sepolia
    if (chainId !== "1" && chainId !== "11155111") {
      return NextResponse.json({ ensNames: {} });
    }

    const alchemyKey = process.env.ALCHEMY_API_KEY;
    if (!alchemyKey) {
      // No API key, skip ENS resolution
      return NextResponse.json({ ensNames: {} });
    }

    const network = chainId === "1" ? "eth-mainnet" : "eth-sepolia";
    const provider = new ethers.JsonRpcProvider(
      `https://${network}.g.alchemy.com/v2/${alchemyKey}`
    );

    const ensNames: Record<string, string> = {};

    // Resolve all addresses in parallel with timeout
    await Promise.all(
      addresses.map(async (address: string) => {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 3000)
          );
          const ensPromise = provider.lookupAddress(address);
          const ens = await Promise.race([ensPromise, timeoutPromise]);
          if (ens && typeof ens === "string") {
            ensNames[address] = ens;
          }
        } catch {
          // Skip failed lookups
        }
      })
    );

    return NextResponse.json({ ensNames });
  } catch (error) {
    console.error("ENS resolution error:", error);
    return NextResponse.json(
      { error: "Failed to resolve ENS names" },
      { status: 500 }
    );
  }
}
