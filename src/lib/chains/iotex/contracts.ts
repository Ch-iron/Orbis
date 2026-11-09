// Official IIP-12 interface: iotexproject/iip12-contracts, learn/abi/NativeStaking.abi.
export const STAKING = '0x04c22afae6a03438b8fed74cb1cf441168df3f12' as const;
export const STAKING_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "candName",
        "type": "string"
      },
      {
        "internalType": "uint64",
        "name": "bucketIndex",
        "type": "uint64"
      },
      {
        "internalType": "uint8[]",
        "name": "data",
        "type": "uint8[]"
      }
    ],
    "name": "changeCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "candName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "duration",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "autoStake",
        "type": "bool"
      },
      {
        "internalType": "uint8[]",
        "name": "data",
        "type": "uint8[]"
      }
    ],
    "name": "createStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "bucketIndex",
        "type": "uint64"
      },
      {
        "internalType": "uint32",
        "name": "duration",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "autoStake",
        "type": "bool"
      },
      {
        "internalType": "uint8[]",
        "name": "data",
        "type": "uint8[]"
      }
    ],
    "name": "restake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "bucketIndex",
        "type": "uint64"
      },
      {
        "internalType": "uint8[]",
        "name": "data",
        "type": "uint8[]"
      }
    ],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "bucketIndex",
        "type": "uint64"
      },
      {
        "internalType": "uint8[]",
        "name": "data",
        "type": "uint8[]"
      }
    ],
    "name": "withdrawStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64[]",
        "name": "indexes",
        "type": "uint64[]"
      }
    ],
    "name": "bucketsByIndexes",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "index",
            "type": "uint64"
          },
          {
            "internalType": "address",
            "name": "candidateAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "stakedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint32",
            "name": "stakedDuration",
            "type": "uint32"
          },
          {
            "internalType": "int64",
            "name": "createTime",
            "type": "int64"
          },
          {
            "internalType": "int64",
            "name": "stakeStartTime",
            "type": "int64"
          },
          {
            "internalType": "int64",
            "name": "unstakeStartTime",
            "type": "int64"
          },
          {
            "internalType": "bool",
            "name": "autoStake",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "internalType": "struct IStaking.VoteBucket[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "voter",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "offset",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "limit",
        "type": "uint32"
      }
    ],
    "name": "bucketsByVoter",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "index",
            "type": "uint64"
          },
          {
            "internalType": "address",
            "name": "candidateAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "stakedAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint32",
            "name": "stakedDuration",
            "type": "uint32"
          },
          {
            "internalType": "int64",
            "name": "createTime",
            "type": "int64"
          },
          {
            "internalType": "int64",
            "name": "stakeStartTime",
            "type": "int64"
          },
          {
            "internalType": "int64",
            "name": "unstakeStartTime",
            "type": "int64"
          },
          {
            "internalType": "bool",
            "name": "autoStake",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          }
        ],
        "internalType": "struct IStaking.VoteBucket[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "candName",
        "type": "string"
      }
    ],
    "name": "candidateByName",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "ownerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "operatorAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "totalWeightedVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "selfStakeBucketIdx",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "selfStakingTokens",
            "type": "uint256"
          }
        ],
        "internalType": "struct IStaking.Candidate",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "offset",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "limit",
        "type": "uint32"
      }
    ],
    "name": "candidates",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "ownerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "operatorAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "rewardAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "totalWeightedVotes",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "selfStakeBucketIdx",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "selfStakingTokens",
            "type": "uint256"
          }
        ],
        "internalType": "struct IStaking.Candidate[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
