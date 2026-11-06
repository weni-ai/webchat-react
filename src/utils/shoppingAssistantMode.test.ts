import { applyShoppingAssistantMode } from './shoppingAssistantMode';
import {
  SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID,
  SHOPPING_ASSISTANT_DISABLED_SOCKET_URL,
} from './constants';

describe('applyShoppingAssistantMode', () => {
  it('returns the same config when the flag is off', () => {
    const config = {
      shoppingAssistantDisabled: false,
      socketUrl: 'wss://socket.example',
      channelUuid: 'channel-1',
      connectOn: 'mount',
    };

    expect(applyShoppingAssistantMode(config)).toBe(config);
  });

  it('fills missing connection values and forces manual connect', () => {
    const result = applyShoppingAssistantMode({
      shoppingAssistantDisabled: true,
      socketUrl: '',
      channelUuid: '   ',
      connectOn: 'demand',
    });

    expect(result).toEqual({
      shoppingAssistantDisabled: true,
      socketUrl: SHOPPING_ASSISTANT_DISABLED_SOCKET_URL,
      channelUuid: SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID,
      connectOn: 'manual',
    });
  });

  it('keeps a non-empty host socketUrl and channelUuid', () => {
    const result = applyShoppingAssistantMode({
      shoppingAssistantDisabled: true,
      socketUrl: 'wss://socket.example',
      channelUuid: 'channel-1',
      connectOn: 'mount',
    });

    expect(result.socketUrl).toBe('wss://socket.example');
    expect(result.channelUuid).toBe('channel-1');
    expect(result.connectOn).toBe('manual');
  });

  it('returns the same values on a second call', () => {
    const once = applyShoppingAssistantMode({
      shoppingAssistantDisabled: true,
    });

    expect(applyShoppingAssistantMode(once)).toEqual(once);
  });
});
