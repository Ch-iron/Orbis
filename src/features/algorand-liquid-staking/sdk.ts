import { Buffer } from 'buffer';

// The official SDK uses the Node Buffer global when decoding consensus state.
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;

export { MainnetConsensusConfig, getConsensusState, convertAlgoToXAlgoWhenImmediate, convertXAlgoToAlgo, prepareImmediateStakeTransactions, prepareUnstakeTransactions } from '@folks-finance/algorand-sdk';
