# Security Documentation

## Overview

The Monadic DNA Batcher implements a comprehensive security model designed to protect user privacy and prevent common web application vulnerabilities. This document outlines the security measures in place and best practices for maintaining them.

## Core Security Principles

### 1. Privacy by Design

- **Zero-Knowledge Architecture**: PINs never leave the client device and are never transmitted to servers
- **Commitment Scheme**: Hash(KitID + PIN) stored on-chain for verification without exposing the PIN
- **End-to-End Encryption**: Sensitive data encrypted with Nillion before storage
- **Automatic Data Deletion**: Results purged 60 days after completion
- **Minimal Data Collection**: Only essential information is collected and stored

### 2. Defense in Depth

Multiple layers of security controls:
1. Client-side validation
2. Server-side validation
3. Rate limiting
4. Authentication and authorization
5. Input sanitization
6. Audit logging
7. Security headers

## Security Features

### PIN Management (`lib/security/pinStorage.ts`)

**Client-Side Only Storage**
- PINs are NEVER transmitted to the server
- Stored locally in browser (localStorage)
- Used only for client-side encryption/decryption operations

**Commitment Hash Creation**
```typescript
// Client creates: Hash(KitID + PIN)
const hash = await createCommitmentHash("KIT-ABC12345", "123456");
// Hash is stored on-chain, PIN stays on client
```

**Security Features**:
- SHA-256 hashing using Web Crypto API
- PIN format validation (exactly 6 digits)
- Kit ID format validation (KIT-XXXXXXXX)
- Secure random PIN generation using `crypto.getRandomValues()`
- Optional PIN hints (user-created reminders, not the PIN itself)

**Best Practices**:
- Always validate PIN format before use
- Clear sensitive data from memory when possible
- Never log PINs or include them in error messages
- Warn users to store PINs securely offline

### Input Validation (`lib/security/validation.ts`)

**Comprehensive Validation Functions**:
- Wallet addresses (0x + 40 hex characters)
- Email addresses (RFC-compliant)
- Phone numbers (international format)
- PINs (6 digits)
- Kit IDs (KIT-XXXXXXXX format)
- Batch IDs (positive integers)
- Amounts (non-negative numbers)
- URLs (http/https only)
- Dates (ISO 8601)
- Ages (18-120)

**Sanitization Functions**:
- String sanitization (remove null bytes, trim, length limit)
- HTML escaping (prevent XSS)
- File name sanitization (prevent path traversal)
- Address data sanitization
- CSV structure validation

**Attack Prevention**:
- SQL injection detection
- XSS pattern detection
- Prototype pollution prevention
- Path traversal prevention

**Usage Example**:
```typescript
import { validateWalletAddress, sanitizeString } from '@/lib/security/validation';

// Validate before processing
if (!validateWalletAddress(address)) {
  throw new Error("Invalid wallet address");
}

// Sanitize user input
const safeName = sanitizeString(userName, 100);
```

### Rate Limiting (`lib/middleware/rateLimit.ts`)

**Features**:
- IP-based client identification
- Configurable request limits and time windows
- Automatic cleanup of expired entries
- HTTP 429 responses with retry-after headers
- Proxy-aware (respects X-Forwarded-For)

**Presets**:
- **Strict**: 5 requests/minute (admin operations)
- **Standard**: 10 requests/minute (general API)
- **Relaxed**: 30 requests/minute (read-only)
- **Payment**: 3 requests/minute (payment endpoints)
- **Auth**: 5 requests/5 minutes (authentication)

**Production Recommendation**:
- Replace in-memory store with Redis for scalability
- Use distributed rate limiting across multiple servers

### Admin Authentication (`lib/middleware/adminAuth.ts`)

**Authorization Flow**:
1. Extract wallet address from request headers
2. Validate address format
3. Check against smart contract `isAdmin()` function
4. Return 403 if not authorized

**Best Practices**:
- Admin addresses stored on-chain (immutable)
- All admin operations logged in audit trail
- Consider implementing 2FA for critical operations
- Regular review of admin access rights

### Audit Logging (`lib/security/auditLog.ts`)

