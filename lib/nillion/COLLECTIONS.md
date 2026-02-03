# Nillion nilDB Collections for DNA Batcher

## Overview

The DNA Batcher application uses **two separate collections** in Nillion nilDB to organize different types of encrypted data. All collections use **standard type with admin-managed access** where the admin API key creates and manages all records on behalf of participants.

**Note:** Kit registration is stored on-chain in the BatchStateMachine.sol smart contract, NOT in nilDB.

## Collection IDs

| Collection ID | Purpose | Primary Identifier | TTL |
|---------------|---------|-------------------|-----|
| `dna-batcher-shipping` | Shipping addresses | `kitId` (encrypted) | 7 days |
| `dna-batcher-metadata` | Demographic data | `kitId` (encrypted) | 60 days |

**Note:** Kit registration is stored on-chain in BatchStateMachine.sol. The `kitId` field is used to link nilDB records to on-chain kit registrations.

## Important Schema Changes

### What Changed:
1. **Changed** collection type from `owned` → `standard`
2. **Added** `walletAddress` as a query field (for filtering by participant)
3. **Kept** `kitId` as the primary identifier (encrypted with `%allot`)
4. **Changed** `retrievedAt` → `storedAt` in shipping schema
5. **Changed** `age` → `yearOfBirth` in metadata schema
6. **Changed** `sex` → `sexAssignedAtBirth` in metadata schema

### Why These Changes:
- **Dynamic Wallet Incompatibility**: Dynamic embedded wallets cannot sign Nillion transactions
- **Admin-Managed**: Admin API key creates all records on behalf of participants
- **Application-Layer Security**: Code enforces who can see what data via `walletAddress` filtering
- **Privacy-First**: `kitId` and PII remain encrypted via `%allot`, only accessible after decryption
- **No Per-Record Ownership**: All records managed by admin, not owned by individual users

## Why Separate Collections?

Collections in Nillion are similar to database tables - they provide:

1. **Namespace isolation** - Shipping data can't accidentally be queried as metadata
2. **Different access policies** - Shipping data is admin-only, metadata could be researcher-accessible
3. **Different TTLs** - Shipping deleted after 7 days, metadata after 60 days
4. **Better organization** - Clear separation of concerns
5. **Independent scaling** - Each collection can be managed separately

## Creating Collections in Nillion

You need to create these two collections in your Nillion dashboard before the app can use them.

### 1. Create `dna-batcher-shipping` Collection

**Settings**:
- Collection Name: `DNA Batcher - Shipping Data`
- Collection Type: `standard`
- Description: Encrypted shipping information for DNA test kit delivery
- TTL: 604800 seconds (7 days)
- Query Fields: `walletAddress`, `storedAt`
- Encrypted Fields: `kitId`, `email`, `name`, `address`, `city`, `state`, `zip`, `country`

**Schema**: See `schemas/shipping.nildb.json`

**Access Control**:
- Standard collection - admin manages all records via API key
- Application filters queries by `walletAddress` to enforce privacy
- No per-record ownership

### 2. Create `dna-batcher-metadata` Collection

**Settings**:
- Collection Name: `DNA Batcher - Demographic Metadata`
- Collection Type: `standard`
- Description: Optional demographic metadata for improved DNA analysis
- TTL: 5184000 seconds (60 days)
- Query Fields: `walletAddress`, `submittedAt`
- Encrypted Fields: `kitId`, `yearOfBirth`, `sexAssignedAtBirth`, `ethnicity`

**Schema**: See `schemas/metadata.nildb.json`

**Access Control**:
- Standard collection - admin manages all records via API key
- Application filters queries by `walletAddress` to enforce privacy
- No per-record ownership


## Using Collections in Code

### Import the collections module:
```typescript
import { getCollectionId } from "@/lib/nillion/collections";
```

### Store data (Admin creates on behalf of participant):
```typescript
const collectionId = getCollectionId('shipping');

// Admin API creates record for participant
await nillionClient.createData({
  collection: collectionId,
  data: [{
    walletAddress: userWalletAddress,  // For filtering
    kitId: "ABC12345XYZ",  // Automatically encrypted
    email: "user@example.com",
    name: "John Doe",
    address: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    storedAt: new Date().toISOString()
  }]
});
```

