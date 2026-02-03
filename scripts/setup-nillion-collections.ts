/**
 * Setup Script: Create Nillion nilDB Collections
 *
 * This script creates the required nilDB collections for DNA Batcher.
 * Run this once during initial setup.
 *
 * Note: Kit registration is stored on-chain in BatchStateMachine.sol, NOT in nilDB.
 * This script only creates TWO collections: shipping and metadata.
 *
 * Usage:
 *   npm install @nillion/client-blindcompute
 *   npx ts-node scripts/setup-nillion-collections.ts
 *
 * After running, copy the collection IDs into your .env.local file.
 */

// Note: This is a template - uncomment and install @nillion/client-blindcompute to use

/*
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load nilDB schemas (these use the correct %allot format)
const shippingSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../lib/nillion/schemas/shipping.nildb.json'), 'utf8')
);
const metadataSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../lib/nillion/schemas/metadata.nildb.json'), 'utf8')
);

// Generate UUIDs for collections
shippingSchema._id = randomUUID();
metadataSchema._id = randomUUID();

// Note: Kit registration is stored on-chain, not in nilDB
const collections = [shippingSchema, metadataSchema];

async function setupCollections() {
  console.log('Creating Nillion nilDB collections for DNA Batcher...\n');

  for (const collection of collections) {
    console.log(`Creating: ${collection.name}`);
    console.log(`Collection ID: ${collection._id}`);
    console.log(`Type: ${collection.type}`);
    console.log(`Schema:`, JSON.stringify(collection.schema, null, 2));

    // In production, you would use the nilDB SDK:
    // import { NillionClient } from '@nillion/client-blindcompute';
    // const client = new NillionClient({ ... });
    // const result = await client.createCollection(collection);

    console.log(`\n✓ ${collection.name} created successfully\n`);
  }

  console.log('\n=== COPY THESE TO YOUR .env.local FILE ===\n');
  console.log(`NILLION_SHIPPING_COLLECTION_ID=${collections[0]._id}`);
  console.log(`NILLION_METADATA_COLLECTION_ID=${collections[1]._id}`);
  console.log('\n# Kit registration is stored on-chain in BatchStateMachine.sol');
  console.log('# NILLION_KITS_COLLECTION_ID is NOT needed');
  console.log('\n==========================================\n');
}

setupCollections().catch(console.error);
*/

console.log(`
⚠️  This is a template script.

To create Nillion collections:

1. Install the Nillion SDK:
   npm install @nillion/client-blindcompute

2. Uncomment the code in this file

3. Run the script:
   npx ts-node scripts/setup-nillion-collections.ts

4. Copy the generated UUIDs to your .env.local file

Note: This script creates TWO collections (shipping and metadata).
Kit registration is stored on-chain in BatchStateMachine.sol, NOT in nilDB.

Alternatively, create collections programmatically in your application
or via the Nillion dashboard (if available).

For documentation, see:
https://docs.nillion.com/blind-computer/build/storage/quickstart
`);
