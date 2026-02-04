// Nillion client utilities for DNA Batcher
import type { NillionUserData } from "./config";
import { SecretVaultBuilderClient } from '@nillion/secretvaults';
import { Signer } from '@nillion/nuc';
import { NilauthClient } from '@nillion/nilauth-client';
import { getCollectionId } from './collections';

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

// ============================================================================
// nilDB Client Functions (Admin-Only, Server-Side)
// ============================================================================

/**
 * Initialize Nillion Builder Client (Admin)
 *
 * Builder client has full access to standard collections
 * Used server-side only with admin API key
 */
export async function initNillionClient(): Promise<SecretVaultBuilderClient> {
  // Validate environment variables
  const apiKey = process.env.NILLION_API_KEY;
  const nilauthUrl = process.env.NILLION_NILAUTH_URL;
  const nildbNodes = process.env.NILLION_NILDB_NODES;
  const chainId = process.env.NILLION_CHAIN_ID;

  if (!apiKey) {
    throw new Error('NILLION_API_KEY environment variable is not set');
  }

  if (!nilauthUrl) {
    throw new Error('NILLION_NILAUTH_URL environment variable is not set. Example: https://nilauth.nillion.network');
  }

  if (!nildbNodes) {
    throw new Error('NILLION_NILDB_NODES environment variable is not set. Example: https://node1.url,https://node2.url,https://node3.url');
  }

  // Parse comma-separated node URLs
  const dbsArray = nildbNodes.split(',').map(url => url.trim()).filter(Boolean);

  if (dbsArray.length === 0) {
    throw new Error('NILLION_NILDB_NODES must contain at least one valid URL');
  }

  // Generate a signer for the builder
  const signer = Signer.generate();

  // Create nilauth client for authentication
  const nilauthClient = await NilauthClient.create({
    baseUrl: nilauthUrl,
    chainId: chainId ? parseInt(chainId) : 1, // Default to mainnet if not specified
    apiKey,
  });

  // Initialize builder client
  const client = await SecretVaultBuilderClient.from({
    signer,
    nilauthClient,
    dbs: dbsArray,
    blindfold: {
      operation: 'store', // For storing data with encryption
    },
  });

  // Refresh root token to authenticate
  await client.refreshRootToken();

  return client;
}

/**
 * Wrap encrypted fields with %share marker for automatic encryption
 * nilDB schemas use %share, not %allot
 */
function wrapEncryptedFields(data: Record<string, any>, encryptedFields: string[]): Record<string, any> {
  const wrapped: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (encryptedFields.includes(key)) {
      wrapped[key] = { "%share": value };
    } else {
      wrapped[key] = value;
    }
  }

  return wrapped;
}

/**
 * Unwrap encrypted fields after retrieval
 * nilDB returns encrypted fields as { "%share": value }
 */
function unwrapEncryptedFields(data: Record<string, any>): Record<string, any> {
  const unwrapped: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null && '%share' in value) {
      unwrapped[key] = value['%share'];
    } else {
      unwrapped[key] = value;
    }
  }

  return unwrapped;
}

/**
 * Store data in a nilDB collection
 *
 * @param collectionType - Type of collection (shipping, metadata)
 * @param data - Data object matching the collection schema
 * @returns Record ID of the stored data
 */
export async function storeData(
  collectionType: 'shipping' | 'metadata',
  data: Record<string, any>
): Promise<string> {
  const client = await initNillionClient();
  const collectionId = getCollectionId(collectionType);

  // Define which fields are encrypted for each collection type
  const encryptedFields = collectionType === 'shipping'
    ? ['kitId', 'email', 'name', 'address', 'city', 'state', 'zip', 'country']
    : ['kitId', 'yearOfBirth', 'sexAssignedAtBirth', 'ethnicity'];

  // Wrap encrypted fields with %allot marker
  const wrappedData = wrapEncryptedFields(data, encryptedFields);

  try {
    const result = await client.createStandardData({
      collection: collectionId,
      data: [wrappedData],
    });

    // Extract first created ID from the response
    const firstId = result['node1']?.data?.created?.[0] ||
                    result['node2']?.data?.created?.[0] ||
                    result['node3']?.data?.created?.[0];

    if (!firstId) {
      throw new Error('No record ID returned from createStandardData');
    }

    return firstId;
  } catch (error) {
    console.error(`Failed to store ${collectionType} data:`, error);
    throw error;
  }
}

/**
 * Query data from a nilDB collection
 *
 * @param collectionType - Type of collection (shipping, metadata)
 * @param filter - Optional filter object (empty object fetches all)
 * @returns Array of records
 */
export async function findData(
  collectionType: 'shipping' | 'metadata',
  filter: Record<string, any> = {}
): Promise<any[]> {
  const client = await initNillionClient();
  const collectionId = getCollectionId(collectionType);

  try {
    const result = await client.findData({
      collection: collectionId,
      filter,
    });

    // Unwrap encrypted fields from response
    const records = result.data || [];
    return records.map(record => unwrapEncryptedFields(record));
  } catch (error) {
    console.error(`Failed to find ${collectionType} data:`, error);
    throw error;
  }
}

/**
 * Delete data from a nilDB collection
 *
 * @param collectionType - Type of collection (shipping, metadata)
 * @param filter - Filter object to match records to delete (empty filter = delete all)
 * @returns Number of records deleted
 */
export async function deleteData(
  collectionType: 'shipping' | 'metadata',
  filter: Record<string, any> = {}
): Promise<number> {
  const client = await initNillionClient();
  const collectionId = getCollectionId(collectionType);

  try {
    const result = await client.deleteData({
      collection: collectionId,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    // Extract deletedCount from the response (may vary by node)
    const firstNodeResult = Object.values(result)[0] as any;
    return firstNodeResult?.data?.deletedCount || 0;
  } catch (error) {
    console.error(`Failed to delete ${collectionType} data:`, error);
    throw error;
  }
}

