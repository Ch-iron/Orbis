# Staking support for held assets

Reference date: 2026-11-06. The table below lists target assets and implementation requirements. Inclusion in the table does not mean that support is complete in the app. Existing XPLA, Sei, and Kaia support remains in place.

## Scope and exclusions

Add chains that use proof-of-stake (PoS) consensus from the assets held by the user. Ethereum integrates both Lido and Rocket Pool, as selected by the user. TON uses a flow for browsing and selecting validator-operated Nominator Pools. After comparing services, the user selected Réti validator pools for Algorand.

| Asset | Implementation path | Key requirements |
| --- | --- | --- |
| ETH | Lido + Rocket Pool | Distinguish stETH/rETH exchange rates and withdrawal rules |
| AVAX | P-Chain delegation | Separate from C-Chain balances; minimum amount and end time |
| ALGO | Réti validator pools | Pool minimums, fees, eligibility, and account minimum balance |
| NEAR | Validator staking pools | Account names and withdrawal after unstaking |
| TIA | Celestia validator delegation | Cosmos signing, addresses, and fees |
| ADA | Stake pool delegation | Delegate the entire balance without double-counting spendable funds |
| POL | Polygon staking contracts on Ethereum | POL approval, ETH gas, and withdrawal stages |
| IOTX | IoTeX delegation | Bucket lock periods and reward distribution |
| VET | Stargate validator delegation | Staking NFTs and VTHO rewards |
| APT | Aptos delegation pools | Pool status, locks, and withdrawal stages |
| EGLD | MultiversX staking providers | Service fees and withdrawal after unstaking |
| S | Sonic validator delegation | Verify duration, rewards, and unstaking rules against live contracts |
| IOTA | Rebased validator delegation | Move stake objects and epoch status |
| SUI | Sui validator delegation | Move stake objects and reward-inclusive valuation |
| TON | Nominator Pool | Pool minimums, pending deposits, and full withdrawals |
| DYDX | dYdX Chain validator delegation | Distinguish from ethDYDX and display USDC rewards separately |

XLM is excluded because it uses Stellar Consensus Protocol. IMX rollup token rewards are not treated as independent PoS validator delegation. ICP NNS neurons involve governance voting stakes and are outside this validator staking scope. CELO is excluded because its validator consensus and role changed after the L2 transition. These exclusions do not imply that the assets have no reward mechanisms.

## Wallet requirements

Provide MetaMask and WalletConnect on chains where MetaMask can sign the actual transactions. For other chains, select two representative wallets and add WalletConnect only after verifying support for the chain and transaction format. Do not label TON Connect as WalletConnect. EVM-compatible balance queries alone do not establish native staking support.

## Execution flow checked before implementation

Resolve the actual account address from the selected chain and wallet, then query balances, stakes, and withdrawal requests through the network's read APIs. When the user selects an action and amount, validate support, amount, account, and network before signing approvals and transactions in order. Refresh queries only when the receipt or chain-specific execution result reports success.

The Overview path that converts an EVM address to a Bech32 address for every chain cannot be reused unchanged for the new chains. Treating dYdX rewards as DYDX or adding rETH to ETH at a 1:1 rate would also fail. Separate withdrawal requests from final withdrawals. Do not invent completion dates for requests whose completion time is unknown.

Each implementation includes cases for zero and empty values, decimal precision, insufficient funds, minimum and maximum amounts, wrong networks, rejected signatures, read failures, execution failures, duplicate clicks, and pending or completed withdrawals. Validation covers public reads and simulations without executing real asset transfers. Local tests do not establish that approval through a user wallet works.

## Current implementation and validation

The registry contains 19 chains: the existing XPLA, Sei, and Kaia plus 16 additions. The table describes features connected in app code, not verification of signing and broadcasting through user wallets.

