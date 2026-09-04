import { render, screen, fireEvent } from '@testing-library/react';
import { WhatsappOffersOptIn } from './WhatsappOffersOptIn';
import { useChatContext } from '@/contexts/ChatContext';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const strings = {
        'whatsapp_offers_opt_in.form_title': 'Get offers and news on WhatsApp',
        'whatsapp_offers_opt_in.form_description':
          'Sign up for exclusive coupons, launches and promotions',
        'whatsapp_offers_opt_in.coupon_form_title': `Get a ${options?.percent}% discount coupon on WhatsApp`,
        'whatsapp_offers_opt_in.coupon_form_description':
          "Sign up and we'll send your coupon straight to WhatsApp",
        'back_in_stock.name_label': 'Name',
        'back_in_stock.whatsapp_label': 'WhatsApp number',
        'whatsapp_offers_opt_in.sign_me_up': 'Sign me up',
        'whatsapp_offers_opt_in.not_now': 'Not now',
        'whatsapp_offers_opt_in.agent_confirmation':
          "You're all set! We'll send offers and news to your WhatsApp.",
        'whatsapp_offers_opt_in.agent_follow_up':
          'What are you looking for today?',
      };
      return strings[key] ?? key;
    },
  }),
}));

describe('WhatsappOffersOptIn', () => {
  const clearPageHistory = jest.fn();
  const simulateMessageReceived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useChatContext.mockReturnValue({
      clearPageHistory,
      simulateMessageReceived,
    });
  });

  it('renders the generic form copy', () => {
    render(<WhatsappOffersOptIn />);

    expect(
      screen.getByText('Get offers and news on WhatsApp'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sign up for exclusive coupons, launches and promotions',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('WhatsApp number')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign me up' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('renders coupon copy when couponPercent is set', () => {
    render(<WhatsappOffersOptIn couponPercent={20} />);

    expect(
      screen.getByText('Get a 20% discount coupon on WhatsApp'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Sign up and we'll send your coupon straight to WhatsApp",
      ),
    ).toBeInTheDocument();
  });

  it('simulates two agent messages and clears the page on Sign me up', () => {
    render(<WhatsappOffersOptIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign me up' }));

    expect(clearPageHistory).toHaveBeenCalledTimes(1);
    expect(simulateMessageReceived).toHaveBeenCalledTimes(2);
    expect(simulateMessageReceived).toHaveBeenNthCalledWith(1, {
      type: 'message',
      message: {
        text: "You're all set! We'll send offers and news to your WhatsApp.",
      },
    });
    expect(simulateMessageReceived).toHaveBeenNthCalledWith(2, {
      type: 'message',
      message: { text: 'What are you looking for today?' },
    });
  });

  it('clears the page without simulating messages on Not now', () => {
    render(<WhatsappOffersOptIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(clearPageHistory).toHaveBeenCalledTimes(1);
    expect(simulateMessageReceived).not.toHaveBeenCalled();
  });
});
