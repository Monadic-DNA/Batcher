/**
 * Privacy-preserving audit logging system
 * Logs security events without exposing PII
 */

export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = "auth.login",
  AUTH_LOGOUT = "auth.logout",
  AUTH_FAILED = "auth.failed",

  // Batch operations
  BATCH_JOINED = "batch.joined",
  BATCH_PAYMENT = "batch.payment",
  BATCH_STATE_CHANGE = "batch.state_change",

  // Admin operations
  ADMIN_ACCESS = "admin.access",
  ADMIN_BATCH_PROGRESS = "admin.batch_progress",
  ADMIN_USER_SLASH = "admin.user_slash",
  ADMIN_SHIPPING_VIEW = "admin.shipping_view",
  ADMIN_METADATA_EXPORT = "admin.metadata_export",
  ADMIN_RESULTS_UPLOAD = "admin.results_upload",

  // Data operations
  DATA_STORE = "data.store",
  DATA_RETRIEVE = "data.retrieve",
  DATA_DELETE = "data.delete",

  // Kit operations
  KIT_REGISTERED = "kit.registered",
  KIT_SHIPPED = "kit.shipped",

  // Results operations
  RESULTS_DOWNLOAD = "results.download",
  RESULTS_PIN_VERIFY = "results.pin_verify",
  RESULTS_PIN_FAILED = "results.pin_failed",

  // Security events
  SECURITY_RATE_LIMIT = "security.rate_limit",
  SECURITY_INVALID_INPUT = "security.invalid_input",
  SECURITY_UNAUTHORIZED = "security.unauthorized",
}

export enum AuditLevel {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  level: AuditLevel;
  // Privacy: Only store hashed/anonymized identifiers
  userIdHash?: string; // Hash of wallet address
  batchId?: number;
  // Context without PII
  metadata?: Record<string, string | number | boolean>;
  ipAddress?: string; // Can be hashed in production
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Hash identifier for privacy
 */
async function hashIdentifier(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Log an audit event
 * In production, send to logging service (e.g., Sentry, LogRocket, Datadog)
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  data: {
    level?: AuditLevel;
    userId?: string; // Wallet address - will be hashed
    batchId?: number;
    metadata?: Record<string, string | number | boolean>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      level: data.level || AuditLevel.INFO,
      userIdHash: data.userId ? await hashIdentifier(data.userId) : undefined,
      batchId: data.batchId,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success,
      errorMessage: data.errorMessage,
    };

    // In development, log to console
    if (process.env.NODE_ENV === "development") {
      console.log("[Audit]", entry);
    }

    // In production, send to logging service
    // Example with Sentry:
    // Sentry.captureMessage(`Audit: ${eventType}`, {
    //   level: data.level === AuditLevel.ERROR ? 'error' : 'info',
    //   extra: entry,
    // });

    // Example with custom API:
    // await fetch('/api/internal/audit', {
    //   method: 'POST',
    //   body: JSON.stringify(entry),
    // });

    // Store in database for compliance
    // await db.auditLogs.insert(entry);
  } catch (error) {
    // Never throw from audit logging - it should not break app
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  userId: string,
  success: boolean,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent(
    success ? AuditEventType.AUTH_LOGIN : AuditEventType.AUTH_FAILED,
    {
      level: success ? AuditLevel.INFO : AuditLevel.WARNING,
      userId,
      success,
      ipAddress,
      errorMessage: success ? undefined : "Authentication failed",
    }
  );
}

/**
 * Log admin operation
 */
export async function logAdminOperation(
  eventType: AuditEventType,
  adminId: string,
  batchId?: number,
  metadata?: Record<string, string | number | boolean>,
  success: boolean = true
): Promise<void> {
  await logAuditEvent(eventType, {
    level: success ? AuditLevel.INFO : AuditLevel.ERROR,
    userId: adminId,
    batchId,
    metadata,
    success,
  });
}

/**
 * Log data access event (shipping, metadata, results)
 */
export async function logDataAccess(
  eventType: AuditEventType,
  userId: string,
  dataType: string,
  success: boolean
): Promise<void> {
  await logAuditEvent(eventType, {
    level: AuditLevel.INFO,
    userId,
    metadata: { dataType },
    success,
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  eventType: AuditEventType,
  ipAddress: string,
  metadata?: Record<string, string | number | boolean>
): Promise<void> {
  await logAuditEvent(eventType, {
    level: AuditLevel.WARNING,
    ipAddress,
    metadata,
    success: false,
  });
}

/**
 * Log PIN verification attempt
 */
export async function logPinVerification(
  userId: string,
  kitId: string,
  success: boolean
): Promise<void> {
  await logAuditEvent(
    success
      ? AuditEventType.RESULTS_PIN_VERIFY
      : AuditEventType.RESULTS_PIN_FAILED,
    {
      level: success ? AuditLevel.INFO : AuditLevel.WARNING,
      userId,
      metadata: { kitId },
      success,
    }
  );
}

/**
 * Create audit log context for request
 */
export function createAuditContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

/**
 * Query audit logs (admin only)
 * In production, this would query your logging service or database
 */
export async function queryAuditLogs(filters: {
  eventType?: AuditEventType;
  userId?: string;
  batchId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  // TODO: Implement actual query logic
  console.log("Querying audit logs with filters:", filters);

  // Mock response
  return [];
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date
): Promise<string> {
  const logs = await queryAuditLogs({ startDate, endDate });

  // Convert to CSV
  const headers = [
    "timestamp",
    "eventType",
    "level",
    "userIdHash",
    "batchId",
    "success",
    "errorMessage",
  ];

  const rows = logs.map((log) => [
    log.timestamp,
    log.eventType,
    log.level,
    log.userIdHash || "",
    log.batchId?.toString() || "",
    log.success.toString(),
    log.errorMessage || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

  return csv;
}
