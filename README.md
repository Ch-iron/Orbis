<p align="center">
  <img src="public/logo.png" alt="Orbis logo" width="300" style="margin-bottom: -40px" />
</p>

<h1 align="center">Orbis</h1>

<p align="center">
  Multi-chain crypto neobank
</p>

## Overview

Orbis는 여러 블록체인 네트워크의 스테이킹 보상을 한 곳에서 관리할 수 있는 크립토 네오뱅크입니다. XPLA, SEI, Kaia 메인넷을 지원하며, 체인 어댑터 아키텍처를 통해 새로운 체인을 쉽게 추가할 수 있도록 설계되었습니다.

## Features

- **Portfolio** — 전체 스테이킹 자산, 보상, 잔액을 한눈에 확인. 체인별 자산 분포 차트 제공.
- **Staking** — 밸리데이터 목록 조회, 위임(delegate), 위임 해제(undelegate), 재위임(redelegate) 지원.
- **Rewards** — 보상 수확(harvest), 복리 재위임(restake), 거래소 전송과 재위임 분할(split rewards) 지원.
- **History** — 스테이킹 관련 트랜잭션 내역 조회.
- **Multi-chain** — 체인 선택기를 통해 네트워크를 전환하며, `StakingAdapter` 인터페이스로 체인별 구현을 추상화.
- **Multi-wallet** — Cosmos 지갑(XPLA Vault, XPLA Games Wallet), EVM 지갑(MetaMask via RainbowKit), A2A 지갑(Klip) 연결 지원. 지갑 설치 여부 자동 감지.

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

http://localhost:3000 에서 앱이 실행됩니다.

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
│   ├── useStakingActions.ts    # TX signing & broadcasting (cosmos/evm/klip 분기)
│   ├── useEvmStakingActions.ts # EVM precompile staking actions
│   ├── useKlipStakingActions.ts # Klip A2A staking actions
│   ├── useChain.ts             # Chain config + adapter
│   └── useWalletInfo.ts        # Cosmos/EVM/Klip wallet state 통합
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

`StakingAdapter` 타입이 체인별 구현을 추상화합니다. 각 체인 모듈(`src/lib/chains/{slug}/index.ts`)이 `ChainConfig` 객체를 export하며, 어댑터 생성(`createAdapter`), APY 계산(`fetchApy`), EVM precompile 설정, 주소 해석 등을 포함합니다.

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

새 체인을 추가하려면 **두 곳**만 수정하면 됩니다.

#### 1. 체인 모듈 생성 — `src/lib/chains/{slug}/`

| File            | Description                                    | Required |
| --------------- | ---------------------------------------------- | -------- |
| `index.ts`      | `ChainConfig` 객체 export (`createAdapter`, `fetchApy` 포함) | Yes      |
| `adapter.ts`    | `StakingAdapter` 구현 (validators, delegations, rewards, tx history 등) | Yes      |
| `client.ts`     | LCD/RPC 클라이언트 팩토리                      | Yes      |
| `contracts.ts`  | 스마트 컨트랙트 ABI (EVM 체인의 경우)          | Optional |
| `precompile.ts` | EVM precompile 주소 및 ABI (EVM staking 지원 시) | Optional |
| `constants.ts`  | RPC URL, 체인 ID 등 체인 상수                  | Optional |

