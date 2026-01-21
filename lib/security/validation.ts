/**
 * Input validation and sanitization utilities
 * Prevents injection attacks and ensures data integrity
 */

/**
 * Validate Ethereum wallet address
 */
export function validateWalletAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  if (email.length > 254) return false; // RFC 5321

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (international format)
 */
export function validatePhone(phone: string): boolean {
  if (typeof phone !== "string") return false;
  // Allow + prefix and 7-15 digits
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, ""));
}

/**
 * Validate PIN (6 digits)
 */
export function validatePin(pin: string): boolean {
  if (typeof pin !== "string") return false;
  return /^\d{6}$/.test(pin);
}

/**
 * Validate Kit ID format
 */
export function validateKitId(kitId: string): boolean {
  if (typeof kitId !== "string") return false;
  return /^KIT-[A-Z0-9]{8}$/.test(kitId);
}

/**
 * Validate batch ID
 */
export function validateBatchId(batchId: number | string): boolean {
  const num = typeof batchId === "string" ? parseInt(batchId, 10) : batchId;
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}

/**
 * Validate amount (in cents)
 */
export function validateAmount(amount: number | string): boolean {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return !isNaN(num) && num >= 0 && Number.isFinite(num);
}

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== "string") return "";

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize HTML input - escape HTML entities
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";

  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize file name - remove path traversal and dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== "string") return "";

  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "");

  // Remove directory separators
  sanitized = sanitized.replace(/[/\\]/g, "");

  // Remove dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    const parts = sanitized.split(".");
    const ext = parts.pop() || "";
    const name = parts.join(".");
    sanitized = name.substring(0, 255 - ext.length - 1) + "." + ext;
  }

  return sanitized;
}

/**
 * Validate URL
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    // Only allow http and https
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate date string (ISO 8601)
 */
export function validateDateString(dateStr: string): boolean {
  if (typeof dateStr !== "string") return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Sanitize postal code
 */
export function sanitizePostalCode(postalCode: string): string {
  if (typeof postalCode !== "string") return "";

  // Allow alphanumeric, spaces, and hyphens
  return postalCode.replace(/[^a-zA-Z0-9\s-]/g, "").trim().substring(0, 20);
}

/**
 * Validate age
 */
export function validateAge(age: number | string): boolean {
  const num = typeof age === "string" ? parseInt(age, 10) : age;
  return !isNaN(num) && num >= 18 && num <= 120 && Number.isInteger(num);
}

/**
 * Sanitize metadata field
 */
export function sanitizeMetadata(
  value: string | number | undefined,
  type: "string" | "number"
): string | number | undefined {
  if (value === undefined || value === null) return undefined;

  if (type === "number") {
    const num = typeof value === "string" ? parseInt(value, 10) : value;
    return isNaN(num) ? undefined : num;
  }

  return sanitizeString(String(value), 100);
}

/**
 * Validate CSV data structure
 */
export function validateCsvStructure(csvContent: string): {
  valid: boolean;
  error?: string;
} {
  if (typeof csvContent !== "string") {
    return { valid: false, error: "CSV content must be a string" };
  }

  const lines = csvContent.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    return { valid: false, error: "CSV must have at least a header and one data row" };
  }

  const headerCount = lines[0].split(",").length;

  for (let i = 1; i < lines.length; i++) {
    const columnCount = lines[i].split(",").length;
    if (columnCount !== headerCount) {
      return {
        valid: false,
        error: `Row ${i + 1} has ${columnCount} columns but header has ${headerCount}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Rate limit key validation
 */
export function validateRateLimitKey(key: string): boolean {
  if (typeof key !== "string") return false;
  // Allow alphanumeric, dots, hyphens, underscores, colons
  return /^[a-zA-Z0-9._:-]+$/.test(key) && key.length <= 200;
}

/**
 * Sanitize address fields
 */
export interface AddressData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function sanitizeAddress(data: Partial<AddressData>): AddressData {
  return {
    name: sanitizeString(data.name || "", 100),
    address: sanitizeString(data.address || "", 200),
    city: sanitizeString(data.city || "", 100),
    state: sanitizeString(data.state || "", 50),
    zip: sanitizePostalCode(data.zip || ""),
    country: sanitizeString(data.country || "", 100),
  };
}

/**
 * Check for SQL injection patterns (extra security layer)
 */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== "string") return false;

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /('|(--)|;|\/\*|\*\/|xp_|sp_)/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function containsXss(input: string): boolean {
  if (typeof input !== "string") return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive input validation for API requests
 */
export function validateApiInput(input: unknown): {
  valid: boolean;
  error?: string;
} {
  // Check for null/undefined
  if (input === null || input === undefined) {
    return { valid: false, error: "Input cannot be null or undefined" };
  }

  // Check for objects
  if (typeof input === "object") {
    // Check for prototype pollution attempts
    if ("__proto__" in input || "constructor" in input || "prototype" in input) {
      return { valid: false, error: "Invalid object properties detected" };
    }
  }

  // Check for strings
  if (typeof input === "string") {
    if (containsSqlInjection(input)) {
      return { valid: false, error: "Potential SQL injection detected" };
    }

    if (containsXss(input)) {
      return { valid: false, error: "Potential XSS attack detected" };
    }
  }

  return { valid: true };
}
