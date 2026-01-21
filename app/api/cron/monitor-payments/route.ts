import { NextRequest, NextResponse } from "next/server";
import { sendEmail, EmailType } from "@/lib/notifications/email";

/**
 * Cron job to monitor payment deadlines and send reminders
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/monitor-payments",
 *     "schedule": "0 * * * *" // Run every hour
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
    console.log("[Cron] Starting payment monitoring...");

    // TODO: Query smart contract for active batches
    // Get all users with pending balance payments
    // Check payment deadlines and send reminders

    // Mock implementation:
    const usersToNotify = [
      {
        email: "user@example.com",
        batchId: 1,
        deadlineHours: 24,
      },
    ];

    let notificationsSent = 0;
    let notificationsFailed = 0;

    for (const user of usersToNotify) {
      // Send reminder based on hours remaining
      if (user.deadlineHours <= 24 && user.deadlineHours > 0) {
        const success = await sendEmail(user.email, EmailType.PaymentReminder, {
          batchId: user.batchId,
          hoursRemaining: user.deadlineHours,
        });

        if (success) {
          notificationsSent++;
        } else {
          notificationsFailed++;
        }
      }
    }

    console.log(
      `[Cron] Payment monitoring complete. Sent: ${notificationsSent}, Failed: ${notificationsFailed}`
    );

    return NextResponse.json({
      success: true,
      notificationsSent,
      notificationsFailed,
    });
  } catch (error) {
    console.error("[Cron] Error monitoring payments:", error);
    return NextResponse.json(
      { error: "Failed to monitor payments" },
      { status: 500 }
    );
  }
}
