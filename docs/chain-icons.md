# Chain icon sources

Verified on 2026-11-09. Original logos are stored in the repository so the app does not depend on external image servers at runtime. Chain configuration and wallet connection metadata use the same local files.

| Chain | Local file | Source |
| --- | --- | --- |
| algorand | `/chains/algorand.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/algorand/info/logo.png) |
| aptos | `/chains/aptos.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aptos/info/logo.png) |
| avalanche | `/chains/avalanche.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchex/info/logo.png) |
| cardano | `/chains/cardano.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cardano/info/logo.png) |
| celestia | `/chains/celestia.svg` | [Source](https://raw.githubusercontent.com/cosmos/chain-registry/master/celestia/images/celestia.svg) |
| dydx | `/chains/dydx.svg` | [Source](https://raw.githubusercontent.com/cosmos/chain-registry/master/dydx/images/dydx.svg) |
| ethereum | `/chains/ethereum.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png) |
| iota | `/chains/iota.png` | [Source](https://assets.iota.org/iota-symbol-(blue-circle)-312) |
| iotex | `/chains/iotex.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/iotex/info/logo.png) |
| kaia | `/chains/kaia.png` | [Source](https://raw.githubusercontent.com/kaiachain/kaia-docs/main/static/img/favicon.ico) |
| multiversx | `/chains/multiversx.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/elrond/info/logo.png) |
| near | `/chains/near.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/near/info/logo.png) |
| polygon | `/chains/polygon.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png) |
| sei | `/chains/sei.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sei/info/logo.png) |
| sonic | `/chains/sonic.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sonic/info/logo.png) |
| sui | `/chains/sui.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png) |
| ton | `/chains/ton.png` | [Source](https://ton.org/assets/media/ton_logo.zip) |
| vechain | `/chains/vechain.png` | [Source](https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/vechain/info/logo.png) |
| xpla | `/chains/xpla.svg` | [Source](https://raw.githubusercontent.com/cosmos/chain-registry/master/xpla/images/xpla.svg) |

The TON image is the original 160×160 PNG symbol extracted from the official logo SVG. It distinguishes the TON chain logo from the Gram token logo. XPLA uses the current chain registry logo instead of the previous C2X image. The `elrond` path in the Trust Wallet repository corresponds to MultiversX in its metadata. The official Kaia `favicon.ico` is actually a PNG, so its original bytes are stored as `kaia.png`.

The existing Celestia and dYdX SVGs match their sources and were retained. Kaia uses the icon from its official documentation site. The IOTA name and logo are trademarks of the IOTA Foundation. Each project retains rights to its logo; the logos are used to identify chains within the service.

- [Kaia brand guidelines](https://docs.kaia.io/misc/brand/)
- [IOTA trademark policy](https://www.iota.org/trademark)
- [TON media resources](https://ton.org/media/)