**Privacy-Preserving Design**:
- User IDs are hashed (SHA-256)
- No PII in logs
- Timestamps in ISO 8601 format
- Structured log format for analysis

**Event Categories**:
- Authentication (login, logout, failures)
- Batch operations (join, payment, state changes)
- Admin operations (progress, slash, data access)
- Data operations (store, retrieve, delete)
- Kit operations (registration, shipping)
- Results operations (download, PIN verification)
- Security events (rate limits, invalid input, unauthorized)

**Log Levels**:
- INFO: Normal operations
- WARNING: Suspicious activity (failed auth, rate limits)
- ERROR: Operation failures
- CRITICAL: Security incidents

**Integration Points**:
- Console (development)
- Sentry (production errors)
- Custom logging API (compliance)
- Database (long-term storage)

**Compliance**:
- Export function for audit log retrieval
- Query function for incident investigation
- Retention policy support

### Security Headers (middleware.ts)

**Content Security Policy (CSP)**:
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.dynamic.xyz;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
connect-src 'self' https://*.dynamic.xyz https://*.nillion.network;
frame-ancestors 'none';
upgrade-insecure-requests;
```

**Additional Headers**:
- **X-Frame-Options**: DENY (prevent clickjacking)
- **X-Content-Type-Options**: nosniff (prevent MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (browser XSS filter)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restrict camera, microphone, geolocation
- **Strict-Transport-Security**: Force HTTPS (production only)
- **Cross-Origin policies**: CORP, COEP, COOP

### Smart Contract Security

**Access Control**:
- Ownable pattern for admin functions
- Role-based permissions
- State machine enforcement (can't skip states)

**Economic Security**:
- ReentrancyGuard on payment functions
- Escrow pattern (deposits held until completion)
- Slashing mechanism (1% penalty for late payment)
- Patience timer (6 months grace period)

**Data Integrity**:
- Commitment hashes (verify PIN without exposing it)
- Immutable batch state history
- Event emissions for all state changes

**Best Practices**:
- Professional audit before mainnet deployment
- Test coverage > 95%
- Gas optimization
- Emergency pause functionality (if needed)

## Threat Model

### Client-Side Threats

**XSS (Cross-Site Scripting)**
- Mitigation: CSP headers, HTML escaping, input validation
- Status: ✅ Protected

**CSRF (Cross-Site Request Forgery)**
- Mitigation: Same-origin policy, CORS configuration
- Status: ✅ Protected

**Data Exposure**
- Mitigation: PINs stored client-side only, no sensitive data in localStorage
- Status: ✅ Protected

### Server-Side Threats

**SQL Injection**
- Mitigation: Not applicable (no SQL database), input validation
- Status: ✅ N/A

**API Abuse**
- Mitigation: Rate limiting, authentication, input validation
- Status: ✅ Protected

**Unauthorized Access**
- Mitigation: Admin authentication middleware, smart contract verification
- Status: ✅ Protected

### Network Threats

**Man-in-the-Middle (MITM)**
- Mitigation: HTTPS enforcement (HSTS), TLS 1.3+
- Status: ✅ Protected (production)

**DDoS**
- Mitigation: Rate limiting, Vercel/Cloudflare protection
- Status: ⚠️ Partial (relies on infrastructure)

### Blockchain Threats

**Reentrancy**
- Mitigation: ReentrancyGuard modifier
- Status: ✅ Protected

**Front-Running**
- Mitigation: Limited impact (batching mechanism), commitment scheme
- Status: ✅ Acceptable risk

**Smart Contract Bugs**
- Mitigation: Comprehensive test suite, professional audit required
- Status: ⚠️ Requires audit before mainnet

## Security Checklist

### Before Deployment

- [ ] Professional smart contract audit completed
- [ ] Penetration testing performed
- [ ] Load testing completed
- [ ] Security headers verified
- [ ] Rate limiting configured
- [ ] Admin access list finalized
- [ ] Logging service integrated (Sentry, etc.)
- [ ] SSL certificate installed
- [ ] HSTS enabled
- [ ] Backup and disaster recovery plan
- [ ] Incident response plan documented
- [ ] Privacy policy and terms of service published

### Ongoing Security

- [ ] Regular security updates (dependencies)
- [ ] Monthly access review (admin accounts)
- [ ] Quarterly penetration testing
- [ ] Audit log review (weekly)
- [ ] Incident response drills
- [ ] Backup verification (weekly)
- [ ] SSL certificate renewal (90 days before expiry)
- [ ] Smart contract monitoring (state changes, unusual activity)

## Incident Response

### Security Incident

1. **Detect**: Monitor audit logs, error rates, unusual patterns
2. **Contain**: Rate limit, block IPs, disable affected features
3. **Investigate**: Review logs, identify attack vector
4. **Remediate**: Patch vulnerability, update security measures
5. **Communicate**: Notify affected users (if applicable)
6. **Document**: Post-mortem analysis, update procedures

### Data Breach

1. **Immediate**: Shut down affected systems
2. **Assess**: Determine scope and impact
3. **Notify**: Legal requirements (GDPR, CCPA, etc.)
4. **Remediate**: Fix vulnerability, enhance security
5. **Monitor**: Increased vigilance for follow-up attacks

### Contact

For security vulnerabilities, please report to:
- Email: security@monadicdna.com
- PGP Key: [Public key]
- Bug Bounty: [If applicable]

## Best Practices for Developers

### 1. Never Trust User Input
```typescript
// ❌ Bad
const address = request.body.address;
await contract.transfer(address, amount);

