import { render, screen, fireEvent } from '@testing-library/react';
import { BackInStockNotify } from './BackInStockNotify';
import { useChatContext } from '@/contexts/ChatContext';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const strings = {
        'back_in_stock.form_title': "Get notified when it's back in stock",
        'back_in_stock.form_description': `We'll message you on WhatsApp the moment the ${options?.productName} is back in stock.`,
        'back_in_stock.name_label': 'Name',
        'back_in_stock.whatsapp_label': 'WhatsApp number',
        'back_in_stock.notify_me': 'Notify me',
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

describe('BackInStockNotify', () => {
  const clearPageHistory = jest.fn();
  const sendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useChatContext.mockReturnValue({ clearPageHistory, sendMessage });
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
    expect(screen.getByLabelText('WhatsApp number')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Notify me' }),
    ).toBeInTheDocument();
  });

  it('switches to success content after Notify me', () => {
    render(<BackInStockNotify productName="Cool Shoe" />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ana' },
    });
    fireEvent.change(screen.getByLabelText('WhatsApp number'), {
      target: { value: '+5511999999999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));

    expect(screen.getByText("You're all set!")).toBeInTheDocument();
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

  it('sends similar products message and clears page history', () => {
    render(<BackInStockNotify productName="Cool Shoe" />);

    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Show me similar products' }),
    );

    expect(clearPageHistory).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('Show me similar products');
  });
});
