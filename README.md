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
- ✅ **USDC Payment System**
  - ERC20 token approval flow for deposits and balance payments
  - Two-step process: approve USDC spending, then make payment
  - Configurable deposit/balance percentage split
- ✅ **Batch Status API**
  - `/api/check-batch` - Query user's batch participation
  - Smart contract integration with ethers.js v6

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
- **Max batch size**: Configurable (24 default)
- **Payment token**: USDC (6 decimals)
- **Deposit**: Configurable percentage (10% default = 10 USDC)
- **Balance payment**: Configurable percentage (90% default = 90 USDC)
- **Full price**: Configurable (100 USDC default)
- **Payment window**: 7 days after batch activation
- **Slashing penalty**: 1% of deposit
- **Patience timer**: 6 months extension after deadline
- **Claim window**: 60 days for results
- **Emergency pause**: Admin can pause joins and payments

### Key Functions
- `joinBatch()` - Join current pending batch (USDC transfer via approval)
- `payBalance()` - Pay balance within payment window (USDC transfer via approval)
- `storeCommitmentHash()` - Store Hash(KitID + PIN) for privacy
- `removeParticipant()` - Admin function to remove and refund participant
- `slashUser()` - Admin function to slash late payers
- `transitionBatchState()` - Admin function for state progression
- `pause()`/`unpause()` - Emergency controls

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Dynamic.xyz (Wallet Authentication)
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id

# Nillion (Privacy Layer)
NEXT_PUBLIC_NILLION_API_KEY=your_nillion_api_key
NEXT_PUBLIC_NILLION_COLLECTION_ID=your_nillion_collection_id

# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# USDC Token Address (network-specific)
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238  # Sepolia testnet

# Batch Configuration
NEXT_PUBLIC_MAX_BATCH_SIZE=24
NEXT_PUBLIC_PAYMENT_WINDOW_DAYS=7
NEXT_PUBLIC_PATIENCE_TIMER_DAYS=180

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EMAIL_FROM=noreply@monadicdna.com

# Cron Jobs (Production only)
CRON_SECRET=your_secure_random_string

# Admin (Optional - for admin panel access)
# Admin wallet addresses are managed on-chain via smart contract
```

**Required for basic functionality:**
- `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` - Get from [Dynamic.xyz dashboard](https://app.dynamic.xyz)
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - Deploy `BatchStateMachine.sol` (with USDC address) and use the address
- `NEXT_PUBLIC_USDC_ADDRESS` - USDC token contract address for your network
  - Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
  - Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
  - Arbitrum: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

**Blockchain Provider (choose one):**
- `ALCHEMY_API_KEY` - **Recommended**: Get from [Alchemy dashboard](https://dashboard.alchemy.com/) for reliable RPC with enhanced features
- `NEXT_PUBLIC_RPC_URL` - Alternative: Direct RPC endpoint (e.g., `http://localhost:8545` for local Hardhat node)

**Note:** If `ALCHEMY_API_KEY` is set, it takes precedence and automatically constructs the RPC URL based on your `NEXT_PUBLIC_CHAIN_ID`. Otherwise, `NEXT_PUBLIC_RPC_URL` is used.

**Optional for full functionality:**
- `NEXT_PUBLIC_NILLION_API_KEY` - Get from Nillion dashboard (for encrypted data storage)
- `NEXT_PUBLIC_NILLION_COLLECTION_ID` - Nillion collection ID
- `NEXT_PUBLIC_CHAIN_ID` - Network chain ID (Sepolia: 11155111, Arbitrum: 42161, Base: 8453)
- `CRON_SECRET` - Random secure string for protecting cron endpoints
- `EMAIL_FROM` - Email address for notifications (requires email service integration)

**Note:** See `.env.local.example` for a complete template with all variables.

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

# Build for production
npm run build

