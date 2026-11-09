// Kaia RPC client using fetch-based JSON-RPC and Kaiascan API

import { KAIA_RPC_URLS, KAIA_KAIASCAN_API_URL, KAIA_SQUARE_API_URL } from './constants';
import { CN_STAKING_V3_ABI, PUBLIC_DELEGATION_ABI } from './contracts';
import { createPublicClient, http, fallback } from 'viem';
import { klaytn } from 'viem/chains';
import type { Address } from 'viem';

// kaia_getStakingInfo RPC response
type KaiaStakingInfoResult = {
  councilNodeAddrs: string[];
  councilStakingAddrs: string[];
};

// Kaiascan transaction list item
type KaiascanTxItem = {
  txHash: string;
  blockNumber: number;
  createdAt: string;
  from: string;
  to: string;
  value: string;
  methodId: string;
  txType: string;
  status: number;
};

type KaiascanTxListResponse = {
  results: KaiascanTxItem[];
  totalCount: number;
};

// Kaia Square API council member (from /v1/page/councils/main)
type KaiaSquareCouncil = {
  name: string;
  address: string;
  thumbnail: string;
  validator: boolean;
  staking: {
    total_staking: string; // KAIA units (not peb), e.g. "998310334"
    apy: string; // percentage string, e.g. "5.09" = 5.09%
  };
};

// Resolved council entry from Square API + RPC PD resolution
type CouncilEntry = {
  nodeAddress: string;
  name: string;
  thumbnail: string;
  totalStaking: string;
  apy: number;
  commission: number;
  pdAddress: string | null;
  cnStakingAddress: string | null;
};

// Withdrawal request info from PublicDelegation contract
type WithdrawalRequest = {
  requestId: bigint;
  withdrawableFrom: bigint;
  amount: bigint;
  claimed: boolean;
};

type KaiaClient = {
  getCouncilList: () => Promise<CouncilEntry[]>;
  getUserShares: (pdAddress: Address, userAddress: Address) => Promise<bigint>;
  convertToAssets: (pdAddress: Address, shares: bigint) => Promise<bigint>;
  getCommissionRate: (pdAddress: Address) => Promise<number>;
  getBalance: (address: Address) => Promise<bigint>;
  getWithdrawalRequests: (pdAddress: Address, userAddress: Address) => Promise<WithdrawalRequest[]>;
  getTransactionHistory: (address: string, page: number, limit: number) => Promise<KaiascanTxListResponse>;
};

// viem public client for contract reads with fallback transports
const viemClient = createPublicClient({
  chain: klaytn,
  transport: fallback(KAIA_RPC_URLS.map((url) => http(url))),
});

