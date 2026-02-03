# Nillion nilDB Collection Schemas for DNA Batcher

This document describes the data structures used for storing encrypted data in Nillion nilDB.

## Configuration

- **API Endpoint**: `https://api.nilai.nillion.network`
- **Collection Type**: `standard` (admin manages all records)
- **Primary Identifier**: `kitId` (encrypted with `%allot`)
- **Access Control**: Application-layer filtering by `walletAddress`
- **Collections**: Two collections (shipping and metadata)
- **Kit Registration**: Stored on-chain in BatchStateMachine.sol, NOT in nilDB

## Important Design Changes

### What Changed:

1. **Changed** collection type from `owned` → `standard`
2. **Added** `walletAddress` as a query field (for filtering by participant)
3. **Kept** `kitId` as the primary identifier (encrypted)
4. **Changed** `retrievedAt` → `storedAt` in shipping schema
5. **Changed** `age` → `yearOfBirth` in metadata schema
6. **Changed** `sex` → `sexAssignedAtBirth` in metadata schema
7. **Removed** `dataAccessedAt` and `dataPurgeScheduledAt` from metadata

### Why These Changes:

- **Dynamic Wallet Incompatibility**: Dynamic embedded wallets cannot sign Nillion transactions, so participants cannot directly create/own records
- **Admin-Managed Access**: Admin API key creates all records on behalf of participants using standard collections
- **Application-Layer Security**: Code enforces who can see what data by filtering queries with `walletAddress`
- **Privacy-First**: `kitId` and PII remain encrypted via `%allot`, only accessible after decryption
- **No Per-Record Ownership**: All records managed by admin, not owned by individual wallet addresses

---

## Collection 1: Shipping Data

### Schema: `dna-batcher-shipping`

```json
{
  "name": "DNA Batcher - Shipping Data",
  "type": "standard",
  "description": "Encrypted shipping information for DNA test kit delivery",
  "schema": {
    "walletAddress": {
      "type": "string",
      "description": "Participant wallet address (for filtering)"
    },
    "storedAt": {
      "type": "string",
      "description": "ISO timestamp when data was stored (not encrypted)"
    },
    "kitId": {
      "type": "%allot",
      "description": "Kit identifier (encrypted)"
    },
    "email": {
      "type": "%allot",
      "description": "Email for shipping notifications (encrypted)"
    },
    "name": {
      "type": "%allot",
      "description": "Full name for shipping label (encrypted)"
    },
    "address": {
      "type": "%allot",
      "description": "Street address (encrypted)"
    },
    "city": {
      "type": "%allot",
      "description": "City (encrypted)"
    },
    "state": {
      "type": "%allot",
      "description": "State/Province (encrypted)"
    },
    "zip": {
      "type": "%allot",
      "description": "ZIP/Postal code (encrypted)"
    },
    "country": {
      "type": "%allot",
      "description": "Country (encrypted)"
    }
  },
  "notes": {
    "ttl": "7 days (604800 seconds)",
    "queryFields": ["walletAddress", "storedAt"],
    "encryptedFields": ["kitId", "email", "name", "address", "city", "state", "zip", "country"],
    "usage": "Admin stores participant shipping addresses. Delete after kits are shipped.",
    "accessControl": "Standard collection - admin manages all records via API key"
  }
}
```

