import { NextRequest, NextResponse } from "next/server";
import { sendEmail, EmailType } from "@/lib/notifications/email";

/**
 * Cron job to check for expiring results and send warnings
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-expiration",
 *     "schedule": "0 0 * * *" // Run daily at midnight
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Checking for expiring results...");

    // TODO: Query Nillion for results nearing expiration
    // Get all completed batches and check retention dates
    // Send warnings for results expiring in 7, 3, and 1 day(s)

    // Mock implementation:
    const expiringResults = [
      {
        email: "user@example.com",
        batchId: 1,
        daysRemaining: 7,
      },
    ];

    let warningsSent = 0;
    let warningsFailed = 0;

    for (const result of expiringResults) {
      // Send warning for results expiring soon
      if ([7, 3, 1].includes(result.daysRemaining)) {
        const success = await sendEmail(
          result.email,
          EmailType.ExpirationWarning,
          {
            batchId: result.batchId,
            daysRemaining: result.daysRemaining,
          }
        );

        if (success) {
          warningsSent++;
        } else {
          warningsFailed++;
        }
      }
    }

    console.log(
      `[Cron] Expiration check complete. Warnings sent: ${warningsSent}, Failed: ${warningsFailed}`
    );

    return NextResponse.json({
      success: true,
      warningsSent,
      warningsFailed,
    });
  } catch (error) {
    console.error("[Cron] Error checking expiration:", error);
    return NextResponse.json(
      { error: "Failed to check expiration" },
      { status: 500 }
    );
  }
}
