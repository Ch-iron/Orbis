# 보유 자산 스테이킹 확장

기준일: 2026-11-06. 아래 표는 추가 대상과 구현 조건이다. 표에 포함됐다는 이유로 앱에서 지원 완료된 것은 아니다. 기존 XPLA·Sei·Kaia는 유지한다.

## 대상과 제외 기준

사용자가 보유한 자산 중 지분증명(PoS) 합의를 사용하는 체인을 추가한다. Ethereum은 사용자 선택에 따라 Lido와 Rocket Pool을 모두 연동한다. TON은 검증자가 운영하는 Nominator Pool을 조회하고 선택하는 방식으로 진행한다. Algorand는 서비스 비교 후 사용자가 Réti 검증자 풀을 선택했다.

| 자산 | 구현할 경로 | 특히 확인할 조건 |
| --- | --- | --- |
| ETH | Lido stETH, Rocket Pool rETH | 서비스별 환산·입금 한도·출금 대기·최종 수령 |
| AVAX | P-Chain 검증자 위임 | C-Chain 잔액과 구분, 최소 금액과 종료 시점 |
| ALGO | Réti 검증자 풀 | 풀별 최소 금액·수수료·예치 조건·계정 최소 잔액 |
| NEAR | 검증자 스테이킹 풀 | 계정 이름, 해제 후 출금 단계 |
| TIA | Celestia 검증자 위임 | Cosmos 서명·주소·수수료 |
| ADA | 스테이크 풀 위임 | 잔액 전체 위임, 지출 가능한 잔액과 중복 집계 금지 |
| POL | Ethereum의 Polygon 스테이킹 계약 | POL 토큰 승인, ETH 가스, 출금 단계 |
| IOTX | IoTeX 위임 | 버킷 단위 잠금과 보상 분배 |
| VET | Stargate 검증자 위임 | 스테이킹 NFT, 보상 자산 VTHO |
| APT | Aptos delegation pool | 풀 상태, 잠금·출금 단계 |
| EGLD | MultiversX staking provider | 서비스 수수료, 해제 후 출금 |
| S | Sonic 검증자 위임 | 실제 계약에서 기간·보상·해제 규칙 확인 |
| IOTA | Rebased 검증자 위임 | Move 스테이크 객체, 에포크 상태 |
| SUI | Sui 검증자 위임 | Move 스테이크 객체, 보상 포함 환산 |
| TON | Nominator Pool | 풀별 최소 위임량, 대기 입금, 전체 출금 |
| DYDX | dYdX Chain 검증자 위임 | ethDYDX와 구분, USDC 보상 별도 표시 |

XLM은 Stellar Consensus Protocol을 사용하므로 제외한다. IMX는 롤업의 토큰 보상 프로그램을 독립적인 PoS 검증자 위임으로 취급하지 않는다. ICP의 NNS 뉴런은 거버넌스 투표 스테이킹이므로 이번 PoS 검증자 범위에서는 제외한다. CELO는 L2 전환 후 이전 검증자 합의와 역할이 달라졌으므로 이번 범위에서 제외한다. 이 제외는 해당 자산에 보상 기능이 전혀 없다는 뜻이 아니다.

## 지갑 기준

MetaMask로 실제 거래를 서명할 수 있는 체인은 MetaMask와 WalletConnect를 제공한다. 그 외 체인은 대표 지갑 두 개를 선정하고, 해당 체인과 거래 형식의 WalletConnect 지원을 확인한 경우에만 추가한다. TON Connect를 WalletConnect로 표기하지 않는다. EVM 호환 잔액 조회만 가능하다는 이유로 네이티브 스테이킹까지 지원한다고 판단하지 않는다.

## 구현 전 확인한 실행 흐름

입력 체인과 지갑에서 실제 계정 주소를 얻고, 해당 네트워크의 읽기 API로 잔액·스테이크·출금 요청을 조회한다. 사용자가 액션과 금액을 선택하면 지원 여부·금액·계정·네트워크를 검사하고, 필요한 승인과 거래를 순서대로 서명한다. 거래 영수증 또는 체인별 실행 결과가 성공일 때만 조회를 갱신한다.

현재 EVM 주소를 모든 체인의 Bech32 주소로 변환하는 Overview 경로는 새로운 체인에 그대로 적용할 수 없다. dYdX 보상을 DYDX로 계산하거나, rETH 잔액을 ETH와 1:1로 합산하는 경우도 실패 사례다. 출금 요청과 최종 출금은 분리하고, 완료 시각을 알 수 없는 요청에는 임의 날짜를 만들지 않는다.

각 구현에는 0·빈 값·소수 자릿수·잔액 초과·최소/최대 금액·다른 네트워크·서명 거절·조회 실패·실행 실패·중복 클릭·출금 대기/완료 테스트를 함께 작성한다. 실제 자산 거래는 수행하지 않고 공개 데이터 조회와 시뮬레이션까지 검증한다. 사용자 지갑의 승인 과정은 로컬 테스트만으로 확인됐다고 보고하지 않는다.

