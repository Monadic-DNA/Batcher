import { NextRequest, NextResponse } from "next/server";
import { getParticipantInfo, getBatchParticipants, getBatchInfo } from "@/lib/contract";
import { ethers } from "ethers";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: NextRequest) {
  try {
    const { batchId, kitId, pin } = await request.json();

    // Validate inputs
    if (!batchId || !kitId || !pin) {
      return NextResponse.json(
        { error: "Batch ID, Kit ID, and PIN are required" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      );
    }

    console.log(`[Results Verify] Verifying for batch ${batchId}, kit ${kitId}`);

    // Check if batch is Completed (state 4)
    const batchInfo = await getBatchInfo(batchId);
    if (batchInfo.state !== 4) {
      return NextResponse.json(
        { error: "Results not yet available. Batch must be in Completed state." },
        { status: 400 }
      );
    }

    // Create commitment hash from Kit ID + PIN
    const commitmentData = kitId.trim() + pin;
    const computedHash = ethers.keccak256(ethers.toUtf8Bytes(commitmentData));

    console.log(`[Results Verify] Computed hash: ${computedHash}`);

    // Get all participants and find matching commitment hash
    const participants = await getBatchParticipants(batchId);
    let matchedWallet: string | null = null;

    for (const walletAddress of participants) {
      // Skip removed participants
      if (walletAddress === "0x0000000000000000000000000000000000000000") {
        continue;
      }

      try {
        const participantInfo = await getParticipantInfo(batchId, walletAddress);

        if (participantInfo.commitmentHash === computedHash) {
          matchedWallet = walletAddress;
          console.log(`[Results Verify] Found matching participant: ${walletAddress}`);
          break;
        }
      } catch (error) {
        console.error(`[Results Verify] Error checking participant ${walletAddress}:`, error);
      }
    }

    if (!matchedWallet) {
      return NextResponse.json(
        { error: "Invalid Kit ID or PIN" },
        { status: 401 }
      );
    }

    // Generate DigitalOcean Spaces pre-signed URL
    const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
    const spacesRegion = process.env.DO_SPACES_REGION || "nyc3";
    const spacesBucket = process.env.DO_SPACES_BUCKET;
    const spacesKey = process.env.DO_SPACES_KEY;
    const spacesSecret = process.env.DO_SPACES_SECRET;

    if (!spacesEndpoint || !spacesBucket || !spacesKey || !spacesSecret) {
      console.error("[Results Verify] Missing DigitalOcean Spaces configuration");
      return NextResponse.json(
        { error: "Storage configuration error. Please contact support." },
        { status: 500 }
      );
    }

    // File path in Spaces: batch_{batch_id}/{kit_id}.csv
    const spacesObjectKey = `batch_${batchId}/${kitId.trim()}.csv`;

    // Configure S3 client for DigitalOcean Spaces
    const cleanEndpoint = spacesEndpoint.replace(/^https?:\/\//, '');

    const s3Client = new S3Client({
      endpoint: `https://${cleanEndpoint}`,
      region: spacesRegion,
      credentials: {
        accessKeyId: spacesKey,
        secretAccessKey: spacesSecret,
      },
    });

    // Verify the file exists by attempting to get it
    const command = new GetObjectCommand({
      Bucket: spacesBucket,
      Key: spacesObjectKey,
    });

    try {
      await s3Client.send(command);
    } catch (error) {
      console.error(`[Results Verify] File not found in Spaces: ${spacesObjectKey}`, error);
      return NextResponse.json(
        { error: "Results file not found. Please contact support." },
        { status: 404 }
      );
    }

    console.log(`[Results Verify] Success! File verified for kit ${kitId} in batch ${batchId}`);

    // Return a token that can be used to download the file
    // This prevents exposing the Spaces URL directly
    const downloadToken = Buffer.from(JSON.stringify({
      batchId,
      kitId: kitId.trim(),
      timestamp: Date.now(),
    })).toString('base64');

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/results/download?token=${downloadToken}`,
    });

  } catch (error) {
    console.error("[Results Verify] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify credentials",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
