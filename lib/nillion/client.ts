// Nillion client utilities for DNA Batcher
import type { NillionUserData } from "./config";

/**
 * Encrypt data before storing in nilDB
 * Note: This is a placeholder - actual encryption happens in nilDB
 */
export function prepareDataForStorage(data: Partial<NillionUserData>): string {
  // nilDB handles encryption automatically
  // We just need to serialize the data
  return JSON.stringify(data);
}

/**
 * Decrypt data retrieved from nilDB
 * Note: This is a placeholder - actual decryption requires user's PIN
 */
export function decryptDataFromStorage(
  encryptedData: string
): Partial<NillionUserData> {
  try {
    return JSON.parse(encryptedData);
  } catch (error) {
    console.error("Failed to parse nilDB data:", error);
    throw new Error("Invalid data format");
  }
}

/**
 * Hash PIN for commitment
 * Never store raw PINs - only store Hash(KitID + PIN)
 */
export function createCommitmentHash(kitId: string, pin: string): string {
  // TODO: Use Web Crypto API for hashing in production
  // const encoder = new TextEncoder();
  // const data = encoder.encode(`${kitId}:${pin}`);
  // const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // For now, we'll use a placeholder
  return `commitment_${kitId}_${pin}`;
}

/**
 * Verify PIN against commitment hash
 */
export function verifyCommitmentHash(
  kitId: string,
  pin: string,
  storedHash: string
): boolean {
  const computedHash = createCommitmentHash(kitId, pin);
  return computedHash === storedHash;
}

/**
 * Compress CSV data before storing
 */
export async function compressCsvData(csvContent: string): Promise<string> {
  // Use browser's CompressionStream API if available
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([csvContent]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
    const compressedBlob = await new Response(compressedStream).blob();
    const buffer = await compressedBlob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  // Fallback: just base64 encode
  return btoa(csvContent);
}

/**
 * Decompress CSV data after retrieval
 */
export async function decompressCsvData(
  compressedData: string
): Promise<string> {
  // Use browser's DecompressionStream API if available
  if (typeof DecompressionStream !== "undefined") {
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(
      new DecompressionStream("gzip")
    );
    const decompressedBlob = await new Response(decompressedStream).blob();
    return await decompressedBlob.text();
  }

  // Fallback: just base64 decode
  return atob(compressedData);
}

/**
 * Generate a secure random PIN (6 digits)
 */
export function generateSecurePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = (array[0] % 1000000).toString().padStart(6, "0");
  return pin;
}

/**
 * Validate PIN format
 */
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/**
 * Validate Kit ID format
 */
export function isValidKitId(kitId: string): boolean {
  // Kit IDs should be alphanumeric, 8-16 characters
  return /^[A-Z0-9]{8,16}$/.test(kitId.toUpperCase());
}
