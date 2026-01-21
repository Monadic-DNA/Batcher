/**
 * Client-side PIN storage utilities
 * IMPORTANT: PINs are NEVER transmitted to the server
 * They are stored locally and used only for client-side encryption/decryption
 */

const PIN_STORAGE_KEY = "dna_batcher_pin_hints";

export interface PinHint {
  kitId: string;
  hint?: string; // Optional user-created hint
  createdAt: number;
  lastUsed?: number;
}

/**
 * Store PIN hint locally (NOT the actual PIN)
 * This helps users remember which PIN they used for which kit
 */
export function storePinHint(kitId: string, hint?: string): void {
  try {
    const hints = getPinHints();
    const existingIndex = hints.findIndex((h) => h.kitId === kitId);

    const newHint: PinHint = {
      kitId,
      hint,
      createdAt: Date.now(),
    };

    if (existingIndex >= 0) {
      hints[existingIndex] = newHint;
    } else {
      hints.push(newHint);
    }

    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(hints));
  } catch (error) {
    console.error("Failed to store PIN hint:", error);
  }
}

/**
 * Get all PIN hints
 */
export function getPinHints(): PinHint[] {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to get PIN hints:", error);
    return [];
  }
}

/**
 * Get PIN hint for a specific kit
 */
export function getPinHint(kitId: string): PinHint | null {
  const hints = getPinHints();
  return hints.find((h) => h.kitId === kitId) || null;
}

/**
 * Update last used timestamp
 */
export function markPinUsed(kitId: string): void {
  try {
    const hints = getPinHints();
    const hint = hints.find((h) => h.kitId === kitId);
    if (hint) {
      hint.lastUsed = Date.now();
      localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(hints));
    }
  } catch (error) {
    console.error("Failed to mark PIN as used:", error);
  }
}

/**
 * Clear all PIN hints (for logout/privacy)
 */
export function clearAllPinHints(): void {
  try {
    localStorage.removeItem(PIN_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear PIN hints:", error);
  }
}

/**
 * Clear PIN hint for specific kit
 */
export function clearPinHint(kitId: string): void {
  try {
    const hints = getPinHints();
    const filtered = hints.filter((h) => h.kitId !== kitId);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to clear PIN hint:", error);
  }
}

/**
 * Validate PIN format
 */
export function validatePinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Validate Kit ID format
 */
export function validateKitIdFormat(kitId: string): boolean {
  return /^KIT-[A-Z0-9]{8}$/.test(kitId);
}

/**
 * WARNING: This is for client-side commitment hash creation only
 * The PIN should NEVER be sent to the server
 */
export async function createCommitmentHash(
  kitId: string,
  pin: string
): Promise<string> {
  // Validate inputs
  if (!validateKitIdFormat(kitId)) {
    throw new Error("Invalid Kit ID format");
  }

  if (!validatePinFormat(pin)) {
    throw new Error("Invalid PIN format - must be 6 digits");
  }

  // Create commitment: Hash(KitID + PIN)
  const message = `${kitId}${pin}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Use Web Crypto API for SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Return as 0x-prefixed hex for smart contract
  return `0x${hashHex}`;
}

/**
 * Verify a PIN against a commitment hash
 */
export async function verifyCommitment(
  kitId: string,
  pin: string,
  expectedHash: string
): Promise<boolean> {
  try {
    const computedHash = await createCommitmentHash(kitId, pin);
    return computedHash.toLowerCase() === expectedHash.toLowerCase();
  } catch (error) {
    console.error("Failed to verify commitment:", error);
    return false;
  }
}

/**
 * Generate a secure random 6-digit PIN
 * Uses Web Crypto API for cryptographically secure randomness
 */
export function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Generate number between 000000 and 999999
  const pin = (array[0] % 1000000).toString().padStart(6, "0");
  return pin;
}

/**
 * Check if browser supports Web Crypto API
 */
export function isCryptoSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.digest === "function"
  );
}

/**
 * Securely clear sensitive data from memory
 * Note: This doesn't guarantee memory is wiped, but it helps
 */
export function clearSensitiveString(str: string): void {
  // Overwrite the string in memory (best effort)
  for (let i = 0; i < str.length; i++) {
    str = str.substring(0, i) + "0" + str.substring(i + 1);
  }
}
