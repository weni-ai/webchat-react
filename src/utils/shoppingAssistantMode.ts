import {
  SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID,
  SHOPPING_ASSISTANT_DISABLED_SOCKET_URL,
} from './constants';

type ShoppingAssistantConfig = {
  shoppingAssistantDisabled?: boolean;
  socketUrl?: string;
  channelUuid?: string;
  connectOn?: string;
};

function isMissing(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

export function applyShoppingAssistantMode<T extends ShoppingAssistantConfig>(
  config: T,
): T {
  if (config.shoppingAssistantDisabled !== true) {
    return config;
  }

  return {
    ...config,
    shoppingAssistantDisabled: true,
    socketUrl: isMissing(config.socketUrl)
      ? SHOPPING_ASSISTANT_DISABLED_SOCKET_URL
      : config.socketUrl,
    channelUuid: isMissing(config.channelUuid)
      ? SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID
      : config.channelUuid,
    connectOn: 'manual',
  };
}
