import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ListMessage } from './ListMessage';

const mockSetCurrentPage = jest.fn();

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: () => ({
    setCurrentPage: mockSetCurrentPage,
  }),
}));

jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-testid={`icon-${name}`} />,
}));

describe('TextComponents/ListMessage', () => {
  const items = [
    { uuid: '1', title: 'Coffee 500g' },
    { uuid: '2', title: 'Olive oil 500ml' },
  ];

  beforeEach(() => {
    mockSetCurrentPage.mockClear();
  });

  it('opens list-message view with animateEntrance: true when active button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ListMessage
        buttonText="See 2 deals"
        items={items}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'See 2 deals' }));

    expect(mockSetCurrentPage).toHaveBeenCalledWith({
      view: 'list-message',
      title: 'See 2 deals',
      props: {
        options: ['Coffee 500g', 'Olive oil 500ml'],
        animateEntrance: true,
      },
    });
  });

  it('does not open list view when disabled', async () => {
    const user = userEvent.setup();
    render(
      <ListMessage
        buttonText="See 2 deals"
        items={items}
        disabled
      />,
    );

    const button = screen.getByRole('button', { name: 'See 2 deals' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(mockSetCurrentPage).not.toHaveBeenCalled();
  });

  it('applies pop-in animation class and stagger variables when animate is true', () => {
    render(
      <ListMessage
        buttonText="See deals"
        items={items}
        animate
        staggerOffset={0}
        staggerMs={60}
        durationMs={180}
      />,
    );

    const button = screen.getByRole('button', { name: 'See deals' });
    expect(button).toHaveClass('weni-component-enter--pop');
    expect(button.style.getPropertyValue('--weni-enter-duration')).toBe(
      '180ms',
    );
    expect(button.style.getPropertyValue('--weni-enter-delay')).toBe('0ms');
  });
});
