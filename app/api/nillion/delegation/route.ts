import { NextRequest, NextResponse } from "next/server";
// Note: Nillion imports are commented out due to build issues with libsodium
// These will be enabled when deploying to a runtime that supports the required modules
// import {
//   Signer,
//   NilauthClient,
//   Did,
//   Builder,
//   Command,
// } from "@nillion/nuc";
// import { NucCmd, SecretVaultBuilderClient } from "@nillion/secretvaults";
// import { NILLION_CONFIG } from "@/lib/nillion/config";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 tokens per minute per IP

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitKey = getRateLimitKey(request);
    if (isRateLimited(rateLimitKey)) {
      console.warn(`Rate limit exceeded for IP: ${rateLimitKey}`);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { userDid } = await request.json();

    if (!userDid) {
      return NextResponse.json(
        { error: "User DID is required" },
        { status: 400 }
      );
    }

    // Check for Nillion API key
    const apiKey = process.env.NILLION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Nillion API key not configured. Please set NILLION_API_KEY in your environment variables.",
        },
        { status: 503 }
      );
    }

    console.log("[Nillion] Creating delegation token for user:", userDid);

    // TODO: Enable when Nillion SDK is properly configured
    // This is a placeholder implementation
    return NextResponse.json({
      error:
        "Nillion delegation is not yet enabled. This will be activated in production deployment.",
      details:
        "The Nillion SDK requires specific runtime environment that is not available in this build.",
    },
    { status: 503 });
  } catch (error) {
    console.error("[Nillion] Error creating delegation token:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create delegation token",
      },
      { status: 500 }
    );
  }
}
