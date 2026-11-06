import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BackInStockNotify } from './BackInStockNotify';
import { useChatContext } from '@/contexts/ChatContext';
import { getSelectedSkuId } from '@/utils/vtex';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  getSelectedSkuId: jest.fn(() => 'from-page'),
}));

function contactVerdict({ name, phone }) {
  const errors = {};
  if (String(name ?? '').trim() === '') errors.name = 'required';
  if (String(phone ?? '').replace(/\D/g, '').length < 12)
    errors.phone = 'invalid';
  return { isValid: Object.keys(errors).length === 0, errors };
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'pt' },
    t: (key, options) => {
      const strings = {
        'back_in_stock.form_title': "Get notified when it's back in stock",
        'back_in_stock.form_description': `We'll message you on WhatsApp the moment the ${options?.productName} is back in stock.`,
        'back_in_stock.name_label': 'Name',
        'back_in_stock.ddi_label': 'DDI',
        'back_in_stock.whatsapp_label': 'WhatsApp number',
        'back_in_stock.notify_me': 'Notify me',
        'back_in_stock.not_now': 'Not now',
        'back_in_stock.invalid_phone': 'Enter a valid phone number',
        'back_in_stock.name_required': 'Complete this field',
        'back_in_stock.success_title': "You're all set!",
        'back_in_stock.success_description': `I'll message you on WhatsApp when ${options?.productName} is back in stock.`,
        'back_in_stock.wait_prompt':
          'While you wait, want to see similar products?',
        'back_in_stock.show_similar_products': 'Show me similar products',
      };
      return strings[key] ?? key;
    },
  }),
}));

function fillName(value = 'Ana') {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value },
  });
}

function fillValidPhone() {
  fireEvent.change(screen.getByLabelText('DDI'), {
    target: { value: '+55' },
  });
  fireEvent.change(screen.getByLabelText('WhatsApp number'), {
    target: { value: '11999999999' },
  });
}

