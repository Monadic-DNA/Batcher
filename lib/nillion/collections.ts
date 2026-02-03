/**
 * Nillion nilDB Collection Configuration
 *
 * All collections are "standard" type - admin manages all records via API key.
 * nilDB collections use UUIDs as identifiers.
 * Collections must be created using the nilDB SDK before use.
 *
 * Access Control Model:
 * - Standard collections allow admin full read/write/delete access to all records
 * - Admin creates records on behalf of participants (participants use Dynamic wallets
 *   which are not compatible with Nillion's signing requirements)
 * - Application layer enforces privacy by controlling who sees what data
 * - Encryption via %allot ensures data is protected at rest
 *
 * Important: These are placeholder UUIDs - you must create collections
 * and replace these with the actual collection IDs returned by nilDB.
 */

export const NILLION_COLLECTIONS = {
  /**
   * Shipping Data Collection (Standard)
   * Admin-managed: Admin creates records when participants submit shipping info
   * Stores encrypted shipping addresses for kit delivery
   * Query by: storedAt (timestamp)
   * TTL: 7 days (deleted after kits shipped)
   *
   * REPLACE WITH YOUR ACTUAL COLLECTION ID AFTER CREATION
   */
  SHIPPING: process.env.NILLION_SHIPPING_COLLECTION_ID || "00000000-0000-0000-0000-000000000001",

  /**
   * Metadata Collection (Standard)
   * Admin-managed: Admin creates records when participants submit demographic data
   * Stores optional demographic metadata for analysis
   * Query by: submittedAt (timestamp)
   * TTL: 60 days (deleted after batch completion)
   *
   * REPLACE WITH YOUR ACTUAL COLLECTION ID AFTER CREATION
   */
  METADATA: process.env.NILLION_METADATA_COLLECTION_ID || "00000000-0000-0000-0000-000000000002",
} as const;

/**
 * Get the collection ID for a specific data type
 */
export function getCollectionId(dataType: "shipping" | "metadata"): string {
  const collectionMap = {
    shipping: NILLION_COLLECTIONS.SHIPPING,
    metadata: NILLION_COLLECTIONS.METADATA,
  };
  return collectionMap[dataType];
}

/**
 * Build a query to find records by timestamp
 *
 * Standard collections: Admin has access to all records, can filter by any non-encrypted field
 *
 * @param field - The timestamp field name (e.g., 'storedAt', 'submittedAt', 'registeredAt')
 * @param timestamp - Optional ISO timestamp string to filter by
 * @returns Filter object for nilDB query
 */
export function buildTimestampQuery(field: string, timestamp?: string): Record<string, any> {
  if (!timestamp) return {};
  return { [field]: timestamp };
}

/**
 * Build an empty filter to fetch all records
 *
 * Standard collections: Admin can fetch all records without filters
 * Application layer is responsible for controlling which records users can see
 *
 * @returns Empty filter object
 */
export function buildAllRecordsQuery(): Record<string, any> {
  return {};
}

/**
 * Collection metadata for reference
 */
export const COLLECTION_METADATA = {
  [NILLION_COLLECTIONS.SHIPPING]: {
    type: "standard",
    ttl: 604800, // 7 days in seconds
    description: "Shipping addresses for kit delivery (admin-managed)",
    encryptedFields: ["kitId", "email", "name", "address", "city", "state", "zip", "country"],
    queryFields: ["storedAt"],
    accessControl: "Admin creates/reads/deletes all records via API key",
  },
  [NILLION_COLLECTIONS.METADATA]: {
    type: "standard",
    ttl: 5184000, // 60 days in seconds
    description: "Optional demographic metadata (admin-managed)",
    encryptedFields: ["kitId", "yearOfBirth", "sexAssignedAtBirth", "ethnicity"],
    queryFields: ["submittedAt"],
    accessControl: "Admin creates/reads records via API key",
  },
} as const;