| Chain | Connected wallets | Staking path |
| --- | --- | --- |
| XPLA, Sei, Kaia | MetaMask, WalletConnect | Validator delegation, unstaking, and reward claims. Klip excluded from the Kaia wallet selector |
| Ethereum | MetaMask, WalletConnect | Lido deposits, withdrawal requests and claims; Rocket Pool deposits and direct rETH withdrawals |
| Avalanche | Core, Ledger, WalletConnect (Core Mobile) | P-Chain validator delegation and active stake queries; automatic return at maturity |
| Algorand | Pera, Defly, WalletConnect | Compare Réti validators and pools, stake, and withdraw |
| NEAR | MetaMask NEAR Snap, WalletConnect | Select pools, stake, unstake, and withdraw |
| Celestia, dYdX | Keplr, Cosmostation, WalletConnect | Delegate, redelegate, unstake, and claim rewards |
| Cardano | Lace, Eternl | Register stake keys, delegate to pools, claim rewards, and deregister |
| Polygon | MetaMask, WalletConnect | Delegate POL on Ethereum, unstake, withdraw, and claim rewards |
| IoTeX | MetaMask, WalletConnect | Create native buckets, disable auto-stake, unstake, and withdraw |
| VeChain | VeWorld, Sync2, WalletConnect | Mint StarGate NFTs, delegate, request exits, withdraw VET, and claim VTHO |
| Aptos | Petra, Nightly | Stake in delegation pools, unstake, reactivate, and withdraw |
| MultiversX | DeFi Wallet, xPortal, WalletConnect | Delegate, unstake, withdraw, claim rewards, and restake |
| Sonic | MetaMask, WalletConnect | Delegate, unstake, withdraw, claim rewards, and restake |
| IOTA | IOTA Wallet, Nightly | Stake with validators and withdraw stake objects |
| Sui | Slush, Nightly, WalletConnect | Stake with validators and withdraw stake objects |
| TON | Tonkeeper, MyTonWallet (TON Connect) | Select standard nominator pools, stake, and request full withdrawals |

Avalanche connects to the P-Chain, where staking occurs, rather than the EVM C-Chain. Ledger uses the first address of the first account. Validation checks that at least 14 days of delegation fit within the current validation period, including the current cycle end for auto-renewing validators. Cardano leaves delegated ADA in the wallet, so available and delegated balances are not added together. TON Connect is not labeled WalletConnect. No unverified WalletConnect buttons were added for Aptos, IOTA, or Cardano.

ETH queries service-specific exchange rates and withdrawal limits. Réti checks initial registration costs, pool capacity, minimum balances, and fees through simulation. Réti pools with asset holding requirements show those restrictions and support withdrawals of existing stakes only. TON queries standard nominator-pool contracts and applies pool-specific minimum deposits and processing costs. VeChain displays VET and VTHO separately. USDC rewards on dYdX are also kept separate from DYDX.

Sei calculates an annual percentage rate (APR) using the same issuance period, total delegation, and community tax as its dashboard, then accounts for validator commission. Kaia uses the annual percentage yield (APY) from its validator API. Rates from Réti, NEAR, IOTA, Sui, MultiversX, and Cardano are labeled by source and unit. Sonic APR is not presented as APY in the shared view. Unverified rates are not filled with arbitrary values or 0%.

Public mainnet reads, unsigned transaction construction, and simulations were checked through chain-specific scripts. These included querying 562 Avalanche validators and constructing a 25 AVAX delegation; querying all 100 Polygon validators and simulating unstaking and reward claims; simulating IOTA staking and withdrawal; and simulating MultiversX delegation. Cardano unsigned transactions used real unspent transaction outputs (UTXOs) and the current protocol cost model. VeChain staking was simulated against the actual StarGate contract. TON pool state and outgoing messages were checked, but virtual machine execution was not simulated. Counts reflect the time of verification.

