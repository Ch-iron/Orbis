import { Buffer } from 'buffer';
import type { UnsignedTx } from '@avalabs/avalanchejs';
import { avalancheP, validatePAddress } from '@/lib/chains/avalanche/client';

export async function connectAvalancheLedger() {
  const [{ DeviceManagementKitBuilder }, { webHidTransportFactory }, { default: AvalancheApp }] = await Promise.all([
    import('@ledgerhq/device-management-kit'), import('@ledgerhq/device-transport-kit-web-hid'), import('@avalabs/hw-app-avalanche'),
  ]);
  const kit = new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build();
  const device = await new Promise<import('@ledgerhq/device-management-kit').DiscoveredDevice>((resolve, reject) => {
    const subscription = kit.startDiscovering({}).subscribe({ next: (item) => { resolve(item); subscription.unsubscribe(); }, error: reject, complete: () => reject(new Error('Ledger 장치를 선택하지 않았습니다.')) });
  });
  const sessionId = await kit.connect({ device, sessionRefresherOptions: { isRefresherDisabled: true } });
  const app = new AvalancheApp({ send: async (cla, ins, p1, p2, data = Buffer.alloc(0)) => {
    if (data.length > 255) throw new Error('Ledger APDU 데이터가 너무 큽니다.');
    const response = await kit.sendApdu({ sessionId, apdu: Buffer.concat([Buffer.from([cla, ins, p1, p2, data.length]), data]) });
    return Buffer.concat([Buffer.from(response.data), Buffer.from(response.statusCode)]);
  } });
  const disconnect = () => kit.disconnect({ sessionId });
  try {
    const account = await app.getAddressAndPubKey("m/44'/9000'/0'/0/0", true, 'avax');
    if (account.returnCode !== 0x9000 || !account.address) throw new Error(account.errorMessage);
    const address = validatePAddress(account.address.startsWith('P-') ? account.address : `P-${account.address}`);
    return { address, disconnect, send: async (transaction: UnsignedTx) => {
      const current = await app.getAddressAndPubKey("m/44'/9000'/0'/0/0", false, 'avax');
      if (current.returnCode !== 0x9000 || current.address !== account.address) throw new Error('Ledger 계정이 변경되었습니다.');
      const result = await app.sign("m/44'/9000'/0'", ['0/0'], Buffer.from(transaction.toBytes()), ['0/0']);
      if (result.returnCode !== 0x9000 || !result.signatures) throw new Error(result.errorMessage);
      for (const signature of result.signatures.values()) transaction.addSignature(signature);
      if (!transaction.hasAllSignatures()) throw new Error('Ledger 거래 서명이 부족합니다.');
      return (await avalancheP.issueSignedTx(transaction.getSignedTx())).txID;
    } };
  } catch (error) { await disconnect(); throw error; }
}