# Start production server
npm start
```

### Local Blockchain Development

Start a local Hardhat node:
```bash
npx hardhat node
```

In another terminal, deploy the contract:
```bash
# First, deploy a mock USDC token for testing (if not using real testnet USDC)
# Then deploy BatchStateMachine with USDC address
npx hardhat run scripts/deploy.ts --network localhost
```

Copy the deployed contract address to your `.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS` and the USDC address as `NEXT_PUBLIC_USDC_ADDRESS`.

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

- **Frontend**: Next.js 16, React 19, TypeScript 5
- **Styling**: Tailwind CSS, shadcn/ui
- **Authentication**: Dynamic.xyz (wallet connection + account abstraction)
- **Privacy Layer**: Nillion (nilDB for encrypted data storage)
- **Payments**: USDC only (ERC20 token via Ethers.js v6)
- **Smart Contracts**: Solidity 0.8.27, Hardhat, OpenZeppelin (SafeERC20, Pausable)
- **Testing**: Hardhat, Chai, Ethers.js v6
- **Code Quality**: ESLint, Prettier

## Phase 3 Implementation Status ✅

### Dashboard Components (Mobile-First)
- ✅ **LiveQueueStats** - Real-time batch progress with animated progress bar
- ✅ **UserStatusCard** - Batch participation status with countdown timer
- ✅ **HowItWorks** - 6-step visual guide with responsive layout
- ✅ **BatchHistory** - Responsive table/card views for batch history
- ✅ **FAQ** - Accordion-style FAQ with 10 comprehensive questions
- ✅ Main dashboard page with conditional rendering based on auth state

## Phase 4 Implementation Status ✅

### Modal System (Mobile-Optimized)
- ✅ **JoinQueueModal** - Batch join flow with USDC approval and payment (2-step)
- ✅ **ShippingMetadataModal** - Encrypted shipping info + optional metadata
- ✅ **KitRegistrationModal** - PIN creation with Kit ID registration
- ✅ **BalancePaymentModal** - USDC balance payment with approval flow and real-time countdown
- ✅ **DataRevealModal** - PIN verification + CSV download with preview
- ✅ All modals integrated into dashboard with proper state management

## Phase 5 Implementation Status ✅

### Admin Panel
- ✅ **Admin layout** - Wallet-based authentication with access control
- ✅ **BatchManagement** - Batch overview, state progression, slashing controls
- ✅ **ShippingDataViewer** - Secure PII access with audit warnings, CSV export
- ✅ **KitRandomizer** - Random Kit ID assignment with printable labels
- ✅ **MetadataExporter** - Lab-ready CSV export with statistics summary
- ✅ **ResultsUploader** - CSV validation, encryption, and batch upload
- ✅ Tab-based navigation, mobile-responsive design

## Phase 6 Implementation Status ✅

### Backend Services & API Layer
- ✅ **Smart contract integration** (`lib/contract.ts`) - Complete ethers.js wrapper
- ✅ **Rate limiting middleware** - IP-based, configurable presets, Redis-ready
- ✅ **Admin authentication** - Smart contract-based verification
- ✅ **Batch API routes** - `/api/batch/[batchId]`, `/api/batch/current`
- ✅ **User API routes** - `/api/user/batch-status`
- ✅ **Admin API routes** - `/api/admin/batch/progress`, `/api/admin/user/slash`
- ✅ **Nillion API routes** - `/api/nillion/store`, `/api/nillion/retrieve`
- ✅ **Email notification system** - 6 templates (batch ready, payment due, results ready, etc.)
- ✅ **Cron jobs** - Payment monitoring (hourly), expiration checking (daily)
- ✅ **Vercel configuration** - Cron schedule definitions

## Phase 7 Implementation Status ✅

### Security & Privacy
- ✅ **PIN management** (`lib/security/pinStorage.ts`) - Client-side only, commitment hashing
- ✅ **Input validation** (`lib/security/validation.ts`) - 35+ validators, XSS/SQL injection detection
- ✅ **Security headers** (`middleware.ts`) - CSP, X-Frame-Options, HSTS, 12 headers total
- ✅ **Audit logging** (`lib/security/auditLog.ts`) - Privacy-preserving, 24 event types
- ✅ **Security documentation** (`SECURITY.md`) - Comprehensive threat model, best practices
- ✅ GDPR/HIPAA/CCPA compliance features
- ✅ Zero-knowledge architecture (PINs never transmitted)

## Next Steps (Phase 8+)

### Phase 8: Testing
- [ ] End-to-end user flow testing (Playwright/Cypress)
- [ ] Mobile responsiveness testing (various devices)
- [ ] Professional smart contract security audit
- [ ] Load testing (24-user batch scenarios)
- [ ] Accessibility testing (WCAG 2.1 AA)

### Phase 9: Deployment
- [ ] Deploy contracts to mainnet L2 (Arbitrum/Base)
- [ ] Production deployment (Vercel)
- [ ] Configure production Nillion environment
- [ ] Set up monitoring and alerting (Sentry, LogRocket)
- [ ] Configure CDN for static assets
- [ ] SSL certificate and custom domain setup

### Phase 10: Documentation & Launch
- [ ] User guides and tutorials
- [ ] Technical FAQ (nilDB/MPC architecture)
- [ ] Admin operations manual
- [ ] API documentation
- [ ] Privacy policy and terms of service
- [ ] Beta testing with small user group
- [ ] Marketing materials and support system

## License

See LICENSE file for details.
