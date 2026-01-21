import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (works with proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to unknown (NextRequest doesn't have .ip property)
  return "unknown";
}

/**
 * Rate limiting middleware
 * Returns null if request is allowed, NextResponse if rate limited
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }
): NextResponse | null {
  const clientId = getClientIdentifier(request);
  const now = Date.now();

  const entry = rateLimitStore.get(clientId);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null; // Allow request
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": entry.resetTime.toString(),
        },
      }
    );
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(clientId, entry);

  return null; // Allow request
}

/**
 * Higher-order function to wrap API routes with rate limiting
 */
export function withRateLimit<T>(
  handler: (request: NextRequest, context: T) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    const rateLimitResponse = rateLimit(request, config);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request, context);
  };
}

/**
 * Different rate limit presets
 */
export const RateLimitPresets = {
  // Strict: 5 requests per minute
  strict: { maxRequests: 5, windowMs: 60000 },

  // Standard: 10 requests per minute
  standard: { maxRequests: 10, windowMs: 60000 },

  // Relaxed: 30 requests per minute
  relaxed: { maxRequests: 30, windowMs: 60000 },

  // Payment: 3 requests per minute (for payment endpoints)
  payment: { maxRequests: 3, windowMs: 60000 },

  // Auth: 5 requests per 5 minutes (for authentication)
  auth: { maxRequests: 5, windowMs: 300000 },
};