describe('BackInStockNotify', () => {
  const clearPageHistory = jest.fn();
  const sendMessage = jest.fn();
  const validateBackInStockContact = jest.fn(contactVerdict);
  const subscribeBackInStock = jest.fn().mockResolvedValue({ accepted: true });

  beforeEach(() => {
    jest.clearAllMocks();
    subscribeBackInStock.mockResolvedValue({ accepted: true });
    validateBackInStockContact.mockImplementation(contactVerdict);
    useChatContext.mockReturnValue({
      clearPageHistory,
      sendMessage,
      service: { validateBackInStockContact, subscribeBackInStock },
    });
    delete window.__RUNTIME__;
    delete window.faststore_sdk_stores;
    document.documentElement.lang = 'pt-BR';
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  it('renders the form with product name', () => {
    render(
      <BackInStockNotify productName="Oculus Quest All-in-one VR Gaming Headset 64GB (Blue, XS)" />,
    );

    expect(
      screen.getByText("Get notified when it's back in stock"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /We'll message you on WhatsApp the moment the Oculus Quest All-in-one VR Gaming Headset 64GB \(Blue, XS\) is back in stock/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('DDI')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp number')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Notify me' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('prefills DDI from the VTEX culture country', () => {
    window.__RUNTIME__ = { culture: { country: 'BRA' } };

    render(<BackInStockNotify productName="Cool Shoe" />);

    expect(screen.getByLabelText('DDI')).toHaveValue('+55');
  });

  it('prefills DDI from the FastStore session country', () => {
    window.faststore_sdk_stores = {
      get: () => ({
        read: () => ({ country: 'USA' }),
      }),
    };

    render(<BackInStockNotify productName="Cool Shoe" />);

    expect(screen.getByLabelText('DDI')).toHaveValue('+1');
  });

  it('prefills DDI from /api/segments when the page has no session', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ countryCode: 'ARG' }),
    });

    render(<BackInStockNotify productName="Cool Shoe" />);

    await waitFor(() => {
      expect(screen.getByLabelText('DDI')).toHaveValue('+54');
    });
  });

  it('prefills DDI from the segment token when culture is absent', () => {
    window.__RUNTIME__ = {
      segmentToken: btoa(JSON.stringify({ countryCode: 'ARG' })),
    };

    render(<BackInStockNotify productName="Cool Shoe" />);

    expect(screen.getByLabelText('DDI')).toHaveValue('+54');
  });

  it('prefers culture over the segment token', () => {
    window.__RUNTIME__ = {
      culture: { country: 'BRA' },
      segmentToken: btoa(JSON.stringify({ countryCode: 'ARG' })),
    };

    render(<BackInStockNotify productName="Cool Shoe" />);

    expect(screen.getByLabelText('DDI')).toHaveValue('+55');
  });

  it('does not submit an invalid phone number', () => {
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
      />,
    );

    fillName();
    fireEvent.change(screen.getByLabelText('DDI'), {
      target: { value: '+55' },
    });
    fireEvent.change(screen.getByLabelText('WhatsApp number'), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    expect(subscribeBackInStock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/_v/private/availability-notify/subscribe',
      expect.anything(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid phone number',
    );
    expect(screen.queryByText("You're all set!")).not.toBeInTheDocument();
  });

  it('does not submit when the name is empty', () => {
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
      />,
    );

    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    expect(subscribeBackInStock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/_v/private/availability-notify/subscribe',
      expect.anything(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Complete this field');
    expect(screen.queryByText("You're all set!")).not.toBeInTheDocument();
  });

  it('does not submit a name that is only spaces', () => {
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
      />,
    );

    fillName('   ');
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    expect(subscribeBackInStock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/_v/private/availability-notify/subscribe',
      expect.anything(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Complete this field');
  });

  it('switches to success content after Notify me', async () => {
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
        seller="1"
      />,
    );

    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/_v/private/availability-notify/subscribe',
      expect.anything(),
    );
    expect(subscribeBackInStock).toHaveBeenCalledTimes(1);
    expect(subscribeBackInStock).toHaveBeenCalledWith({
      name: 'Ana',
      phone: '5511999999999',
      skuId: '27',
      seller: '1',
      salesChannel: null,
      storeLocales: ['pt-BR'],
      language: 'pt',
    });
    expect(
      screen.getByText(
        /I'll message you on WhatsApp when Cool Shoe is back in stock/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('While you wait, want to see similar products?'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show me similar products' }),
    ).toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('clears the page without subscribing when Not now is clicked', () => {
    render(<BackInStockNotify productName="Cool Shoe" />);

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(clearPageHistory).toHaveBeenCalledTimes(1);
    expect(subscribeBackInStock).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/_v/private/availability-notify/subscribe',
      expect.anything(),
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends similar products message and clears page history', async () => {
    render(<BackInStockNotify productName="Cool Shoe" />);

    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Show me similar products' }),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Show me similar products' }),
    );

    expect(clearPageHistory).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('Show me similar products');
  });

  it('uses the page SKU when the prop is missing', async () => {
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        seller="1"
      />,
    );
    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    await waitFor(() => {
      expect(subscribeBackInStock).toHaveBeenCalledWith(
        expect.objectContaining({ skuId: 'from-page' }),
      );
    });
    expect(getSelectedSkuId).toHaveBeenCalled();
  });

  it('keeps the button loading and ignores a second submit', async () => {
    let finish;
    subscribeBackInStock.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
        seller="1"
      />,
    );
    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    expect(subscribeBackInStock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Notify me' })).toBeDisabled();
    finish({ accepted: true });
    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
  });

  it('still shows success when subscribe returns HTTP error', async () => {
    subscribeBackInStock.mockResolvedValue({ accepted: false });

    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
      />,
    );
    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
  });

  it('still shows success when subscribe rejects', async () => {
    subscribeBackInStock.mockRejectedValue(new Error('network'));

    render(
      <BackInStockNotify
        productName="Cool Shoe"
        skuId="27"
      />,
    );
    fillName();
    fillValidPhone();
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
  });
});
