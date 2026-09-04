import { render, screen, fireEvent } from '@testing-library/react';
import { InlineProduct } from './InlineProduct';

jest.mock('@/components/Product/CounterControls', () => ({
  CounterControls: () => <div data-testid="counter-controls" />,
}));

jest.mock('@/components/Product/PriceDisplay', () => ({
  PriceDisplay: () => <div data-testid="price-display" />,
}));

describe('InlineProduct — click handling', () => {
  it('does not throw when clicked without onClick and without a same-origin productURL', () => {
    render(
      <InlineProduct
        image="https://example.com/img.png"
        title="Catalog"
        lines={['2 items']}
        button={<button type="button">View items</button>}
      />,
    );

    expect(() => {
      fireEvent.click(screen.getByText('View items'));
    }).not.toThrow();
  });

  it('calls onClick when productURL is not same-origin', () => {
    const onClick = jest.fn();

    render(
      <InlineProduct
        image="https://example.com/img.png"
        title="Product"
        productURL="https://other-store.com/p/1"
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByText('Product'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when a nested button stops propagation', () => {
    const onClick = jest.fn();

    render(
      <InlineProduct
        image="https://example.com/img.png"
        title="Catalog"
        onClick={onClick}
        button={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
          >
            View items
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByText('View items'));

    expect(onClick).not.toHaveBeenCalled();
  });
});
