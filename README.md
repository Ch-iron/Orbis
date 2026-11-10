<p align="center">
  <img src="public/logo.png" alt="Orbis logo" width="300" style="margin-bottom: -40px" />
</p>

<h1 align="center">Orbis</h1>

<p align="center">
  Multi-chain crypto neobank
</p>

## Overview

Orbis is a crypto neobank for managing staking rewards across blockchain networks in one place. It supports XPLA, Sei, and Kaia mainnet, with chain adapters designed to support additional networks.

## Features

- **Portfolio**: View staked assets, rewards, and balances, with charts showing asset distribution by chain.
- **Staking**: Browse validators, delegate, undelegate, and redelegate.
- **Rewards**: Harvest rewards, restake them, or split them between an exchange transfer and restaking.
- **History**: View staking transaction history.
- **Multi-chain**: Switch networks using the chain selector. The `StakingAdapter` interface provides a common interface for chain-specific implementations.
- **Multi-wallet**: Connect Cosmos wallets (XPLA Vault, XPLA Games Wallet), Ethereum Virtual Machine (EVM) wallets (MetaMask via RainbowKit), and app-to-app (A2A) wallets (Klip), with automatic installation detection.

## Tech Stack

| Category        | Technologies                                    |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling         | Tailwind CSS v4, shadcn/ui, Lucide Icons        |
| Data Fetching   | TanStack Query v5                               |
| State           | Zustand                                         |
| Wallet (Cosmos) | @xpla/wallet-provider                           |
| Wallet (EVM)    | RainbowKit, wagmi v2, viem                      |
| Wallet (A2A)    | klip-sdk (Klip A2A)                             |
| Signing         | @cosmjs/stargate 0.36                           |
| Chain Client    | @xpla/xpla.js (LCD), viem (EVM RPC)            |
| Charts          | Recharts 2                                      |
| Validation      | Zod                                             |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

```bash
cp .env.example .env.local
```

| Variable                               | Description                    |
| -------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |

### Development

```bash
pnpm dev
```

The app runs at http://localhost:3000.

### Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── (dashboard)/
│   │   ├── portfolio/          # Portfolio overview
│   │   ├── stake/[chainId]/    # Staking management
│   │   └── history/            # Transaction history
│   └── providers.tsx           # Query, Theme, Wallet, Klip providers
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── common/                 # ChainSelector, KlipApprovalDialog, etc.
│   ├── layout/                 # Sidebar, Header, WalletButton, WalletSelectDialog
│   ├── portfolio/              # PortfolioSummaryCards, StakingChart, DelegationList
│   ├── staking/                # ValidatorTable, StakeDialog, HarvestDialog, ...
│   └── history/                # HistoryView
│
├── hooks/                      # Data fetching & wallet hooks
│   ├── useStaking.ts           # Validators, delegations, rewards, unbonding
│   ├── useStakingActions.ts    # TX signing & broadcasting (cosmos/evm/klip branches)
│   ├── useEvmStakingActions.ts # EVM precompile staking actions
│   ├── useKlipStakingActions.ts # Klip A2A staking actions
│   ├── useChain.ts             # Chain config + adapter
│   └── useWalletInfo.ts        # Unified Cosmos/EVM/Klip wallet state
│
├── lib/
│   ├── chains/
│   │   ├── types.ts            # ChainConfig, Wallet option types, etc.
│   │   ├── adapter.ts          # StakingAdapter type (chain-agnostic interface)
│   │   ├── registry.ts         # Chain registry (imports from chain modules)
│   │   ├── cosmos-utils.ts     # Shared Cosmos SDK utilities
│   │   ├── address-resolution.ts # EVM→Cosmos address association
│   │   ├── xpla/               # XPLA chain module
│   │   ├── sei/                # SEI chain module
│   │   └── kaia/               # Kaia chain module (PublicDelegation contracts)
│   ├── wallet/
│   │   ├── evmProvider.tsx     # wagmi/RainbowKit configuration
│   │   └── klip.ts             # Klip A2A SDK wrapper (auth, executeContract, polling)
│   └── utils/
│       ├── format.ts           # Token formatting utilities
│       ├── address.ts          # EVM↔Bech32 address conversion
│       └── wallet-detection.ts # Browser extension installation detection
│
├── stores/                     # Zustand stores
│   ├── chainStore.ts           # Selected chain
│   ├── walletTypeStore.ts      # Active wallet type (cosmos/evm/klip)
│   ├── klipStore.ts            # Klip address (persisted)
│   ├── klipRequestStore.ts     # Active Klip A2A request state
│   └── exchangeStore.ts        # Exchange addresses
│
└── types/
    └── klip-sdk.d.ts           # Type declarations for klip-sdk
