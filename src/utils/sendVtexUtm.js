import { getVtexAccount } from '@/utils/vtex';
import { getValidOrderFormId } from '@/utils/vtexCustomFields';

export const UTM_SOURCES = {
  CONV_STARTER: 'cx_shopping_assistant_conv_starter',
  ASSISTANT: 'cx_shopping_assistant',
  CART: 'cx_shopping_assistant_cart',
};

const sentUtmSources = new Set();

export function resetSentUtmSources() {
  sentUtmSources.clear();
}

/**
 * Sends UTM attribution to the VTEX orderForm through the webchat service.
 *
 * @param {import('@weni/webchat-service').default} service
 * @param {string} utm_source
 * @param {{ silent?: boolean, once?: boolean }} [options]
 * @returns {Promise<void|undefined>}
 */
export async function sendVtexUtm(
  service,
  utm_source,
  { silent = false, once = true } = {},
) {
  if (!service?.sendUtm) {
    if (!silent) {
      throw new Error('sendUtm is not available on the webchat service');
    }
    return;
  }

  if (!utm_source || typeof utm_source !== 'string') {
    if (!silent) {
      throw new Error('utm_source is required');
    }
    return;
  }

  if (once && sentUtmSources.has(utm_source)) {
    return;
  }

  const vtex_account = getVtexAccount();
  if (!vtex_account) {
    if (!silent) {
      throw new Error('vtex_account is not available');
    }
    return;
  }

  const order_form_id = await getValidOrderFormId();
  if (!order_form_id) {
    if (!silent) {
      throw new Error('order_form_id is not available');
    }
    return;
  }

  await service.sendUtm({ vtex_account, order_form_id, utm_source });

  if (once) {
    sentUtmSources.add(utm_source);
  }
}
