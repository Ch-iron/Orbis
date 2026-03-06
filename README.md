<p align="center">
  <img src="public/logo.png" alt="Orbis logo" width="300" style="margin-bottom: -40px" />
</p>

<h1 align="center">Orbis</h1>

<p align="center">
  Multi-chain crypto neobank
</p>

## Overview

Orbis는 여러 블록체인 네트워크의 스테이킹 보상을 한 곳에서 관리할 수 있는 크립토 네오뱅크입니다. 현재 XPLA 메인넷을 지원하며, 체인 어댑터 아키텍처를 통해 새로운 체인을 쉽게 추가할 수 있도록 설계되었습니다.

## Features

- **Portfolio** — 전체 스테이킹 자산, 보상, 잔액을 한눈에 확인. 체인별 자산 분포 차트 제공.
- **Staking** — 밸리데이터 목록 조회, 위임(delegate), 위임 해제(undelegate), 재위임(redelegate) 지원.
- **Rewards** — 보상 수확(harvest), 복리 재위임(restake), 거래소 전송과 재위임 분할(split rewards) 지원.
- **History** — 스테이킹 관련 트랜잭션 내역 조회.
- **Multi-chain** — 체인 선택기를 통해 네트워크를 전환하며, `StakingAdapter` 인터페이스로 체인별 구현을 추상화.
- **Multi-wallet** — Keplr, Leap, Cosmostation 등 Cosmos 지갑과 EVM 지갑(RainbowKit) 연결 지원.

## Tech Stack

| Category        | Technologies                                    |
| --------------- | ----------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling         | Tailwind CSS v4, shadcn/ui, Lucide Icons        |
| Data Fetching   | TanStack Query v5                               |
| State           | Zustand                                         |
| Wallet (Cosmos) | cosmos-kit (Keplr, Leap, Cosmostation)          |
| Wallet (EVM)    | RainbowKit, wagmi v2, viem                      |
| Signing         | @cosmjs/stargate 0.36                           |
| Chain Client    | @xpla/xpla.js (LCD)                             |
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
│   └── providers.tsx           # Query, Theme, Wallet providers
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── common/                 # ChainSelector, TokenAmount, TxStatusToast
│   ├── layout/                 # Sidebar, Header, WalletButton
│   ├── portfolio/              # PortfolioSummaryCards, StakingChart, DelegationList
│   ├── staking/                # ValidatorTable, StakeDialog, HarvestDialog, ...
│   └── history/                # HistoryView
│
├── hooks/                      # Data fetching & wallet hooks
│   ├── useStaking.ts           # Validators, delegations, rewards, unbonding
│   ├── useStakingActions.ts    # TX signing & broadcasting
│   ├── useChain.ts             # Chain config + adapter
│   └── useUnifiedWallet.ts     # Cosmos/EVM wallet abstraction
│
├── lib/
│   ├── chains/
│   │   ├── types.ts            # ChainConfig, EvmPrecompileConfig, etc.
│   │   ├── adapter.ts          # StakingAdapter type (chain-agnostic interface)
│   │   ├── registry.ts         # Chain registry (imports from chain modules)
│   │   ├── cosmos-utils.ts     # Shared Cosmos SDK utilities
│   │   ├── address-resolution.ts # EVM→Cosmos address association
│   │   ├── xpla/               # XPLA chain module (config, adapter, client, precompile)
│   │   └── sei/                # SEI chain module (config, adapter, client, precompile)
│   ├── wallet/                 # Wallet provider configurations
│   └── utils/                  # Formatting utilities
│
└── stores/                     # Zustand stores (chain, exchange)
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

| Chain | Network | Chain ID         |
| ----- | ------- | ---------------- |
| XPLA  | Mainnet | `dimension_37-1` |
| Sei   | Mainnet | `pacific-1`      |

### Adding a New Chain

새 체인을 추가하려면 **두 곳**만 수정하면 됩니다.

#### 1. 체인 모듈 생성 — `src/lib/chains/{slug}/`

| File            | Description                                    | Required |
| --------------- | ---------------------------------------------- | -------- |
| `index.ts`      | `ChainConfig` 객체 export (`createAdapter`, `fetchApy` 포함) | Yes      |
| `adapter.ts`    | `StakingAdapter` 구현 (validators, delegations, rewards, tx history 등) | Yes      |
| `client.ts`     | LCD/RPC 클라이언트 팩토리                      | Yes      |
| `precompile.ts` | EVM precompile 주소 및 ABI (EVM staking 지원 시) | Optional |
| `constants.ts`  | Gas 설정 등 체인 상수                          | Optional |

`index.ts`에서 export하는 `ChainConfig` 객체의 주요 필드:

```typescript
const NEW_CHAIN_CONFIG: ChainConfig = {
  // 기본 정보
  id: 'chain-id-1',
  slug: 'new-chain',
  name: 'New Chain',
  type: 'cosmos',
  // ...

  // 체인별 구현을 config에 포함
  gas: { gasPrices: '0.025utoken', gasAdjustment: 1.5 },
  evmPrecompile: { ... },          // EVM precompile staking 설정 (optional)
  addressResolution: { ... },       // EVM→Cosmos 주소 연관 쿼리 (optional)
  cosmosWalletOptions: [ ... ],     // Cosmos 지갑 선택지 (optional)
  createAdapter: (config, walletAddress, evmAddress) => { ... },
  fetchApy: (config) => { ... },
};
```

기존 체인 모듈을 참고하세요:
- **Cosmos LCD 기반**: `src/lib/chains/sei/` (generic fetch LCD client)
- **XPLA.js 기반**: `src/lib/chains/xpla/` (전용 SDK 사용)

#### 2. 레지스트리 등록 — `src/lib/chains/registry.ts`

```typescript
import { NEW_CHAIN_CONFIG } from './new-chain';

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_CONFIG,
  sei: SEI_CONFIG,
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

## License

Private
