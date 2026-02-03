# Nillion nilDB Schemas for DNA Batcher

This directory contains nilDB schema definitions for creating collections.

## Schema Files

| File | Purpose | TTL |
|------|---------|-----|
| `shipping.nildb.json` | Shipping addresses for kit delivery | 7 days |
| `metadata.nildb.json` | Optional demographic metadata | 60 days |

**Note:** Kit registration is stored on-chain in the BatchStateMachine.sol smart contract, NOT in nilDB.

**Format:**
- Uses `%allot` to mark encrypted fields
- Simple type definitions: `string`, `%allot`
- Used with `nillionClient.createCollection()`

## Important Schema Changes

All schemas have been updated to use **standard collections with admin-managed access**:

1. **Changed** collection type from `owned` → `standard`
2. **Added** `walletAddress` as a query field (for filtering by participant)
3. **Kept** `kitId` as the primary identifier (encrypted with `%allot`)
4. **Changed** field names for clarity:
   - `retrievedAt` → `storedAt` (shipping)
   - `age` → `yearOfBirth` (metadata)
   - `sex` → `sexAssignedAtBirth` (metadata)
5. **Removed** tracking fields like `dataAccessedAt` and `dataPurgeScheduledAt`

### Why Standard Collections?

**Dynamic Wallet Incompatibility**: This application uses Dynamic embedded wallets for participant login. These wallets cannot sign Nillion transactions (Nillion requires specific signing formats). Therefore, participants cannot directly create or own nilDB records. Admin creates all records on behalf of participants using the API key.

## Using These Schemas

### Creating Collections

```typescript
import { randomUUID } from 'crypto';
import * as fs from 'fs';

// Load schema
const schema = JSON.parse(
  fs.readFileSync('lib/nillion/schemas/shipping.nildb.json', 'utf8')
);

// Assign UUID
schema._id = randomUUID();

// Create collection
await nillionClient.createCollection(schema);
console.log('Collection ID:', schema._id);
```

See `/scripts/setup-nillion-collections.ts` for a complete example.

### Schema Structure

Each `.nildb.json` file contains:

```json
{
  "_id": "REPLACE_WITH_UUID_FROM_CREATION",
  "name": "Collection Name",
  "type": "standard",
  "description": "What this collection stores",
  "schema": {
    "walletAddress": { "type": "string" },
    "storedAt": { "type": "string" },
    "email": { "type": "%allot" }
  },
  "notes": {
    "ttl": "...",
    "queryFields": [...],
    "encryptedFields": [...],
    "accessControl": "Standard collection - admin manages all records via API key"
  }
}
```

**Field Types:**
- `string` - Plain text, queryable
- `number` - Plain integer, queryable
- `%allot` - Encrypted, not queryable

**Collection Type:**
- `standard` - Admin manages all records via API key (no per-record ownership)

## Key Design Decisions

### Query Fields vs Encrypted Fields

**Query Fields** (not encrypted):
- `walletAddress` - Participant wallet address for filtering
- `storedAt` / `submittedAt` / `registeredAt` - Timestamps for filtering/sorting
- `pinHash` - For zero-knowledge verification (not PII)

**Encrypted Fields** (`%allot`):
- **Primary identifier**: `kitId` (encrypted for maximum privacy)
- **All PII**: `email`, `name`, `address`, `city`, `state`, `zip`, `country`
- **Demographics**: `yearOfBirth`, `sexAssignedAtBirth`, `ethnicity`

**Tradeoff:** `kitId` is encrypted, which means we cannot query by it directly. Instead, we filter by `walletAddress` to get participant-specific records.

### Why "standard" Collections?

**Dynamic Wallet Limitation:**
- Dynamic embedded wallets cannot sign Nillion transactions
- Participants cannot directly create/own nilDB records
- "Owned" collections require Nillion-compatible wallets

**Standard Collection Benefits:**
- Admin API key creates all records centrally
- Single API key simplifies infrastructure
- Application code enforces access control via filtering
- Data still encrypted at rest via `%allot` markers

### Why Encrypt kitId?

- **Maximum privacy**: Cannot correlate records across collections without decryption
- **Zero-knowledge**: Admin can query all records but cannot link them to specific kits without decryption
- **Better security**: Even if nilDB is compromised, kit identifiers remain protected

## Schema Metadata (`notes` section)

The `notes` field is not used by nilDB but provides documentation:

```json
{
  "notes": {
    "ttl": "7 days (604800 seconds)",
    "queryFields": ["walletAddress", "storedAt"],
    "encryptedFields": ["kitId", "email", "name", "address"],
    "usage": "What this collection is for",
    "accessControl": "Standard collection - admin manages all records via API key"
  }
}
```

## Example: Shipping Collection

```json
{
  "schema": {
    "walletAddress": { "type": "string" },     // Query field (for filtering)
    "storedAt": { "type": "string" },          // Query field (timestamp)
    "kitId": { "type": "%allot" },             // Encrypted (primary identifier)
    "email": { "type": "%allot" },             // Encrypted
    "name": { "type": "%allot" },              // Encrypted
    "address": { "type": "%allot" },           // Encrypted
    "city": { "type": "%allot" },              // Encrypted
    "state": { "type": "%allot" },             // Encrypted
    "zip": { "type": "%allot" },               // Encrypted
    "country": { "type": "%allot" }            // Encrypted
  }
}
```

**Usage:**
```typescript
// Admin API stores shipping data on behalf of participant
await nillionClient.createData({
  collection: SHIPPING_COLLECTION_ID,
  data: [{
    walletAddress: userWalletAddress, // For filtering
    kitId: "ABC12345XYZ",         // Automatically encrypted
    email: "user@example.com",    // Automatically encrypted
    name: "John Doe",              // Automatically encrypted
    address: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "United States",
    storedAt: new Date().toISOString()
  }]
});

// Application queries user's shipping data (filters by wallet address)
const records = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID,
  filter: { walletAddress: userWalletAddress }
});

// Admin queries all shipping data (no filter)
const allRecords = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID
});
```

## Related Files

- `/lib/nillion/collections.ts` - Collection IDs and helper functions
- `/lib/nillion/COLLECTIONS.md` - Overview of collection architecture
- `/scripts/setup-nillion-collections.ts` - Script to create collections
- `/NILLION_SETUP.md` - Complete setup guide
- `/NILLION_SCHEMAS.md` - Detailed schema documentation
- `.env.local.example` - Environment variables for collection IDs

## Migration from Owned Collections

If your code previously used "owned" collections:

1. **Change collection type**: Update schemas from `"type": "owned"` → `"type": "standard"`
2. **Add walletAddress field**: Add `walletAddress: { type: 'string' }` as a query field in all schemas
3. **Update data storage**: Remove `owner` parameter, add `walletAddress` to data objects
4. **Update queries**: Add `filter: { walletAddress }` to user queries, remove for admin queries
5. **Update field names**: `retrievedAt` → `storedAt`, `age` → `yearOfBirth`, `sex` → `sexAssignedAtBirth`
6. **Remove delegation logic**: Admin API key has full access, no ACL/delegation needed

## Documentation

- **nilDB Quickstart**: https://docs.nillion.com/blind-computer/build/storage/quickstart
- **TypeScript SDK**: https://docs.nillion.com/blind-computer/build/storage/ts-docs