## 현재 구현과 검증

등록된 체인은 기존 XPLA·Sei·Kaia와 신규 16개를 합친 19개다. 아래 표는 앱 코드에 연결한 기능이며, 사용자 지갑으로 서명·전송까지 검증했다는 의미는 아니다.

| 체인 | 연결 지갑 | 스테이킹 경로 |
| --- | --- | --- |
| XPLA·Sei·Kaia | MetaMask, WalletConnect | 검증자 위임·해제·보상 수령. Kaia 지갑 선택창에서 Klip 제외 |
| Ethereum | MetaMask, WalletConnect | Lido 입금·출금 요청·수령, Rocket Pool 입금·rETH 직접 출금 |
| Avalanche | Core, Ledger, WalletConnect(Core Mobile) | P-Chain 검증자 위임·활성 예치 조회. 만기에 자동 반환 |
| Algorand | Pera, Defly, WalletConnect | Réti 검증자·풀 비교, 예치·출금 |
| NEAR | MetaMask NEAR Snap, WalletConnect | 풀 선택·예치·해제·출금 |
| Celestia·dYdX | Keplr, Cosmostation, WalletConnect | 검증자 위임·재위임·해제·보상 수령 |
| Cardano | Lace, Eternl | 스테이크 키 등록·풀 위임·보상 수령·등록 해제 |
| Polygon | MetaMask, WalletConnect | Ethereum의 POL 위임·해제·출금·보상 수령 |
| IoTeX | MetaMask, WalletConnect | 네이티브 버킷 생성·자동 예치 해제·언스테이크·출금 |
| VeChain | VeWorld, Sync2, WalletConnect | StarGate NFT 발급·위임·종료 요청·VET 출금·VTHO 수령 |
| Aptos | Petra, Nightly | 위임 풀 예치·해제·재활성화·출금 |
| MultiversX | DeFi Wallet, xPortal, WalletConnect | 위임·해제·출금·보상 수령·재예치 |
| Sonic | MetaMask, WalletConnect | 검증자 위임·해제·출금·보상 수령·재예치 |
| IOTA | IOTA Wallet, Nightly | 검증자 예치·예치 객체 출금 |
| Sui | Slush, Nightly, WalletConnect | 검증자 예치·예치 객체 출금 |
| TON | Tonkeeper, MyTonWallet (TON Connect) | 표준 nominator pool 선택·예치·전체 출금 요청 |

Avalanche는 EVM C-Chain 대신 실제 스테이킹이 이루어지는 P-Chain에 연결한다. Ledger는 첫 번째 계정의 첫 주소를 사용한다. 현재 검증 기간 안에 최소 14일 위임이 가능한지 확인하며, 자동 갱신 검증자도 현재 주기의 종료 시각을 기준으로 검사한다. Cardano는 ADA가 지갑에 남아 있는 위임 방식이므로 사용 가능 잔액과 위임 잔액을 더하지 않는다. TON Connect를 WalletConnect로 표시하지 않으며, Aptos·IOTA·Cardano에는 확인하지 못한 WalletConnect 버튼을 추가하지 않았다.

ETH는 서비스별 환산율과 출금 한도를 조회한다. Réti는 최초 등록 비용·풀 정원·최소 잔액·수수료를 시뮬레이션으로 확인한다. 별도 자산 보유 조건이 있는 Réti 풀은 조건을 표시하고 기존 예치의 출금만 제공한다. TON은 표준 nominator pool 계약을 조회하며, 풀마다 다른 최소 예치금과 처리 비용을 적용한다. VeChain은 VET와 VTHO를 별도로 표시한다. dYdX의 USDC 보상도 DYDX와 합산하지 않는다.

Sei 수익률은 대시보드와 같은 발행 기간·위임 총량·커뮤니티 세금에서 연간 단리 수익률(APR)을 계산하고 검증자 수수료를 반영한다. Kaia는 검증자 API의 연간 복리 수익률(APY)을 사용한다. Réti·NEAR·IOTA·Sui·MultiversX·Cardano 등에서 제공되는 수익률은 출처와 단위를 구분한다. Sonic의 APR을 통합 화면의 APY로 표시하지 않는다. 출처를 확인하지 못한 수익률은 임의 값이나 0%로 채우지 않는다.

공개 메인넷 조회와 서명 없는 거래 생성·시뮬레이션을 체인별 점검 스크립트로 확인했다. Avalanche 검증자 562개 조회와 25 AVAX 위임 거래 생성, Polygon 검증자 100개 전체 조회와 해제·보상 수령 시뮬레이션, IOTA 예치·출금 시뮬레이션, MultiversX 위임 시뮬레이션을 포함한다. Cardano는 실제 UTXO와 현재 프로토콜 비용 모델로 서명 전 거래를 생성했다. VeChain은 실제 StarGate 계약의 예치를 시뮬레이션했다. TON은 풀 상태와 전송 메시지를 검증했으며 VM 실행 시뮬레이션은 하지 않았다. 수치는 확인 당시 값이다.