WalletConnect requires `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. At the time of this validation, the value was missing from the working environment and the public project ID had been requested from the user. xPortal also requires this setting. TON wallets read `/tonconnect-manifest.json` from the public service URL, so that URL must be accessible after deployment. The user performs deployment.

At the time of this validation, 131 automated tests, TypeScript checks, lint checks for the new features, and a production build passed. A local production server returned HTTP 200 for all 19 `/stake/[chainId]` pages and the TON Connect manifest. Repository-wide lint still had existing errors in EVM and Klip hooks, among others, and was not reported as passing.

Actual user wallet connections, signing, broadcasting, and browser interactions were not verified. Automated tests do not replace checks requiring external wallets or devices. WalletConnect configuration and real wallet verification remain outstanding, so this is not reported as fully ready for use.

## Official references checked

The ALGO flow obtains an account from Pera, Defly, or an Algorand WalletConnect session, then queries validators and pools from the Réti registry. Delegation checks the minimum stake and first participation cost, then groups a payment to the registry with an app call. Withdrawal is performed against the pool app holding the actual stake. Validate the network, fees, minimum account balance, pool eligibility, non-empty stake, and group simulation result first. Restricted pools are not treated as unrestricted public pools.

- [Official Réti code](https://github.com/algorandfoundation/reti), [Algorand wallet adapters](https://github.com/TxnLab/use-wallet), [Nodely Réti dashboard](https://nodely.io/docs/public/reti)

- [Ethereum staking](https://ethereum.org/staking/), [Lido contracts](https://docs.lido.fi/deployed-contracts/), [Rocket Pool contract usage](https://docs.rocketpool.net/protocol/contracts-usage/)
- [Avalanche](https://build.avax.network/docs/primary-network/validate/how-to-stake), [Algorand](https://algorand.co/staking-rewards-faq), [NEAR](https://github.com/NEAR-DevHub/near-staking)
- [Celestia](https://docs.celestia.org/learn/TIA/staking-governance-supply/), [Cardano](https://docs.cardano.org/about-cardano/learn/delegation), [Polygon](https://polygon.technology/blog/how-do-i-stake-pol-the-token-for-polygon-and-agglayer)
- [IoTeX](https://docs.iotex.io/blockchain/learn-iotex/core-concepts/consensus-mechanism), [VeChain](https://support.stargate.vechain.org/support/solutions/articles/103000380577-stargate-x-hayabusa-faq), [Aptos](https://aptos.dev/network/blockchain/delegated-staking)
- [MultiversX](https://docs.multiversx.com/validators/delegation-manager/), [Sonic](https://docs.soniclabs.com/technology/proof-of-stake), [IOTA](https://www.iota.org/learn/staking), [Sui](https://docs.sui.io/develop/sui-architecture/consensus)
- [TON](https://docs.ton.org/nodes/staking/nominator-pools), [dYdX](https://help.dydx.trade/en/articles/178571-staking-unstaking-on-dydx-chain-interface)
- [Stellar](https://developers.stellar.org/), [Immutable](https://immutable.zendesk.com/hc/en-us/articles/11600988222991-IMX-Token), [ICP](https://internetcomputer.org/network/governance/), [Celo](https://docs.celo.org/operate/specification/l2-migration)

- [Avalanche Helicon delegation requirements](https://build.avax.network/docs/primary-network/helicon-upgrade), [Core P-Chain transaction API](https://docs.core.app/docs/reference/core-methods/), [Active staking queries](https://build.avax.network/docs/api-reference/data-api/primary-network-transactions/listActivePrimaryNetworkStakingTransactions)
- [IoTeX native staking](https://docs.iotex.io/blockchain/build/defi/integrate-iotex-staking), [TON nominator pool contract](https://github.com/ton-blockchain/nominator-pool)

## Pool and liquid staking views

Portfolio now renders account summaries rather than chain-specific transaction screens. Staking lists validators or pools separately from existing positions. See [Liquid staking integrations](liquid-staking.md) for the directly connected platforms, chain-specific withdrawal behavior, availability checks, and validation limits.
