/**
 * @jest-environment jsdom
 */
import { act } from '@testing-library/react';
import WebChat from './standalone';

function latestService() {
  return globalThis.__webchatServiceLatest;
}

describe('WebChat.init shopping assistant', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="webchat"></div>';
    globalThis.__webchatServiceLatest = undefined;
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      WebChat.destroy();
    });
    jest.restoreAllMocks();
  });

  it('passes connection values through when the flag is absent', async () => {
    await act(async () => {
      WebChat.init({
        selector: '#webchat',
        socketUrl: 'wss://socket.example',
        channelUuid: 'channel-1',
        host: 'https://example.test',
        connectOn: 'demand',
      });
    });

    const service = latestService();
    expect(service.config.shoppingAssistantDisabled).toBe(false);
    expect(service.config.socketUrl).toBe('wss://socket.example');
    expect(service.config.channelUuid).toBe('channel-1');
    expect(service.config.connectOn).toBe('demand');
  });

  it('inits without socketUrl and channelUuid and ignores assistant methods', async () => {
    await act(async () => {
      WebChat.init({
        selector: '#webchat',
        host: 'https://example.test',
        shoppingAssistantDisabled: true,
        unavailableProductNotify: true,
        conversationStarters: { pdp: true },
      });
    });

    const service = latestService();
    service.constructor.sendCalls = 0;
    expect(service.config.socketUrl).toBe(
      'wss://shopping-assistant-disabled.invalid',
    );
    expect(service.config.channelUuid).toBe('shopping-assistant-disabled');
    expect(service.config.connectOn).toBe('manual');

    await WebChat.send('hello');
    await WebChat.setConversationStarters(['One']);

    expect(service.constructor.sendCalls || 0).toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      'WebChat.send: shopping assistant is disabled',
    );
    expect(console.warn).toHaveBeenCalledWith(
      'WebChat.setConversationStarters: shopping assistant is disabled',
    );
  });

  it('warns when the flag is on without the back-in-stock flags', async () => {
    await act(async () => {
      WebChat.init({
        selector: '#webchat',
        host: 'https://example.test',
        shoppingAssistantDisabled: true,
      });
    });

    expect(console.warn).toHaveBeenCalledWith(
      'WebChat: shoppingAssistantDisabled needs unavailableProductNotify',
    );
    expect(console.warn).not.toHaveBeenCalledWith(
      'WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp',
    );
  });

  it('does not warn when notify is on and pdp is off', async () => {
    await act(async () => {
      WebChat.init({
        selector: '#webchat',
        host: 'https://example.test',
        shoppingAssistantDisabled: true,
        unavailableProductNotify: true,
      });
    });

    expect(console.warn).not.toHaveBeenCalled();
  });
});
