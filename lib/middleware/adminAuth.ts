import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/contract";

/**
 * Extract wallet address from request headers or body
 */
function extractWalletAddress(request: NextRequest): string | null {
  // Try header first (preferred)
  const authHeader = request.headers.get("x-wallet-address");
  if (authHeader) {
    return authHeader;
  }

  // Try to parse from Authorization header
  const authorization = request.headers.get("authorization");
  if (authorization && authorization.startsWith("Bearer ")) {
    // In production, verify JWT and extract wallet address
    // For now, just return null
    return null;
  }

  return null;
}

/**
 * Admin authentication middleware
 * Returns null if admin is authenticated, NextResponse if not
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const walletAddress = extractWalletAddress(request);

  if (!walletAddress) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Wallet address not provided",
      },
      { status: 401 }
    );
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Invalid wallet address format",
      },
      { status: 400 }
    );
  }

  try {
    // Check if wallet is admin via smart contract
    const isAdminWallet = await isAdmin(walletAddress);

    if (!isAdminWallet) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Admin privileges required",
        },
        { status: 403 }
      );
    }

    return null; // Admin authenticated
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to verify admin status",
      },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API routes with admin authentication
 */
export function withAdminAuth<T>(
  handler: (request: NextRequest, context: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    const authResponse = await requireAdmin(request);

    if (authResponse) {
      return authResponse;
    }

    return handler(request, context);
  };
}
