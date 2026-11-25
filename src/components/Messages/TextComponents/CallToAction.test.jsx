import { render, screen } from '@testing-library/react';

import { CallToAction } from './CallToAction';

jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-testid={`icon-${name}`} />,
}));

describe('TextComponents/CallToAction', () => {
  it('renders an active external link with target="_blank" and grow-in animation variables', () => {
    render(
      <CallToAction
        buttonText="Track order"
        url="https://store.example/orders/48213"
        animate
        staggerOffset={1}
        staggerMs={60}
        durationMs={180}
      />,
    );

    const link = screen.getByRole('link', { name: 'Track order' });
    expect(link).toHaveAttribute('href', 'https://store.example/orders/48213');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('weni-component-enter--grow');
    expect(link.style.getPropertyValue('--weni-enter-duration')).toBe('180ms');
    expect(link.style.getPropertyValue('--weni-enter-delay')).toBe('60ms');
  });

  it('omits href and marks aria-disabled when disabled (non-focusable, non-navigable)', () => {
    const { container } = render(
      <CallToAction
        buttonText="Track order"
        url="https://store.example/orders/48213"
        disabled
      />,
    );

    const anchor = container.querySelector('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor).not.toHaveAttribute('href');
    expect(anchor).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders nothing for partial, invalid, or non-http URLs', () => {
    const { container: c1 } = render(
      <CallToAction
        buttonText="Open"
        url="javascript:alert(1)"
      />,
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <CallToAction
        buttonText="Open"
        url="https://"
      />,
    );
    expect(c2.firstChild).toBeNull();
  });
});
