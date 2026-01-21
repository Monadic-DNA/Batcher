# Monadic DNA Batcher

Semi-anonymous genetic sequencing for the discerning user

A privacy-preserving DNA testing batch coordination system built with Next.js, TypeScript, and Solidity smart contracts.

## Phase 1 Implementation Status ✅

### Project Setup
- ✅ Next.js 14+ with TypeScript and App Router
- ✅ Tailwind CSS configured for responsive mobile-first design
- ✅ shadcn/ui component library integrated
- ✅ Development environment (ESLint, Prettier)
- ✅ Project structure established

### Smart Contract Development
- ✅ **BatchStateMachine.sol** - Complete state machine implementation
  - State flow: Pending → Staged → Active → Sequencing → Completed → Purged
  - 10% deposit / 90% balance payment system
  - 1% slashing penalty with 6-month patience timer
  - Commitment hash storage (Hash(KitID + PIN))
  - Admin functions for batch management
- ✅ Comprehensive unit tests (35 passing tests)
- ✅ Hardhat development environment configured

## Phase 2 Implementation Status ✅

### Dynamic.xyz Integration
- ✅ **AuthProvider** component with Dynamic SDK
  - Wallet connection (Ethereum + Account Abstraction)
  - Session management with Next.js middleware support
  - User authentication state synchronization
  - Lazy initialization for optimal performance
- ✅ **AuthButton** component for wallet UI

### Nillion (nilDB) Integration
- ✅ **Nillion configuration** (`lib/nillion/config.ts`)
  - nilDB nodes configuration
  - Data retention policies
  - Access control schema
- ✅ **Nillion client utilities** (`lib/nillion/client.ts`)
  - Data encryption/decryption helpers
  - PIN management and commitment hashing
  - CSV compression for DNA results
  - Kit ID and PIN validation
- ✅ **API Routes**
  - `/api/nillion/delegation` - Generate delegation tokens for users
  - Rate limiting and origin validation

### Payment Integration
- ✅ **Stripe API Routes**
  - `/api/payment/create-deposit` - 10% deposit payment
  - `/api/payment/create-balance` - 90% balance payment
  - One-time payment sessions with metadata
- ✅ **Batch Status API**
  - `/api/check-batch` - Query user's batch participation
  - Smart contract integration ready (placeholder implementation)

### Frontend Integration
- ✅ Updated app layout with AuthProvider
- ✅ Interactive homepage demonstrating:
  - Wallet connection status
  - Batch participation info
  - Authentication flow
  - Responsive design

## Project Structure

```
/app                 # Next.js App Router
/components          # React components
  /modals           # Modal components
  /dashboard        # Dashboard components
  /ui               # Shared UI components (shadcn/ui)
/lib                # Utilities and services
  /contracts        # Smart contract ABIs and interactions
  /nillion          # Nillion integration (Phase 2)
  /dynamic          # Dynamic.xyz integration (Phase 2)
/types              # TypeScript types
/contracts          # Solidity smart contracts
/test               # Smart contract tests
/public             # Static assets
```

## Smart Contract Features

### Batch State Machine
- **Max batch size**: 24 participants
- **Deposit**: 10% of full price (0.01 ETH default)
- **Balance payment**: 90% of full price (0.09 ETH default)
- **Payment window**: 7 days after batch activation
- **Slashing penalty**: 1% of deposit
- **Patience timer**: 6 months extension after deadline
- **Claim window**: 60 days for results

### Key Functions
- `joinBatch()` - Join current pending batch with 10% deposit
- `payBalance()` - Pay 90% balance within payment window
- `storeCommitmentHash()` - Store Hash(KitID + PIN) for privacy
- `slashUser()` - Admin function to slash late payers
- `transitionBatchState()` - Admin function for state progression

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
# Run Next.js development server
npm run dev

# Compile smart contracts
npm run compile

# Run smart contract tests
npm run test:contracts

# Run all tests
npm test
```

### Smart Contract Testing

All 35 tests passing:
- Deployment verification
- Batch joining and capacity limits
- State transitions
- Balance payments
- Commitment hash storage
- Slashing logic
- Patience timer functionality
- Admin functions
- View functions

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript 5
- **Styling**: Tailwind CSS, shadcn/ui
- **Authentication**: Dynamic.xyz (wallet connection + account abstraction)
- **Privacy Layer**: Nillion (nilDB for encrypted data storage)
- **Payments**: Stripe (fiat), Ethers.js (on-chain payments)
- **Smart Contracts**: Solidity 0.8.27, Hardhat, OpenZeppelin
- **Testing**: Hardhat, Chai, Ethers.js v6
- **Code Quality**: ESLint, Prettier

## Next Steps (Phase 3+)

### Phase 3: Frontend - Dashboard (Mobile-First)
- Main dashboard with live queue stats
- Batch participation UI
- User status tracking
- FAQ section

### Phase 4: Frontend - Modal System
- Join Queue Modal (with payment flow)
- Shipping & Metadata Modal
- Kit Registration Modal (PIN entry)
- Balance Payment Modal (with countdown)
- Data Reveal Modal (PIN verification + download)

### Phase 5: Admin Panel
- Batch management interface
- State progression controls
- Shipping data access (transient)
- Kit randomization
- Results upload

### Phase 6: Backend Services
- Complete smart contract integration
- Timer & notification system (payment reminders, results ready)
- Email notifications
- Cron jobs for automated tasks

### Phase 7: Security & Testing
- Security audit
- End-to-end testing
- Mobile responsiveness testing
- Accessibility compliance

### Phase 8: Deployment
- Deploy contracts to mainnet L2 (Arbitrum/Base)
- Production deployment (Vercel)
- Configure production Nillion environment
- Set up monitoring and alerting

## License

See LICENSE file for details.