### Example Data:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bFB8",
  "storedAt": "2024-01-15T10:30:00Z",
  "kitId": "ABC12345XYZ",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "address": "123 Main Street, Apt 4B",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "United States"
}
```

**Note**: All fields except `walletAddress` and `storedAt` are encrypted. Admin manages all records via API key.

### Storage Method:
```typescript
// Admin API stores shipping data on behalf of participant
await nillionClient.createData({
  collection: SHIPPING_COLLECTION_ID,
  data: [{
    walletAddress: userWalletAddress,  // For filtering
    kitId: "ABC12345XYZ",
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

### Query Method:
```typescript
// Query specific user's shipping data (application enforces filter)
const records = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID,
  filter: { walletAddress: userWalletAddress }
});

// Admin query all shipping data (no filter)
const allRecords = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID
  // Admin sees all records across all users
});
```

### Delete Method:
```typescript
// Delete all shipping data (admin only)
const result = await nillionClient.deleteData({
  collection: SHIPPING_COLLECTION_ID
});

console.log('Deleted', result.deletedCount, 'records');
```

---

## Collection 2: Metadata (Optional Demographics)

### Schema: `dna-batcher-metadata`

```json
{
  "name": "DNA Batcher - Demographic Metadata",
  "type": "standard",
  "description": "Optional demographic metadata for improved DNA analysis",
  "schema": {
    "walletAddress": {
      "type": "string",
      "description": "Participant wallet address (for filtering)"
    },
    "submittedAt": {
      "type": "string",
      "description": "ISO timestamp when data was submitted (not encrypted)"
    },
    "kitId": {
      "type": "%allot",
      "description": "Kit identifier (encrypted)"
    },
    "yearOfBirth": {
      "type": "%allot",
      "description": "Year of birth (encrypted)"
    },
    "sexAssignedAtBirth": {
      "type": "%allot",
      "description": "Sex assigned at birth (encrypted)"
    },
    "ethnicity": {
      "type": "%allot",
      "description": "Self-reported ethnicity (encrypted)"
    }
  },
  "notes": {
    "ttl": "60 days (5184000 seconds)",
    "queryFields": ["walletAddress", "submittedAt"],
    "encryptedFields": ["kitId", "yearOfBirth", "sexAssignedAtBirth", "ethnicity"],
    "usage": "Admin stores optional demographic data on behalf of participants.",
    "accessControl": "Standard collection - admin manages all records via API key"
  }
}
```

### Example Data:
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bFB8",
  "submittedAt": "2024-01-15T10:30:00Z",
  "kitId": "ABC12345XYZ",
  "yearOfBirth": "1989",
  "sexAssignedAtBirth": "Male",
  "ethnicity": "Caucasian"
}
```

**Note**: All fields except `walletAddress` and `submittedAt` are encrypted. Admin manages all records via API key.

---

## Kit Registration: Stored On-Chain

**Important:** Kit registration is NOT stored in nilDB. Instead, it is stored on-chain in the BatchStateMachine.sol smart contract.

### On-Chain Storage Details:

- **Contract**: BatchStateMachine.sol
- **Data Stored**: Kit ID, PIN commitment hash, participant wallet address
- **Purpose**: Immutable, verifiable record of kit registrations
- **Verification**: Zero-knowledge PIN verification via commitment hashes
- **Security**: PIN never stored in plain text, only `keccak256(kitId + pin)` commitment

### Why On-Chain?

1. **Immutability**: Kit registrations cannot be altered once recorded
2. **Verifiability**: Anyone can verify kit ownership on-chain
3. **Trust**: No reliance on off-chain database for critical registration data
4. **Integration**: Direct connection with smart contract state machine

### Linking nilDB Records to On-Chain Kits:

Both shipping and metadata collections include a `kitId` field (encrypted) that links to the on-chain kit registration:

```typescript
// On-chain kit registration (BatchStateMachine.sol)
await contract.registerKit(kitId, pinCommitment);

// Off-chain shipping data (nilDB)
await nillionClient.createData({
  collection: SHIPPING_COLLECTION_ID,
  data: [{
    walletAddress: userWalletAddress,
    kitId: kitId, // Links to on-chain registration
    email: "user@example.com",
    // ... other shipping fields
  }]
});
```

---

## Access Control Policies

### Standard Collections Model

**Admin Access via API Key:**
- **API Key**: `NILLION_API_KEY` (environment variable, server-side only)
- **Permissions**: Full access to all records (create, read, update, delete)
- **Usage**: Admin API creates records on behalf of participants
- **Reason**: Dynamic wallets cannot sign Nillion transactions

**Application-Layer Security:**
- **Filtering**: Application code filters queries by `walletAddress` to enforce privacy
- **User Endpoints**: API routes validate user identity and filter data appropriately
- **Admin Endpoints**: Admin routes return all records for batch management
- **Trust Model**: Server is trusted to enforce access control correctly

### Why Not Owned Collections?

**Dynamic Wallet Limitation:**
- Dynamic embedded wallets use a different signing mechanism than Nillion requires
- Participants cannot directly sign Nillion transactions to create/own records
- "Owned" collections require each user to have a Nillion-compatible wallet

**Standard Collection Solution:**
- Admin API key creates all records centrally
- Data still encrypted at rest via `%allot` markers
- Application code enforces who can access what data
- Privacy maintained through encryption, not ownership

### Key Differences from Owned Collections:

| Aspect | Owned Collections | Standard Collections (Current) |
|--------|------------------|-------------------------------|
| Record Creation | User creates own records | Admin creates on behalf of user |
| Access Control | nilDB ownership (automatic) | Application filtering (manual) |
| Query Method | Automatic per-user filtering | Filter by `walletAddress` in code |
| Wallet Required | Nillion-compatible wallet | Any wallet (just for identity) |
| API Key | User-specific keys | Single admin key |

---

## Data Lifecycle

### 1. Registration Phase
- User submits shipping info via `ShippingMetadataModal`
- Admin API creates record in shipping collection with user's `walletAddress`
- Data stored with encrypted `kitId` and PII fields
- TTL: 7 days (or until kits shipped)

### 2. Shipping Phase
- Admin queries all shipping records (no filter = all records)
- Admin exports to CSV for shipping labels
- After kits shipped, admin deletes all shipping data
- Can filter by batch if `batchId` field is added

### 3. Results Phase (Future)
- Lab uploads results linked to encrypted `kitId`
- User retrieves with Kit ID + PIN verification
- Results auto-deleted 60 days after batch completion

---

## Environment Variables Required

Add to `.env.local`:

```bash
# Nillion Configuration
NEXT_PUBLIC_NILLION_API_URL=https://api.nilai.nillion.network
NILLION_API_KEY=your_admin_api_key_here  # Server-side only, full access
NEXT_PUBLIC_NILLION_COLLECTION_ID=dna-batcher
```

**Note**: Only one API key needed for standard collections (admin key with full access).

---

## SDK Methods Summary

| Operation | Method | Auth | Returns |
|-----------|--------|------|---------|
| Store data | `createData()` | API Key | Record ID |
| Query data | `findData()` | API Key | User's records (or all for admin) |
| Delete data | `deleteData()` | Admin API Key | Deleted count |
| Create collection | `createCollection()` | Admin API Key | Collection ID |

---

## Migration Notes

If migrating from testnet to production:

1. Update `NEXT_PUBLIC_NILLION_API_URL` to production endpoint
2. Create new collections in production nilDB
3. Regenerate API keys for production
4. Update all environment variables
5. Test with a small batch first

---

## Security Considerations

1. **Never store raw PINs** - only commitment hashes `Hash(KitID + PIN)`
2. **Shipping data is PII** - delete immediately after use
3. **Admin API key** - server-side only, never expose to client
4. **User API keys** - automatically scoped to owned records only
5. **TTL enforcement** - ensure automatic purging is enabled
6. **Audit logs** - track all admin access to shipping data
7. **Encrypted identifiers** - `kitId` is now encrypted, cannot correlate across collections without decryption
8. **Ownership-based access** - No need to filter by `walletAddress`, nilDB handles it automatically

---

## Testing the Schema

Use the nilDB SDK to test:

### Store Test Data:
```typescript
// Admin API creates record on behalf of user
await nillionClient.createData({
  collection: SHIPPING_COLLECTION_ID,
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
```

### Query Test Data (User):
```typescript
// Application filters by user's wallet address
const records = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID,
  filter: { walletAddress: "0xtest" }
});
console.log('My records:', records);
```

### Query Test Data (Admin):
```typescript
// Admin gets all records (no filter)
const allRecords = await nillionClient.findData({
  collection: SHIPPING_COLLECTION_ID
});
console.log('All records:', allRecords);
```

### Delete Test Data:
```typescript
// Admin deletes all records
const result = await nillionClient.deleteData({
  collection: SHIPPING_COLLECTION_ID
});
console.log('Deleted', result.deletedCount, 'records');
```
