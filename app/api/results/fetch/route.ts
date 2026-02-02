import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { kitId, pin, walletAddress } = body;

    // Validate inputs
    if (!kitId || typeof kitId !== "string") {
      return NextResponse.json(
        { error: "Kit ID is required" },
        { status: 400 }
      );
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be 6 digits" },
        { status: 400 }
      );
    }

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Valid wallet address is required" },
        { status: 400 }
      );
    }

    // Initialize contract
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"
    );

    const contractABI = [
      "function getParticipantInfo(uint256 batchId, address user) external view returns (bytes32, uint256, uint256, bool, bool, uint256, uint256)",
      "function currentBatchId() external view returns (uint256)",
    ];

    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      contractABI,
      provider
    );

    // Find which batch this user is in
    const currentBatchId = await contract.currentBatchId();
    let userBatchId = null;
    let commitmentHash = null;

    for (let batchId = 1; batchId <= currentBatchId; batchId++) {
      try {
        const participantInfo = await contract.getParticipantInfo(batchId, walletAddress);
        if (participantInfo[0] !== ethers.ZeroHash) {
          commitmentHash = participantInfo[0];
          userBatchId = batchId;
          break;
        }
      } catch (e) {
        // User not in this batch, continue
        continue;
      }
    }

    if (!userBatchId || !commitmentHash) {
      return NextResponse.json(
        { error: "Wallet address not found in any batch" },
        { status: 404 }
      );
    }

    // Verify PIN by checking commitment hash
    const computedHash = ethers.keccak256(
      ethers.solidityPacked(["string", "string"], [kitId, pin])
    );

    if (computedHash !== commitmentHash) {
      return NextResponse.json(
        { error: "Invalid Kit ID or PIN" },
        { status: 401 }
      );
    }

    // Configure S3 client
    const s3Config: any = {
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    };

    // For DigitalOcean Spaces or custom endpoints
    if (process.env.S3_ENDPOINT) {
      s3Config.endpoint = process.env.S3_ENDPOINT;
      s3Config.forcePathStyle = true; // Required for DO Spaces
    }

    const s3Client = new S3Client(s3Config);

    // Validate S3 configuration
    if (!process.env.S3_BUCKET_NAME) {
      return NextResponse.json(
        { error: "Results storage not configured" },
        { status: 500 }
      );
    }

    // Fetch results from S3
    // Results are stored at: {bucket}/{batch_id}/{kit_id}.csv
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${userBatchId}/${kitId}.csv`,
    });

    let resultsData: string;
    try {
      const response = await s3Client.send(command);
      resultsData = await response.Body?.transformToString() || "";
    } catch (s3Error: any) {
      if (s3Error.name === "NoSuchKey") {
        return NextResponse.json(
          { error: "Results file not found" },
          { status: 404 }
        );
      }
      throw s3Error;
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: userBatchId,
        kitId,
        results: resultsData,
        format: "csv",
        retrievedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching results:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch results",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