```

## Architecture

### Chain Abstraction

The `StakingAdapter` type provides a common interface for chain-specific implementations. Each chain module (`src/lib/chains/{slug}/index.ts`) exports a `ChainConfig` object with adapter creation (`createAdapter`), annual percentage yield (APY) calculation (`fetchApy`), EVM precompile settings, and address resolution.

```
StakingAdapter
├── getValidators()
├── getDelegations()
├── getRewards()
├── getUnbonding()
├── getBalance()
├── getTransactionHistory()
├── buildDelegateMsg()
├── buildUndelegateMsg()
├── buildRedelegateMsg()
├── buildWithdrawRewardsMsg()
├── buildSendMsg()
├── buildCompoundMsg()
└── buildSplitRewardsMsg()
```

### Supported Chains

| Chain | Network | Chain ID         | Type   |
| ----- | ------- | ---------------- | ------ |
| XPLA  | Mainnet | `dimension_37-1` | Cosmos + EVM |
| Sei   | Mainnet | `pacific-1`      | Cosmos + EVM |
| Kaia  | Mainnet | `8217`           | EVM    |

### Adding a New Chain

Adding a chain requires changes in **two places**.

#### 1. Create the chain module: `src/lib/chains/{slug}/`

| File            | Description                                    | Required |
| --------------- | ---------------------------------------------- | -------- |
| `index.ts`      | Exports `ChainConfig`, including `createAdapter` and `fetchApy` | Yes |
| `adapter.ts`    | Implements `StakingAdapter` for validators, delegations, rewards, transaction history, etc. | Yes |
| `client.ts`     | LCD/RPC client factory | Yes |
| `contracts.ts`  | Smart contract ABI for EVM chains | Optional |
| `precompile.ts` | EVM precompile addresses and ABI when EVM staking is supported | Optional |
| `constants.ts`  | Chain constants such as RPC URLs and chain IDs | Optional |

Main fields in the `ChainConfig` object exported from `index.ts`:

```typescript
const NEW_CHAIN_CONFIG: ChainConfig = {
  id: 'chain-id-1',
  slug: 'new-chain',
  name: 'New Chain',
  type: 'cosmos',              // 'cosmos' | 'evm'
  logo: '/chains/new-chain.png',
  rpc: 'https://rpc.example.com',
  lcd: 'https://lcd.example.com',
  explorer: 'https://explorer.example.com',
  stakingToken: { denom: 'utoken', decimals: 6, symbol: 'TOKEN', coingeckoId: 'token-id' },
  unbondingDays: 21,

  // Optional
  evmChainId: 12345,
  evmRpc: 'https://evm-rpc.example.com',
  bech32Prefix: 'cosmos',
  gas: { gasPrices: '0.025utoken', gasAdjustment: 1.5 },
  evmPrecompile: { ... },            // EVM precompile staking
  publicDelegation: { ... },          // ERC-4626 staking, as used by Kaia
  addressResolution: { ... },         // EVM-to-Cosmos address association query

  cosmosWalletOptions: [ ... ],       // Wallet options; see the wallet guide below
  evmWalletOptions: [ ... ],

  createAdapter: (config, walletAddress, evmAddress) => { ... },
  fetchApy: (config) => { ... },
};
```

Refer to these existing chain modules:
- **Cosmos LCD**: `src/lib/chains/sei/` (generic fetch LCD client)
- **XPLA.js**: `src/lib/chains/xpla/` (dedicated SDK)
- **Pure EVM**: `src/lib/chains/kaia/` (viem + PublicDelegation contracts)

#### 2. Register the chain: `src/lib/chains/registry.ts`

```typescript
import { NEW_CHAIN_CONFIG } from './new-chain';

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_CONFIG,
  sei: SEI_CONFIG,
  kaia: KAIA_CONFIG,
  'new-chain': NEW_CHAIN_CONFIG,  // Add this entry
};
```

#### Checklist

- [ ] `pnpm build`: TypeScript compilation succeeds
- [ ] Portfolio: Displays balances, delegations, rewards, and APY
- [ ] Staking: Validator list, delegation, undelegation, and redelegation
- [ ] History: Displays transaction history
- [ ] Overview: Displays multi-chain data
- [ ] Wallet: Connection and network switching

> **Note**: Hooks such as `useChain`, `useStakingApy`, and `useEvmStakingActions`, along with UI components, read `ChainConfig` fields dynamically and do not require separate changes.

### Adding a New Wallet

Add an entry to the chain module's `cosmosWalletOptions` or `evmWalletOptions` array. The declaration drives the wallet UI, installation detection, and connection without changes to the UI code.

#### Cosmos wallets (browser extension)

Add an entry to `cosmosWalletOptions`.

```typescript
cosmosWalletOptions: [
  // Detected by XPLA wallet-provider; injectedFlag is not required
  { label: 'XPLA Vault Wallet', type: 'EXTENSION', identifier: 'xplavault' },

  // Other Cosmos wallets use window properties for installation detection
  { label: 'Keplr', type: 'EXTENSION', identifier: 'keplr', injectedFlag: 'keplr' },
  { label: 'Leap', type: 'EXTENSION', identifier: 'leap-cosmos', injectedFlag: 'leap' },
  { label: 'Cosmostation', type: 'EXTENSION', identifier: 'cosmostation', injectedFlag: 'cosmostation' },

  // WalletConnect does not use installation detection
  { label: 'WalletConnect', type: 'WALLETCONNECT', identifier: undefined },
],
```

| Field          | Description | Required |
| -------------- | ----------- | -------- |
| `label`        | Wallet name displayed in the UI | Yes |
| `type`         | `'EXTENSION'` or `'WALLETCONNECT'` | Yes |
| `identifier`   | Identifier used by wallet-provider | Yes |
| `injectedFlag` | Installation detection through `window[flag]`, e.g. `'keplr'` → `window.keplr` | Optional |

> Without `injectedFlag`, detection uses only `availableConnections` from `@xpla/wallet-provider`. XPLA wallets are detected this way automatically and do not need `injectedFlag`.

#### EVM wallets (injected / browser extension)

Add an entry to `evmWalletOptions`.

```typescript
evmWalletOptions: [
  {
    id: 'metamask',
    label: 'MetaMask',
    icon: '/wallets/metamask.svg',
    downloadUrl: 'https://metamask.io/download/',
    connectorId: 'metaMaskSDK',         // wagmi connector ID
    injectedFlag: 'isMetaMask',         // window.ethereum.isMetaMask
  },
  {
    id: 'rabby',
    label: 'Rabby',
    icon: '/wallets/rabby.svg',
    downloadUrl: 'https://rabby.io/',
    connectorId: 'io.rabby',
    injectedFlag: 'isRabby',            // window.ethereum.isRabby
  },
],
```

| Field          | Description | Required |
| -------------- | ----------- | -------- |
| `id`           | Unique identifier | Yes |
| `label`        | Wallet name displayed in the UI | Yes |
| `icon`         | Icon path within `public/wallets/` | Yes |
| `downloadUrl`  | Download URL opened when the wallet is not installed | Yes |
| `connectorId`  | wagmi connector ID matched against `connectors` | Yes |
| `injectedFlag` | Installation detection through `window.ethereum[flag]`, with EIP-5749 multi-provider support | Optional |
| `isA2A`        | Set to `true` for an A2A connection; see below | Optional |

> Without `injectedFlag`, the "Installed" badge is not shown. wagmi SDK connectors can be registered even when the wallet is not installed, so set `injectedFlag` for accurate detection.

#### A2A wallets (deep links and polling, such as Klip)

A2A wallets sign through a mobile app rather than a browser extension. Klip currently uses this approach.

```typescript
evmWalletOptions: [
  {
    id: 'klip',
    label: 'Klip',
    icon: '/wallets/klip.png',
    downloadUrl: 'https://klipwallet.com/',
    connectorId: '',
    isA2A: true,                        // Enable the A2A flow
  },
],
```

Adding an A2A wallet requires a separate SDK wrapper, store, and staking action hook. Refer to the current Klip implementation:
- `src/lib/wallet/klip.ts` — SDK wrapper (prepare → deep link → poll)
- `src/stores/klipStore.ts`: Persisted address
- `src/stores/klipRequestStore.ts`: Active request state, triggering QR/deep-link dialogs
- `src/hooks/useKlipStakingActions.ts`: Transaction hook
- `src/components/common/KlipApprovalDialog.tsx`: QR code and deep-link approval UI

#### Installation detection

The `isWalletInstalled(flag)` function in `src/lib/utils/wallet-detection.ts` performs the following checks:

1. Check `window[flag]` for Cosmos wallets, such as `window.keplr` or `window.leap`.
2. Check `window.ethereum[flag]` for EVM wallets, such as `window.ethereum.isMetaMask`.
3. Check `window.ethereum.providers[].flag` in EIP-5749 multi-provider environments.

## License

Private