### Query user's own data (Application enforces filter):
```typescript
const collectionId = getCollectionId('shipping');

// Application filters by user's wallet address
const records = await nillionClient.findData({
  collection: collectionId,
  filter: { walletAddress: userWalletAddress }
});
```

### Query all data (Admin):
```typescript
const collectionId = getCollectionId('shipping');

// Admin gets all records (no filter)
const allRecords = await nillionClient.findData({
  collection: collectionId
});
```

### Delete all data (Admin):
```typescript
const collectionId = getCollectionId('shipping');

// Admin deletes all records
const result = await nillionClient.deleteData({
  collection: collectionId
});

console.log('Deleted', result.deletedCount, 'records');
```

## Collection Metadata

The `collections.ts` file exports metadata for each collection:

```typescript
import { COLLECTION_METADATA, getCollectionId } from "@/lib/nillion/collections";

const shippingId = getCollectionId('shipping');
console.log(COLLECTION_METADATA[shippingId]);
// {
//   ttl: 604800,
//   description: "Shipping addresses for kit delivery",
//   encryptedFields: ["kitId", "email", "name", "address", "city", "state", "zip", "country"],
//   queryFields: ["storedAt"]
// }
```

## File Locations

| File | Purpose |
|------|---------|
| `/lib/nillion/collections.ts` | Collection IDs and helper functions |
| `/lib/nillion/schemas/shipping.nildb.json` | Shipping data nilDB schema |
| `/lib/nillion/schemas/metadata.nildb.json` | Metadata nilDB schema |
| `/lib/nillion/schemas/README.md` | Schema documentation |
| `/lib/nillion/COLLECTIONS.md` | This file - collection overview |

## Migration from Owned Collections

If you previously used "owned" collections:

1. **Change collection type**: Update schemas from `"type": "owned"` → `"type": "standard"`
2. **Add walletAddress field**: Add `walletAddress: { type: 'string' }` as a query field in all schemas
3. **Remove owner parameter**: Change `createData({ owner: wallet, data: [...] })` → `createData({ data: [{ walletAddress: wallet, ... }] })`
4. **Add filters to queries**: Change `findData({ collection })` → `findData({ collection, filter: { walletAddress } })`
5. **Update access control**: Remove delegation/ACL logic - admin API key has full access
6. **Application-layer security**: Enforce privacy in application code, not via nilDB ownership

## API Endpoints Using Collections

| API Route | Collection Used |
|-----------|-----------------|
| `/api/admin/shipping` | `dna-batcher-shipping` |
| `/api/admin/shipping/delete` | `dna-batcher-shipping` |
| `/api/nillion/store` (future) | All three |
| `/api/nillion/retrieve` (future) | All three |

## Testing

Test that collections are created correctly using the nilDB SDK:

```typescript
import { getCollectionId } from '@/lib/nillion/collections';

// Test shipping collection
const shippingId = getCollectionId('shipping');

// Store test data (admin creates on behalf of user)
await nillionClient.createData({
  collection: shippingId,
  data: [{
    walletAddress: "0xtest",
    kitId: "TEST123",
    email: "test@example.com",
    name: "Test User",
    address: "123 Test St",
    city: "Test City",
    state: "TS",
    zip: "12345",
    country: "Test Country",
    storedAt: new Date().toISOString()
  }]
});

// Query test data (application filters by wallet address)
const records = await nillionClient.findData({
  collection: shippingId,
  filter: { walletAddress: "0xtest" }
});
console.log('My records:', records);

// Admin query (gets all records, no filter)
const allRecords = await nillionClient.findData({
  collection: shippingId
});
console.log('All records:', allRecords);

// Clean up test data (admin only)
const result = await nillionClient.deleteData({
  collection: shippingId
});
console.log('Deleted', result.deletedCount, 'records');
```

Repeat for `metadata` collection.

**Note:** Kit registration is stored on-chain in BatchStateMachine.sol, not in nilDB.
