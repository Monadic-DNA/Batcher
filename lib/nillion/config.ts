// Nillion (nilDB) Configuration for DNA Batcher
// Stores sensitive data: email, shipping info, metadata, DNA results

export const NILLION_CONFIG = {
  // Nillion authentication service
  nilauthUrl: "https://nilauth.testnet.nillion.com",

  // Nillion public key (for authentication)
  nilauthPublicKey:
    "NILLION_PUBLIC_KEY_PLACEHOLDER", // Will be updated when available

  // nilDB nodes (testnet)
  nodes: [
    "https://nildb-node-1.testnet.nillion.com",
    "https://nildb-node-2.testnet.nillion.com",
    "https://nildb-node-3.testnet.nillion.com",
  ],

  // Collection ID for DNA Batcher data
  collectionId: process.env.NEXT_PUBLIC_NILLION_COLLECTION_ID || "dna-batcher",

  // Data retention policies
  retention: {
    // Shipping data deleted immediately after shipment
    shippingDataTTL: 0,

    // All user data purged 60 days after batch completion
    userDataTTL: 60 * 24 * 60 * 60, // 60 days in seconds
  },
};

// Data schema for nilDB storage
export interface NillionUserData {
  // User identification
  walletAddress: string;
  batchId: number;

  // Personal information (encrypted)
  email?: string;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;

  // Optional metadata (encrypted)
  age?: number;
  sex?: string; // "M" | "F" | "Other"
  ethnicity?: string;

  // Kit registration (encrypted)
  kitId?: string;
  pinHash?: string; // Hash(PIN) - never store raw PIN

  // DNA results (encrypted CSV blob)
  dnaResultsCsv?: string; // Compressed and encrypted

  // Timestamps
  dataCreatedAt: string;
  dataAccessedAt?: string;
  dataPurgeScheduledAt?: string;
}

// Access control
export interface NillionAccessPermissions {
  // User can always read their own data
  userCanRead: true;

  // Admin can read shipping data (only before shipment)
  adminCanReadShipping: boolean;

  // Admin can write results
  adminCanWriteResults: true;

  // Auto-purge after time
  autoPurge: boolean;
  purgeAfterDays: number;
}
