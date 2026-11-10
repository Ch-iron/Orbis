# Liquid staking integrations

The Staking page separates validator or pool delegation from liquid staking. Portfolio remains an account overview. Switching staking modes preserves an in-flight transaction; changing chains remounts the chain-specific view after the selected chain store has updated.

## Supported paths

| Chain | Platform | Deposit | Withdrawal |
| --- | --- | --- | --- |
| Ethereum | Lido, Rocket Pool | ETH to stETH or rETH | Lido request and claim; Rocket Pool direct redemption subject to liquidity |
| Avalanche | BENQI | C-Chain AVAX to sAVAX | Contract cooldown and redemption window; recover sAVAX after an expired window |
| Algorand | Folks Finance | ALGO to xALGO, with asset opt-in when needed | Immediate xALGO redemption; simulated transaction group and minimum received amount |
| NEAR | LiNEAR | NEAR to LiNEAR | Request in NEAR value, then withdraw when available |
| Sui | Haedal | SUI to haSUI | Delayed unstake ticket and claim |
| IOTA | Swirl | IOTA to stIOTA | Immediate redemption through the native pool |
| Sonic | Beets | S to stS | Pool or validator withdrawal, then claim |
| TON | Tonstakers | TON to tsTON | Burn tsTON; withdrawal NFTs track the protocol's automatic payout |
| IoTeX | Bedrock | IOTX to uniIOTX | Redeem in IOTX increments, then claim from the clearing contract |
| Aptos | Amnis | APT directly to stAPT | stAPT to amAPT, separate withdrawal request, then ticket claim |
| Kaia | Lair | KAIA to stKAIA through a selected GC node | Select a node, request withdrawal, then claim |
| Polygon | stake.link | Ethereum POL to stPOL | Immediate payment or withdrawal queue, then claim finalized requests |
| MultiversX | XOXNO | EGLD to xEGLD | Immediate liquidity first; remaining amount becomes an unbonding token for later claim |

Polygon direct deposits do not enter stake.link's deposit queue. If available capacity changes before execution, the contract returns any unprocessed POL. Existing queued deposits created outside Orbis are not managed by this integration. POL and stPOL approvals target the PriorityPool; withdrawals use the separate WithdrawalPool. Ethereum gas is required.

BENQI uses the cooldown and claim-window interface deployed on its sAVAX contract. The newer generic FIFO description in some BENQI documentation is not used to construct these transactions. Avalanche native delegation remains on the P-Chain; BENQI uses an EVM wallet on the C-Chain.

Amnis requires two distinct redemption steps before the final claim. Unstaking stAPT returns amAPT, which stops accruing staking rewards. The separate withdrawal request consumes amAPT. The UI displays both balances and existing withdrawal tickets.

## Availability checked on 2026-11-09

Sei, XPLA, Celestia, Cardano, VeChain, and dYdX retain their native staking views without an enabled liquid staking tab. This means no active direct integration is provided for these chains; it is not a claim that no other platform exists.

- [Silo](https://app.silostaking.io/) announced its wind-down. Its old deposit flow is not enabled.
- [Stride](https://app.stride.zone/) closed new liquid staking and redemption requests as part of its wind-down. [Quicksilver](https://app.quicksilver.zone/staking) also disabled deposits and normal redemptions. They are not offered as new Celestia or dYdX staking destinations.
- Cardano native delegation already leaves ADA spendable in the wallet. VeChain uses its existing StarGate NFTs. No separate verified liquid platform is integrated for XPLA.
- Hatom is not integrated. The MultiversX liquid path uses XOXNO's public contracts instead.

## Validation and remaining limits

Tests cover transaction amounts and encodings, insufficient balances, paused protocols, withdrawal ownership and readiness, account and network changes, duplicate submissions, and simulation or receipt failures. Shared UI tests cover search, empty and error states, pool versus position tabs, chain changes, and mode changes while transactions are pending.

Public mainnet reads succeeded for LiNEAR, Haedal, Swirl, Beets, Tonstakers, Bedrock, Amnis, BENQI, Folks xALGO, Lair, stake.link stPOL, and XOXNO using the actual data clients. Lair's one-based node pages differ from its zero-based withdrawal pages; a regression test covers both and account-local claim indices.

Validation passed: 243 automated tests, TypeScript, production build, and repository lint with no errors (one pre-existing unused-variable warning). Portfolio and all 19 staking routes returned HTTP 200 with English HTML metadata. An unsigned XOXNO deposit also passed the mainnet transaction simulation.

Automated tests and read-only queries do not establish that an external wallet will connect or complete a signed transaction. No user funds were signed for or transferred during validation. Browser automation was unavailable because the browser access host could not be reached. Liquid positions are shown in their platform views; the shared Portfolio aggregation still reports native staking positions.

## Contract references

- [LiNEAR contracts](https://github.com/linear-protocol/LiNEAR)
- [Haedal interface](https://github.com/haedallsd/haedal-protocol-interface)
- [Swirl contract details](https://docs.swirlstake.com/tech/iota-contract-infrastructure/contract-details/)
- [Beets Sonic staking](https://github.com/beethovenxfi/sonic-staking)
- [Tonstakers SDK](https://github.com/tonstakers/tonstakers-sdk)
- [Bedrock uniIOTX contracts](https://github.com/Bedrock-Technology/uniiotx)
- [Amnis contracts](https://github.com/amnis-finance/amnis-contract-core), with the deployed router ABI and package source read from Aptos mainnet
- [BENQI sAVAX](https://snowtrace.io/address/0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be/contract/43114/code)
- [Folks Finance Algorand SDK](https://github.com/Folks-Finance/algorand-js-sdk)
- [Lair withdrawal documentation](https://lair-finance.gitbook.io/lair-finance/liquid-staking/unstake-and-claim), with ABI and addresses from its official app
- [stake.link deployments](https://docs.stake.link/resources/contracts-and-integrations/), [contracts](https://github.com/stakedotlink/contracts)
- [XOXNO contracts](https://github.com/XOXNO/rs-liquid-staking-sc), including its mainnet interaction configuration