// ✅ Good
const address = request.body.address;
if (!validateWalletAddress(address)) {
  throw new Error("Invalid address");
}
const sanitized = sanitizeString(address, 42);
await contract.transfer(sanitized, amount);
```

### 2. Always Use Rate Limiting
```typescript
// ❌ Bad
export async function POST(request: NextRequest) { ... }

// ✅ Good
export const POST = withRateLimit(handlePOST, RateLimitPresets.standard);
```

### 3. Log Security Events
```typescript
// ✅ Good
import { logAuditEvent, AuditEventType } from '@/lib/security/auditLog';

try {
  await performSensitiveOperation();
  await logAuditEvent(AuditEventType.ADMIN_ACCESS, {
    userId: adminAddress,
    success: true,
  });
} catch (error) {
  await logAuditEvent(AuditEventType.ADMIN_ACCESS, {
    userId: adminAddress,
    success: false,
    errorMessage: error.message,
  });
  throw error;
}
```

### 4. Validate on Both Client and Server
```typescript
// Client-side (UX)
if (!validatePin(pin)) {
  setError("PIN must be 6 digits");
  return;
}

// Server-side (Security)
if (!validatePin(request.body.pin)) {
  return new Response("Invalid PIN", { status: 400 });
}
```

### 5. Use Secure Randomness
```typescript
// ❌ Bad
const pin = Math.random().toString().slice(2, 8);

// ✅ Good
import { generateSecurePin } from '@/lib/security/pinStorage';
const pin = generateSecurePin(); // Uses crypto.getRandomValues()
```

## Compliance

### GDPR (EU)

- ✅ Right to access (audit logs, data export)
- ✅ Right to erasure (data purge after 60 days)
- ✅ Data minimization (only essential data collected)
- ✅ Privacy by design (PIN commitment scheme)
- ✅ Data breach notification (incident response plan)

### HIPAA (US)

⚠️ **Note**: DNA data may be considered PHI. Consult legal counsel before claiming HIPAA compliance.

- ✅ Access controls (admin authentication)
- ✅ Audit trails (comprehensive logging)
- ✅ Encryption (Nillion end-to-end encryption)
- ⚠️ Business Associate Agreements (required with Nillion, Stripe)
- ⚠️ Physical safeguards (infrastructure provider responsibility)

### CCPA (California)

- ✅ Right to know (transparency in data collection)
- ✅ Right to delete (automatic purge, manual delete available)
- ✅ Right to opt-out (privacy-preserving by default)

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

## Version History

- **v1.0** (2025-01-21): Initial security implementation
  - PIN management system
  - Input validation and sanitization
  - Rate limiting middleware
  - Admin authentication
  - Audit logging
  - Security headers