`index.ts`에서 export하는 `ChainConfig` 객체의 주요 필드:

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
  publicDelegation: { ... },          // ERC-4626 기반 staking (Kaia 방식)
  addressResolution: { ... },         // EVM→Cosmos 주소 연관 쿼리

  cosmosWalletOptions: [ ... ],       // 지갑 선택지 (아래 지갑 추가 가이드 참고)
  evmWalletOptions: [ ... ],

  createAdapter: (config, walletAddress, evmAddress) => { ... },
  fetchApy: (config) => { ... },
};
```

기존 체인 모듈 참고:
- **Cosmos LCD 기반**: `src/lib/chains/sei/` (generic fetch LCD client)
- **XPLA.js 기반**: `src/lib/chains/xpla/` (전용 SDK 사용)
- **Pure EVM 기반**: `src/lib/chains/kaia/` (viem + PublicDelegation contracts)

#### 2. 레지스트리 등록 — `src/lib/chains/registry.ts`

```typescript
import { NEW_CHAIN_CONFIG } from './new-chain';

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_CONFIG,
  sei: SEI_CONFIG,
  kaia: KAIA_CONFIG,
  'new-chain': NEW_CHAIN_CONFIG,  // 이 줄만 추가
};
```

#### 체크리스트

- [ ] `pnpm build` — TypeScript 컴파일 성공
- [ ] Portfolio: 잔액, 위임, 리워드, APY 표시
- [ ] Staking: 밸리데이터 목록, 위임/언위임/리델리게이트
- [ ] History: 트랜잭션 내역 표시
- [ ] Overview: 멀티체인 데이터 표시
- [ ] Wallet: 지갑 연결 및 체인 전환

> **Note**: hooks (`useChain`, `useStakingApy`, `useEvmStakingActions` 등)와 UI 컴포넌트는 `ChainConfig`의 필드를 동적으로 읽으므로 별도 수정이 필요 없습니다.

### Adding a New Wallet

지갑은 체인 모듈의 `cosmosWalletOptions` 또는 `evmWalletOptions` 배열에 항목을 추가하면 됩니다. 코드 변경 없이 선언만으로 지갑이 UI에 표시되고, 설치 감지 및 연결이 동작합니다.

#### Cosmos 지갑 (browser extension)

`cosmosWalletOptions` 배열에 추가합니다.

```typescript
cosmosWalletOptions: [
  // XPLA wallet-provider가 감지하는 지갑 (injectedFlag 불필요)
  { label: 'XPLA Vault Wallet', type: 'EXTENSION', identifier: 'xplavault' },

  // 일반 Cosmos 지갑 (window property로 설치 감지)
  { label: 'Keplr', type: 'EXTENSION', identifier: 'keplr', injectedFlag: 'keplr' },
  { label: 'Leap', type: 'EXTENSION', identifier: 'leap-cosmos', injectedFlag: 'leap' },
  { label: 'Cosmostation', type: 'EXTENSION', identifier: 'cosmostation', injectedFlag: 'cosmostation' },

  // WalletConnect (설치 감지 없음)
  { label: 'WalletConnect', type: 'WALLETCONNECT', identifier: undefined },
],
```

| Field          | Description | Required |
| -------------- | ----------- | -------- |
| `label`        | UI에 표시할 지갑 이름 | Yes |
| `type`         | `'EXTENSION'` or `'WALLETCONNECT'` | Yes |
| `identifier`   | wallet-provider에서 사용하는 식별자 | Yes |
| `injectedFlag` | `window[flag]`로 설치 감지 (예: `'keplr'` → `window.keplr`) | Optional |

> `injectedFlag`가 없으면 `@xpla/wallet-provider`의 `availableConnections`로만 감지합니다. XPLA 계열 지갑은 이 방식으로 자동 감지되므로 `injectedFlag`가 불필요합니다.

#### EVM 지갑 (injected / browser extension)

`evmWalletOptions` 배열에 추가합니다.

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
| `id`           | 고유 식별자 | Yes |
| `label`        | UI에 표시할 지갑 이름 | Yes |
| `icon`         | 아이콘 경로 (`public/wallets/` 내) | Yes |
| `downloadUrl`  | 미설치 시 클릭할 다운로드 URL | Yes |
| `connectorId`  | wagmi connector ID (`connectors`에서 매칭) | Yes |
| `injectedFlag` | `window.ethereum[flag]`로 설치 감지 (EIP-5749 multi-provider 지원) | Optional |
| `isA2A`        | `true`이면 A2A 방식 연결 (아래 참고) | Optional |

> `injectedFlag`가 없으면 "Installed" 배지가 표시되지 않습니다. wagmi SDK connector는 미설치 상태에서도 등록되므로, 정확한 감지를 위해 `injectedFlag`를 설정하세요.

#### A2A 지갑 (deep link + polling 방식, 예: Klip)

A2A 지갑은 브라우저 확장이 아닌 모바일 앱을 통해 서명합니다. 현재 Klip이 이 방식으로 구현되어 있습니다.

```typescript
evmWalletOptions: [
  {
    id: 'klip',
    label: 'Klip',
    icon: '/wallets/klip.png',
    downloadUrl: 'https://klipwallet.com/',
    connectorId: '',
    isA2A: true,                        // A2A 플로우 활성화
  },
],
```

A2A 지갑 추가 시에는 별도의 SDK wrapper, store, staking actions 훅이 필요합니다. 현재 Klip 구현을 참고하세요:
- `src/lib/wallet/klip.ts` — SDK wrapper (prepare → deep link → poll)
- `src/stores/klipStore.ts` — 주소 persist
- `src/stores/klipRequestStore.ts` — 활성 요청 상태 (QR/딥링크 다이얼로그 트리거)
- `src/hooks/useKlipStakingActions.ts` — 트랜잭션 훅
- `src/components/common/KlipApprovalDialog.tsx` — QR 코드 / 딥링크 대기 UI

#### 설치 감지 원리

`src/lib/utils/wallet-detection.ts`의 `isWalletInstalled(flag)` 함수가 통합 감지를 수행합니다:

1. `window[flag]` 확인 — Cosmos 지갑 (예: `window.keplr`, `window.leap`)
2. `window.ethereum[flag]` 확인 — EVM 지갑 (예: `window.ethereum.isMetaMask`)
3. `window.ethereum.providers[].flag` 확인 — EIP-5749 multi-provider 환경

## License

Private
