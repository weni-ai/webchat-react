import { getVtexAccount } from '@/utils/vtex';
import { getValidOrderFormId } from '@/utils/vtexCustomFields';
import {
  resetSentUtmSources,
  sendVtexUtm,
  UTM_SOURCES,
} from '@/utils/sendVtexUtm';

jest.mock('@/utils/vtex', () => ({
  getVtexAccount: jest.fn(),
}));

jest.mock('@/utils/vtexCustomFields', () => ({
  getValidOrderFormId: jest.fn(),
}));

describe('sendVtexUtm', () => {
  const service = {
    sendUtm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSentUtmSources();
    getVtexAccount.mockReturnValue('mystore');
    getValidOrderFormId.mockResolvedValue('abc123def456abc123def456abc123de');
  });

  it('exports UTM source constants', () => {
    expect(UTM_SOURCES).toEqual({
      CONV_STARTER: 'cx_shopping_assistant_conv_starter',
      ASSISTANT: 'cx_shopping_assistant',
      CART: 'cx_shopping_assistant_cart',
    });
  });

  it('sends send_utm payload through the service', async () => {
    await sendVtexUtm(service, UTM_SOURCES.ASSISTANT);

    expect(service.sendUtm).toHaveBeenCalledWith({
      vtex_account: 'mystore',
      order_form_id: 'abc123def456abc123def456abc123de',
      utm_source: UTM_SOURCES.ASSISTANT,
    });
  });

  it('deduplicates the same utm_source by default', async () => {
    await sendVtexUtm(service, UTM_SOURCES.CART);
    await sendVtexUtm(service, UTM_SOURCES.CART);

    expect(service.sendUtm).toHaveBeenCalledTimes(1);
  });

  it('allows repeated sends when once is false', async () => {
    await sendVtexUtm(service, UTM_SOURCES.CART, { once: false });
    await sendVtexUtm(service, UTM_SOURCES.CART, { once: false });

    expect(service.sendUtm).toHaveBeenCalledTimes(2);
  });

  it('returns silently when VTEX context is unavailable', async () => {
    getVtexAccount.mockReturnValue(undefined);

    await expect(
      sendVtexUtm(service, UTM_SOURCES.ASSISTANT, { silent: true }),
    ).resolves.toBeUndefined();

    expect(service.sendUtm).not.toHaveBeenCalled();
  });

  it('throws when VTEX context is unavailable and silent is false', async () => {
    getVtexAccount.mockReturnValue(undefined);

    await expect(sendVtexUtm(service, UTM_SOURCES.ASSISTANT)).rejects.toThrow(
      'vtex_account is not available',
    );
  });

  it('throws when sendUtm is missing on the service', async () => {
    await expect(sendVtexUtm({}, UTM_SOURCES.ASSISTANT)).rejects.toThrow(
      'sendUtm is not available on the webchat service',
    );
  });
});