WalletConnect 사용에는 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 설정이 필요하다. 현재 작업 환경에는 이 값이 없어 사용자에게 공개 Project ID를 요청한 상태다. xPortal도 이 설정이 필요하다. TON 지갑은 서비스의 공개 주소에서 `/tonconnect-manifest.json`을 읽으므로 배포 후 해당 주소 접근이 가능해야 한다. 배포는 사용자가 수행한다.

131개 자동 테스트, TypeScript 검사, 신규 기능 린트 검사와 프로덕션 빌드를 통과했다. 로컬 프로덕션 서버에서 19개 `/stake/[chainId]` 페이지와 TON Connect manifest의 HTTP 200 응답을 확인했다. 전체 저장소 린트에는 기존 EVM·Klip 훅 등의 오류가 남아 있어 전체 린트 통과로 보고하지 않는다.

실제 사용자 지갑 연결·서명·전송과 브라우저 조작은 검증하지 않았다. 외부 지갑과 기기가 필요한 검증을 자동 테스트 통과로 대신했다고 주장하지 않는다. WalletConnect 설정과 실제 지갑 검증이 남아 있으므로 전체 사용 준비 완료로 보고하지 않는다.

## 확인한 공식 자료

ALGO 실행 경로는 Pera·Defly 또는 Algorand WalletConnect 세션에서 계정을 얻고, Réti 레지스트리에서 검증자·풀을 조회하는 순서다. 위임은 최소 금액과 첫 참여 비용을 확인한 뒤 레지스트리로 보내는 입금 거래와 앱 호출을 한 그룹으로 묶는다. 해제는 실제 스테이크를 가진 풀 앱에서 수행한다. 다른 네트워크, 수수료·최소 잔액 부족, 예치 조건을 충족하지 않은 풀, 빈 스테이크, 그룹 시뮬레이션 실패를 먼저 검사한다. 조건이 있는 풀을 일반 공개 풀처럼 처리하지 않는다.

- [Réti 공식 코드](https://github.com/algorandfoundation/reti), [Algorand 지갑 어댑터](https://github.com/TxnLab/use-wallet), [Nodely Réti 대시보드](https://nodely.io/docs/public/reti)

- [Ethereum 스테이킹](https://ethereum.org/staking/), [Lido 계약](https://docs.lido.fi/deployed-contracts/), [Rocket Pool 계약 사용](https://docs.rocketpool.net/protocol/contracts-usage/)
- [Avalanche](https://build.avax.network/docs/primary-network/validate/how-to-stake), [Algorand](https://algorand.co/staking-rewards-faq), [NEAR](https://github.com/NEAR-DevHub/near-staking)
- [Celestia](https://docs.celestia.org/learn/TIA/staking-governance-supply/), [Cardano](https://docs.cardano.org/about-cardano/learn/delegation), [Polygon](https://polygon.technology/blog/how-do-i-stake-pol-the-token-for-polygon-and-agglayer)
- [IoTeX](https://docs.iotex.io/blockchain/learn-iotex/core-concepts/consensus-mechanism), [VeChain](https://support.stargate.vechain.org/support/solutions/articles/103000380577-stargate-x-hayabusa-faq), [Aptos](https://aptos.dev/network/blockchain/delegated-staking)
- [MultiversX](https://docs.multiversx.com/validators/delegation-manager/), [Sonic](https://docs.soniclabs.com/technology/proof-of-stake), [IOTA](https://www.iota.org/learn/staking), [Sui](https://docs.sui.io/develop/sui-architecture/consensus)
- [TON](https://docs.ton.org/nodes/staking/nominator-pools), [dYdX](https://help.dydx.trade/en/articles/178571-staking-unstaking-on-dydx-chain-interface)
- [Stellar](https://developers.stellar.org/), [Immutable](https://immutable.zendesk.com/hc/en-us/articles/11600988222991-IMX-Token), [ICP](https://internetcomputer.org/network/governance/), [Celo](https://docs.celo.org/operate/specification/l2-migration)

- [Avalanche Helicon 위임 조건](https://build.avax.network/docs/primary-network/helicon-upgrade), [Core P-Chain 거래 API](https://docs.core.app/docs/reference/core-methods/), [활성 예치 조회](https://build.avax.network/docs/api-reference/data-api/primary-network-transactions/listActivePrimaryNetworkStakingTransactions)
- [IoTeX 네이티브 스테이킹](https://docs.iotex.io/blockchain/build/defi/integrate-iotex-staking), [TON nominator pool 계약](https://github.com/ton-blockchain/nominator-pool)