const createKaiaClient = (): KaiaClient => {
  const getStakingInfo = async (): Promise<KaiaStakingInfoResult | null> => {
    for (const rpcUrl of KAIA_RPC_URLS) {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'kaia_getStakingInfo',
          params: ['latest'],
          id: 1,
        }),
      }).catch(() => null);

      if (!response?.ok) {
        continue;
      }

      const data = await response.json().catch(() => null);
      const result = data?.result as KaiaStakingInfoResult | undefined;

      if (result?.councilNodeAddrs && result?.councilStakingAddrs) {
        return result;
      }
    }

    console.error('kaia staking info: all RPC endpoints failed');
    return null;
  };

  // Fetch council list from Square API (primary source for validator metadata)
  const fetchSquareCouncils = async (): Promise<KaiaSquareCouncil[]> => {
    const response = await fetch(
      `${KAIA_SQUARE_API_URL}/v1/page/councils/main`,
    ).catch((fetchError) => {
      console.error('kaia square council fetch error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return [];
    }

    type SquareApiResponse = {
      code: number;
      result: {
        councils: KaiaSquareCouncil[];
      };
    };

    const data: SquareApiResponse | null = await response.json().catch((parseError) => {
      console.error('kaia square council parse error', parseError);
      return null;
    });

    return data?.result?.councils ?? [];
  };

  type PdInfo = {
    pdAddress: string;
    cnStakingAddress: string;
    commission: number;
  };

  // Resolve PD addresses + commission for nodeAddresses via RPC staking info + multicall
  const resolvePdInfo = async (
    nodeAddresses: string[],
  ): Promise<Map<string, PdInfo>> => {
    const pdMap = new Map<string, PdInfo>();

    const stakingInfo = await getStakingInfo();

    if (!stakingInfo) {
      return pdMap;
    }

    // Build nodeAddress → cnStakingAddress lookup
    const nodeToCnStaking = new Map<string, string>();
    for (const [index, nodeAddr] of stakingInfo.councilNodeAddrs.entries()) {
      const cnStakingAddr = stakingInfo.councilStakingAddrs[index];
      if (cnStakingAddr) {
        nodeToCnStaking.set(nodeAddr.toLowerCase(), cnStakingAddr);
      }
    }

    // Filter to only the cnStaking addresses we need
    const targetEntries = nodeAddresses
      .map((nodeAddr) => ({
        nodeAddress: nodeAddr.toLowerCase(),
        cnStakingAddress: nodeToCnStaking.get(nodeAddr.toLowerCase()),
      }))
      .filter(
        (entry): entry is { nodeAddress: string; cnStakingAddress: string } =>
          entry.cnStakingAddress !== undefined,
      );

    if (targetEntries.length === 0) {
      return pdMap;
    }

    // Step 1: resolve PD addresses from cnStaking contracts
    const pdContracts = targetEntries.map((entry) => ({
      address: entry.cnStakingAddress as Address,
      abi: CN_STAKING_V3_ABI,
      functionName: 'publicDelegation' as const,
    }));

    const pdResults = await viemClient.multicall({ contracts: pdContracts }).catch((multicallError) => {
      console.error('kaia multicall publicDelegation error', multicallError);
      return null;
    });

    if (!pdResults) {
      return pdMap;
    }

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // Collect entries that have valid PD addresses for commission lookup
    type ResolvedEntry = { nodeAddress: string; cnStakingAddress: string; pdAddress: string };
    const resolvedEntries: ResolvedEntry[] = [];

    for (const [index, entry] of targetEntries.entries()) {
      const result = pdResults[index];
      if (result?.status === 'success' && result.result && result.result !== ZERO_ADDRESS) {
        resolvedEntries.push({
          ...entry,
          pdAddress: result.result as string,
        });
      }
    }

    if (resolvedEntries.length === 0) {
      return pdMap;
    }

    // Step 2: batch fetch commissionRate from PD contracts
    const commissionContracts = resolvedEntries.map((entry) => ({
      address: entry.pdAddress as Address,
      abi: PUBLIC_DELEGATION_ABI,
      functionName: 'commissionRate' as const,
    }));

    const commissionResults = await viemClient.multicall({ contracts: commissionContracts }).catch((multicallError) => {
      console.error('kaia multicall commissionRate error', multicallError);
      return null;
    });

    for (const [index, entry] of resolvedEntries.entries()) {
      const commissionResult = commissionResults?.[index];
      // Commission rate is in basis points (e.g. 1000 = 10%)
      const commission = commissionResult?.status === 'success'
        ? Number(commissionResult.result) / 10000
        : 0;

      pdMap.set(entry.nodeAddress, {
        pdAddress: entry.pdAddress,
        cnStakingAddress: entry.cnStakingAddress,
        commission,
      });
    }

    return pdMap;
  };

  // Main entry: Square API for metadata + RPC for PD addresses
  const getCouncilList = async (): Promise<CouncilEntry[]> => {
    const councils = await fetchSquareCouncils();
    const validators = councils.filter((council) => council.validator);

    if (validators.length === 0) {
      return [];
    }

    const nodeAddresses = validators.map((validator) => validator.address);
    const pdMap = await resolvePdInfo(nodeAddresses);

    return validators.map((validator) => {
      const pdInfo = pdMap.get(validator.address.toLowerCase());

      return {
        nodeAddress: validator.address,
        name: validator.name,
        thumbnail: validator.thumbnail,
        totalStaking: validator.staking.total_staking,
        apy: parseFloat(validator.staking.apy) / 100,
        commission: pdInfo?.commission ?? 0,
        pdAddress: pdInfo?.pdAddress ?? null,
        cnStakingAddress: pdInfo?.cnStakingAddress ?? null,
      };
    });
  };

  const getUserShares = async (pdAddress: Address, userAddress: Address): Promise<bigint> => {
    const result = await viemClient.readContract({
      address: pdAddress,
      abi: PUBLIC_DELEGATION_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }).catch((readError) => {
      console.error('kaia balanceOf read error', readError);
      return BigInt(0);
    });

    return result as bigint;
  };

  const convertToAssets = async (pdAddress: Address, shares: bigint): Promise<bigint> => {
    if (shares === BigInt(0)) {
      return BigInt(0);
    }

    const result = await viemClient.readContract({
      address: pdAddress,
      abi: PUBLIC_DELEGATION_ABI,
      functionName: 'convertToAssets',
      args: [shares],
    }).catch((readError) => {
      console.error('kaia convertToAssets read error', readError);
      return BigInt(0);
    });

    return result as bigint;
  };

  const getCommissionRate = async (pdAddress: Address): Promise<number> => {
    const result = await viemClient.readContract({
      address: pdAddress,
      abi: PUBLIC_DELEGATION_ABI,
      functionName: 'commissionRate',
    }).catch((readError) => {
      console.error('kaia commissionRate read error', readError);
      return BigInt(0);
    });

    // Commission rate is in basis points (e.g. 1000 = 10%)
    return Number(result) / 10000;
  };

  const getBalance = async (address: Address): Promise<bigint> => {
    const result = await viemClient.getBalance({ address }).catch((readError) => {
      console.error('kaia getBalance error', readError);
      return BigInt(0);
    });

    return result;
  };

  const getWithdrawalRequests = async (
    pdAddress: Address,
    userAddress: Address,
  ): Promise<WithdrawalRequest[]> => {
    const requestIds = await viemClient.readContract({
      address: pdAddress,
      abi: PUBLIC_DELEGATION_ABI,
      functionName: 'getRequestIds',
      args: [userAddress],
    }).catch(() => {
      // Some PD contracts revert when user has no withdrawal requests
      return [] as bigint[];
    });

    if (!requestIds || (requestIds as bigint[]).length === 0) {
      return [];
    }

    const requests = await Promise.all(
      (requestIds as bigint[]).map(async (requestId) => {
        const info = await viemClient.readContract({
          address: pdAddress,
          abi: PUBLIC_DELEGATION_ABI,
          functionName: 'getRequestInfo',
          args: [requestId],
        }).catch((readError) => {
          console.error('kaia getRequestInfo read error', readError);
          return null;
        });

        if (!info) {
          return null;
        }

        const [withdrawableFrom, amount, claimed] = info as [bigint, bigint, boolean];

        return {
          requestId,
          withdrawableFrom,
          amount,
          claimed,
        };
      }),
    );

    return requests.filter((request): request is WithdrawalRequest => request !== null);
  };

  const getTransactionHistory = async (
    address: string,
    page: number,
    limit: number,
  ): Promise<KaiascanTxListResponse> => {
    const response = await fetch(
      `${KAIA_KAIASCAN_API_URL}/v1/accounts/${encodeURIComponent(address)}/txs?page=${page}&limit=${limit}`,
    ).catch((fetchError) => {
      console.error('kaia tx history fetch error', fetchError);
      return null;
    });

    if (!response?.ok) {
      return { results: [], totalCount: 0 };
    }

    const data: KaiascanTxListResponse | null = await response.json().catch((parseError) => {
      console.error('kaia tx history parse error', parseError);
      return null;
    });

    return data ?? { results: [], totalCount: 0 };
  };

  return {
    getCouncilList,
    getUserShares,
    convertToAssets,
    getCommissionRate,
    getBalance,
    getWithdrawalRequests,
    getTransactionHistory,
  };
};

export { createKaiaClient };
export type { KaiaClient, CouncilEntry, KaiascanTxItem, WithdrawalRequest };
