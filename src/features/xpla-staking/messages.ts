import { MsgDelegate, MsgUndelegate, MsgBeginRedelegate, MsgWithdrawDelegatorReward, MsgSend } from '@xpla/xpla.js';

export function toXplaMessages(messages: unknown[]) {
  if (messages.length === 0) throw new Error('No XPLA transaction messages provided');
  return messages.map((message) => {
    if (
      message instanceof MsgDelegate || message instanceof MsgUndelegate ||
      message instanceof MsgBeginRedelegate || message instanceof MsgWithdrawDelegatorReward ||
      message instanceof MsgSend
    ) return message;
    throw new Error('Unsupported XPLA transaction message');
  });
}
