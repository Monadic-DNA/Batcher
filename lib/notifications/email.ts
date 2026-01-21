/**
 * Email notification service
 * In production, integrate with SendGrid, Resend, or similar
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export enum EmailType {
  BatchReady = "batch_ready",
  PaymentDue = "payment_due",
  PaymentReminder = "payment_reminder",
  ResultsAvailable = "results_available",
  ExpirationWarning = "expiration_warning",
  KitShipped = "kit_shipped",
}

/**
 * Email templates
 */
export const emailTemplates: Record<EmailType, (data: any) => EmailTemplate> = {
  [EmailType.BatchReady]: (data: { batchId: number }) => ({
    subject: `Batch #${data.batchId} is Ready!`,
    text: `Great news! Batch #${data.batchId} has reached 24 participants and is now ready for processing.

You have 7 days to pay the remaining 90% balance to continue with DNA sequencing.

Visit the dashboard to complete your payment: ${process.env.NEXT_PUBLIC_APP_URL}

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>Batch #${data.batchId} is Ready!</h2>
      <p>Great news! Your batch has reached 24 participants and is now ready for processing.</p>
      <p><strong>Important:</strong> You have 7 days to pay the remaining 90% balance to continue with DNA sequencing.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Payment</a></p>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),

  [EmailType.PaymentDue]: (data: { batchId: number; deadline: string }) => ({
    subject: `Payment Required for Batch #${data.batchId}`,
    text: `Your balance payment for Batch #${data.batchId} is now due.

Payment deadline: ${data.deadline}

Please complete your payment within 7 days to avoid a 1% late fee and continue with DNA sequencing.

Visit the dashboard: ${process.env.NEXT_PUBLIC_APP_URL}

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>Payment Required</h2>
      <p>Your balance payment for Batch #${data.batchId} is now due.</p>
      <p><strong>Payment Deadline:</strong> ${data.deadline}</p>
      <p>Please complete your payment within 7 days to avoid a 1% late fee and continue with DNA sequencing.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a></p>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),

  [EmailType.PaymentReminder]: (data: { batchId: number; hoursRemaining: number }) => ({
    subject: `⏰ Payment Reminder: ${data.hoursRemaining} Hours Left`,
    text: `This is a friendly reminder that your payment for Batch #${data.batchId} is due soon.

Time remaining: ${data.hoursRemaining} hours

Pay now to avoid late fees: ${process.env.NEXT_PUBLIC_APP_URL}

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>⏰ Payment Reminder</h2>
      <p>This is a friendly reminder that your payment for Batch #${data.batchId} is due soon.</p>
      <p><strong>Time Remaining:</strong> ${data.hoursRemaining} hours</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a></p>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),

  [EmailType.ResultsAvailable]: (data: { batchId: number; kitId: string }) => ({
    subject: `Your DNA Results are Ready! (Batch #${data.batchId})`,
    text: `Great news! Your DNA sequencing results are now available.

Batch: #${data.batchId}
Kit ID: ${data.kitId}

Download your results: ${process.env.NEXT_PUBLIC_APP_URL}

Remember: You'll need your 6-digit PIN to decrypt and download your results.

Important: Results will be automatically deleted 60 days after completion for your privacy.

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>🧬 Your DNA Results are Ready!</h2>
      <p>Great news! Your DNA sequencing results are now available.</p>
      <p><strong>Batch:</strong> #${data.batchId}<br>
      <strong>Kit ID:</strong> ${data.kitId}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Results</a></p>
      <p><strong>Remember:</strong> You'll need your 6-digit PIN to decrypt and download your results.</p>
      <p><em>Important: Results will be automatically deleted 60 days after completion for your privacy.</em></p>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),

  [EmailType.ExpirationWarning]: (data: { batchId: number; daysRemaining: number }) => ({
    subject: `⚠️ Results Expiring Soon: ${data.daysRemaining} Days Left`,
    text: `Your DNA results for Batch #${data.batchId} will be permanently deleted in ${data.daysRemaining} days.

Download your results now: ${process.env.NEXT_PUBLIC_APP_URL}

After deletion, results cannot be recovered.

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>⚠️ Results Expiring Soon</h2>
      <p>Your DNA results for Batch #${data.batchId} will be permanently deleted in <strong>${data.daysRemaining} days</strong>.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Now</a></p>
      <p><strong>After deletion, results cannot be recovered.</strong></p>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),

  [EmailType.KitShipped]: (data: { batchId: number; kitId: string; trackingNumber?: string }) => ({
    subject: `Your DNA Kit Has Been Shipped! (Batch #${data.batchId})`,
    text: `Your DNA kit has been shipped!

Batch: #${data.batchId}
Kit ID: ${data.kitId}
${data.trackingNumber ? `Tracking: ${data.trackingNumber}` : ""}

You should receive your kit within 7-10 business days.

Once received:
1. Collect your DNA sample following the instructions
2. Return the kit using the prepaid shipping label
3. Register your kit with a secure 6-digit PIN

Thank you,
Monadic DNA Batcher Team`,
    html: `
      <h2>📦 Your DNA Kit Has Been Shipped!</h2>
      <p>Your DNA kit has been shipped and is on its way!</p>
      <p><strong>Batch:</strong> #${data.batchId}<br>
      <strong>Kit ID:</strong> ${data.kitId}
      ${data.trackingNumber ? `<br><strong>Tracking:</strong> ${data.trackingNumber}` : ""}</p>
      <p>You should receive your kit within 7-10 business days.</p>
      <h3>What to do when you receive your kit:</h3>
      <ol>
        <li>Collect your DNA sample following the instructions</li>
        <li>Return the kit using the prepaid shipping label</li>
        <li>Register your kit with a secure 6-digit PIN</li>
      </ol>
      <p>Thank you,<br>Monadic DNA Batcher Team</p>
    `,
  }),
};

/**
 * Send email
 */
export async function sendEmail(
  to: string,
  emailType: EmailType,
  data: any
): Promise<boolean> {
  try {
    const template = emailTemplates[emailType](data);

    // TODO: Integrate with email service provider
    // Example with SendGrid:
    // const msg = {
    //   to,
    //   from: process.env.EMAIL_FROM || 'noreply@monadicdna.com',
    //   subject: template.subject,
    //   text: template.text,
    //   html: template.html,
    // };
    // await sgMail.send(msg);

    console.log(`[Email] Sending ${emailType} to ${to}`);
    console.log("Subject:", template.subject);
    console.log("Preview:", template.text.substring(0, 100) + "...");

    // Mock success
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/**
 * Send batch notification to all participants
 */
export async function sendBatchNotification(
  participantEmails: string[],
  emailType: EmailType,
  data: any
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of participantEmails) {
    const success = await sendEmail(email, emailType, data);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
