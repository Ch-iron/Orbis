type ConnectionRequest = {
  selectedConnectorId: string;
  activeConnectorId: string | undefined;
  activeChainId: number | undefined;
  targetChainId: number;
  connect: () => Promise<{ chainId: number }>;
  switchChain: () => Promise<{ id: number }>;
  activate: () => void;
};

export async function connectSelectedWallet(request: ConnectionRequest) {
  let chainId = request.activeChainId;
  if (request.activeConnectorId !== request.selectedConnectorId) {
    chainId = (await request.connect()).chainId;
  }
  if (chainId !== request.targetChainId) {
    const chain = await request.switchChain();
    if (chain.id !== request.targetChainId) {
      throw new Error('The wallet did not switch to the selected network.');
    }
  }
  request.activate();
}
