# Nillion nilDB Setup Guide

## Important: How nilDB Works

nilDB is **not** a key-value store. It's a **document database** (similar to MongoDB) with automatic encryption.

### Key Concepts:

1. **Collections** = Database tables with schemas
2. **Collection IDs** = UUIDs (not human-readable names)
3. **Records** = Documents stored in collections
4. **Queries** = Admin-managed via API key (standard collections)
5. **Encrypted Fields** = Marked with `%allot` in schema

### Why Standard Collections?

**Dynamic Wallet Incompatibility**: This application uses Dynamic embedded wallets for participant login. These wallets cannot sign Nillion transactions (Nillion requires specific signing formats that Dynamic wallets don't support). Therefore, participants cannot directly create or own nilDB records.

**Solution**: Admin creates all records on behalf of participants using the API key. Collections are "standard" type where the admin has full access to manage all records.

## ❌ What We Were Doing Wrong:

```typescript
// WRONG - nilDB doesn't use arbitrary keys
const key = `shipping_1_0x742d35cc6634c0532925a3b844bc9e7595f0bfb8`;
fetch('/store', { key, data });

// WRONG - nilDB doesn't support key patterns
fetch('/query', { keyPattern: "shipping_1_*" });

// WRONG - Using walletAddress/batchId as query fields
fetch('/findData', {
  collection: "uuid-of-shipping-collection",
  filter: { batchId: 1, walletAddress: "0x..." }
});
```

## ✅ Correct Approach:

```typescript
// CORRECT - Admin creates records on behalf of participants
fetch('/createData', {
  collection: "uuid-of-shipping-collection",
  data: [{
    walletAddress: userWalletAddress, // Store as regular field for filtering
    kitId: "ABC12345XYZ", // Automatically encrypted
    email: "user@example.com", // Automatically encrypted
    // ... rest of fields
  }]
});

// CORRECT - Admin queries with filters (standard collections)
// Admin manages all records via API key
// Application layer enforces who can see what
fetch('/findData', {
  collection: "uuid-of-shipping-collection",
  filter: { walletAddress: userWalletAddress } // Filter in application
});
```

## Setup Steps

### Step 1: Install nilDB SDK

```bash
npm install @nillion/client-blindcompute
```

### Step 2: Create Collections

Create two collections using the schemas provided:

**Note:** Kit registration is stored on-chain in the BatchStateMachine.sol smart contract, NOT in nilDB.

#### Collection 1: Shipping Data

```typescript
import { randomUUID } from 'crypto';

const shippingCollection = {
  _id: randomUUID(), // Generates UUID like "a3bb189e-8bf9-3888-9912-ace4e6543002"
  name: "DNA Batcher - Shipping Data",
  type: "standard", // Admin manages all records
  schema: {
    // Query fields (not encrypted) - for filtering/sorting
    walletAddress: { type: 'string' }, // For filtering by participant
    storedAt: { type: 'string' },

    // Encrypted fields (marked with %allot)
    kitId: { type: '%allot' },
    email: { type: '%allot' },
    name: { type: '%allot' },
    address: { type: '%allot' },
    city: { type: '%allot' },
    state: { type: '%allot' },
    zip: { type: '%allot' },
    country: { type: '%allot' },
  }
};

// Create the collection (admin API key required)
await nillionClient.createCollection(shippingCollection);
console.log('Shipping collection ID:', shippingCollection._id);
```

#### Collection 2: Metadata

```typescript
const metadataCollection = {
  _id: randomUUID(),
  name: "DNA Batcher - Demographic Metadata",
  type: "standard", // Admin manages all records
  schema: {
    // Query fields (not encrypted) - for filtering/sorting
    walletAddress: { type: 'string' }, // For filtering by participant
    submittedAt: { type: 'string' },

    // Encrypted fields
    kitId: { type: '%allot' },
    yearOfBirth: { type: '%allot' },
    sexAssignedAtBirth: { type: '%allot' },
    ethnicity: { type: '%allot' },
  }
};

await nillionClient.createCollection(metadataCollection);
console.log('Metadata collection ID:', metadataCollection._id);
```


### Step 3: Update Environment Variables

Copy the UUIDs returned from Step 2 into your `.env.local`:

```bash
# Replace these placeholder UUIDs with your actual collection IDs
NILLION_SHIPPING_COLLECTION_ID=a3bb189e-8bf9-3888-9912-ace4e6543002
NILLION_METADATA_COLLECTION_ID=b4cc289f-9cga-4999-0123-bdf5f7654113

# Kit registration is stored on-chain in BatchStateMachine.sol
# NILLION_KITS_COLLECTION_ID is NOT needed
```

### Step 4: Verify Setup

Test that collections were created correctly:

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

// Test querying (should return empty array initially)
const collectionId = getCollectionId('shipping');

const records = await nillionClient.findData({
  collection: collectionId
});

console.log('Shipping records (owned by current user):', records);
```

## Usage Examples

### Store Shipping Data (Admin creates on behalf of participant)

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

const collectionId = getCollectionId('shipping');

// Admin API creates record for participant (Dynamic wallet can't sign)
await nillionClient.createData({
  collection: collectionId,
  data: [{
    walletAddress: userWalletAddress,  // Store for filtering
    kitId: "ABC12345XYZ",  // Automatically encrypted
    email: "user@example.com",
    name: "John Doe",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    storedAt: new Date().toISOString(),
  }]
});
```

### Query User's Own Records (Application enforces filter)

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

const collectionId = getCollectionId('shipping');

// Admin API queries with filter for specific user
// Application layer enforces who can see what data
const records = await nillionClient.findData({
  collection: collectionId,
  filter: { walletAddress: userWalletAddress }
});

// records contains only the specified user's shipping data
```

### Query All Records (Admin)

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

const collectionId = getCollectionId('shipping');

// Admin API queries all records (no filter)
const allRecords = await nillionClient.findData({
  collection: collectionId
  // No filter = all records
});

// allRecords contains all shipping records across all users
```

### Delete Records (Admin)

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

const collectionId = getCollectionId('shipping');

// Delete all shipping records (admin only)
const result = await nillionClient.deleteData({
  collection: collectionId
});

console.log('Deleted', result.deletedCount, 'records');
```

## Important Notes

### 1. Encrypted vs Query Fields

- **Encrypted fields** (`%allot`): Cannot be queried or filtered, fully encrypted (kitId, email, name, etc.)
- **Query fields** (regular types): Can be filtered, not encrypted (walletAddress, storedAt, submittedAt, pinHash)
- **Privacy Model**: Sensitive data (PII) is encrypted via `%allot`, wallet addresses stored as plain text for filtering
- **Data at Rest**: All data is encrypted in nilDB storage, including query fields

### 2. Access Control (Standard Collections)

nilDB collections are "standard" type with admin-managed access:
- **Admin API Key**: Full access to all records (create, read, update, delete)
- **Application Layer**: Code enforces who can see what by filtering queries
- **No Per-Record Ownership**: All records managed by admin, not owned by individual users
- **Why**: Dynamic wallets cannot sign Nillion transactions, so admin creates records on behalf of participants

### 3. Querying and Filtering

Admin API key has full access, application enforces privacy:
- **User Queries**: Filter by `walletAddress` to get only that user's records
- **Admin Queries**: No filter to get all records across all users
- **Batch Queries**: Can add `batchId` as query field if needed for filtering
- **Privacy**: Encrypted fields (kitId, email, etc.) cannot be queried, only decrypted after retrieval

### 4. SDK vs REST API

Currently, the codebase uses placeholder REST API calls. For production:

```typescript
// Install SDK
npm install @nillion/client-blindcompute

// Import and use
import { NillionClient } from '@nillion/client-blindcompute';

const client = new NillionClient({
  apiUrl: process.env.NEXT_PUBLIC_NILLION_API_URL,
  apiKey: process.env.NILLION_API_KEY,
});
```

### 5. Migration from Owned Collections

If you previously used "owned" collections:

1. **Change collection type**: `"type": "owned"` → `"type": "standard"`
2. **Add walletAddress field**: Add `walletAddress: { type: 'string' }` as a query field
3. **Remove owner parameter**: Change `createData({ owner: wallet, ... })` → `createData({ data: [{ walletAddress: wallet, ... }] })`
4. **Add filters to queries**: Change `findData({ collection })` → `findData({ collection, filter: { walletAddress } })`
5. **Update access model**: Remove delegation/ACL logic, admin API key has full access
6. **Application-layer security**: Enforce privacy in code, not via nilDB ownership

## Files Updated

| File | Purpose |
|------|---------|
| `/lib/nillion/collections.ts` | Collection IDs and query builders |
| `/lib/nillion/schemas/*.json` | JSON schemas for reference |
| `/app/api/admin/shipping/route.ts` | Updated to use findData() |
| `/app/api/admin/shipping/delete/route.ts` | Updated to use deleteData() |
| `.env.local.example` | Added collection ID env vars |
| `/scripts/setup-nillion-collections.ts` | Template for creating collections |

## Documentation References

- **nilDB Quickstart**: https://docs.nillion.com/blind-computer/build/storage/quickstart
- **TypeScript SDK Docs**: https://docs.nillion.com/blind-computer/build/storage/ts-docs

## Troubleshooting

### Error: "Collection not found"
- Make sure you created the collections in Step 2
- Verify the UUIDs in .env.local match the created collection IDs

### Error: "Cannot query encrypted field"
- Encrypted fields (%allot) cannot be used in filters
- Only `storedAt`, `submittedAt`, `pinHash`, and `registeredAt` can be used for filtering
- Remember: `kitId` is encrypted and cannot be queried directly

### Empty results when querying
- Collections start empty
- Add test data using createData() (via admin API)
- Remember: Application must filter by walletAddress to show user-specific data
- Admin API sees all records by default (no filter)

### Cannot query by kitId
- kitId is encrypted (%allot) and cannot be used in filters
- Use walletAddress or other query fields for filtering
- Decrypt kitId after retrieval if needed for display

## Next Steps

1. Run `/scripts/setup-nillion-collections.ts` to generate UUIDs
2. Create collections using nilDB SDK
3. Update `.env.local` with real collection IDs
4. Test storing/retrieving a shipping record
5. Integrate with the admin UI
