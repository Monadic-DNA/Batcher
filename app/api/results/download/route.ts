import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Download token required" },
        { status: 400 }
      );
    }

    // Decode the token
    let tokenData: { batchId: number; kitId: string; timestamp: number };
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      tokenData = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid download token" },
        { status: 400 }
      );
    }

    // Verify token is not expired (valid for 2 hours)
    const tokenAge = Date.now() - tokenData.timestamp;
    if (tokenAge > 2 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Download token expired. Please verify again." },
        { status: 401 }
      );
    }

    console.log(`[Results Download] Downloading for batch ${tokenData.batchId}, kit ${tokenData.kitId}`);

    // Get Spaces configuration
    const spacesEndpoint = process.env.DO_SPACES_ENDPOINT;
    const spacesRegion = process.env.DO_SPACES_REGION || "nyc3";
    const spacesBucket = process.env.DO_SPACES_BUCKET;
    const spacesKey = process.env.DO_SPACES_KEY;
    const spacesSecret = process.env.DO_SPACES_SECRET;

    if (!spacesEndpoint || !spacesBucket || !spacesKey || !spacesSecret) {
      console.error("[Results Download] Missing DigitalOcean Spaces configuration");
      return NextResponse.json(
        { error: "Storage configuration error" },
        { status: 500 }
      );
    }

    // Configure S3 client
    const cleanEndpoint = spacesEndpoint.replace(/^https?:\/\//, '');
    const s3Client = new S3Client({
      endpoint: `https://${cleanEndpoint}`,
      region: spacesRegion,
      credentials: {
        accessKeyId: spacesKey,
        secretAccessKey: spacesSecret,
      },
    });

    // Get the file from Spaces
    const spacesObjectKey = `batch_${tokenData.batchId}/${tokenData.kitId}.csv`;
    const command = new GetObjectCommand({
      Bucket: spacesBucket,
      Key: spacesObjectKey,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return NextResponse.json(
        { error: "File content not available" },
        { status: 500 }
      );
    }

    // Convert the stream to a buffer
    const stream = response.Body as Readable;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dna-results-${tokenData.kitId}-${new Date().toISOString().split('T')[0]}.csv"`,
        "Content-Length": buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("[Results Download] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
