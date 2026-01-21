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
- **Smart Contracts**: Solidity 0.8.27, Hardhat, OpenZeppelin
- **Testing**: Hardhat, Chai, Ethers.js v6
- **Code Quality**: ESLint, Prettier

## Next Steps (Phase 2+)

- Dynamic.xyz authentication integration
- Nillion (nilDB) privacy layer
- Payment integration (Stripe, USDC)
- Frontend dashboard implementation
- Modal system development
- Admin panel
- Backend API services
- Deployment to testnet (Arbitrum/Base Sepolia)

## License

See LICENSE file for details.
