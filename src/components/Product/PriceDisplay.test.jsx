import { render, screen } from '@testing-library/react';
import { PriceDisplay } from './PriceDisplay';

jest.mock('@/utils/currency', () => ({
  formatPriceWithCurrency: (price, currency) => `${currency} ${price}`,
}));

describe('PriceDisplay', () => {
  it('returns null when neither price nor salePrice is provided', () => {
    const { container } = render(<PriceDisplay />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when price and salePrice are empty strings', () => {
    const { container } = render(
      <PriceDisplay
        price=""
        salePrice=""
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders only the regular price when no salePrice is given', () => {
    render(
      <PriceDisplay
        price="10.00"
        currency="BRL"
      />,
    );

    const priceSection = screen.getByText('BRL 10.00');
    expect(priceSection).toBeInTheDocument();
    expect(priceSection).toHaveClass('weni-inline-product__price');
    expect(priceSection).not.toHaveClass('weni-inline-product__price--muted');
    expect(priceSection).not.toHaveClass('weni-inline-product__price--sale');
  });

  it('renders both prices when price and salePrice are given', () => {
    render(
      <PriceDisplay
        price="20.00"
        salePrice="15.00"
        currency="USD"
      />,
    );

    const regularPrice = screen.getByText('USD 20.00');
    const salePrice = screen.getByText('USD 15.00');

    expect(regularPrice).toBeInTheDocument();
    expect(salePrice).toBeInTheDocument();
  });

  it('applies --muted class to regular price when salePrice exists', () => {
    render(
      <PriceDisplay
        price="20.00"
        salePrice="15.00"
        currency="USD"
      />,
    );

    const regularPrice = screen.getByText('USD 20.00');
    expect(regularPrice).toHaveClass('weni-inline-product__price--muted');
  });

  it('applies --sale class to the sale price element', () => {
    render(
      <PriceDisplay
        price="20.00"
        salePrice="15.00"
        currency="USD"
      />,
    );

    const salePrice = screen.getByText('USD 15.00');
    expect(salePrice).toHaveClass('weni-inline-product__price--sale');
  });

  it('applies priceModifier class when no salePrice is given', () => {
    render(
      <PriceDisplay
        price="10.00"
        currency="BRL"
        priceModifier="product"
      />,
    );

    const price = screen.getByText('BRL 10.00');
    expect(price).toHaveClass('weni-inline-product__price--product');
  });

  it('ignores priceModifier when salePrice is present (--muted takes priority)', () => {
    render(
      <PriceDisplay
        price="20.00"
        salePrice="15.00"
        currency="BRL"
        priceModifier="product"
      />,
    );

    const regularPrice = screen.getByText('BRL 20.00');
    expect(regularPrice).toHaveClass('weni-inline-product__price--muted');
    expect(regularPrice).not.toHaveClass('weni-inline-product__price--product');
  });

  it('renders only the sale price when price is empty but salePrice is given', () => {
    render(
      <PriceDisplay
        salePrice="15.00"
        currency="EUR"
      />,
    );

    const salePrice = screen.getByText('EUR 15.00');
    expect(salePrice).toBeInTheDocument();
    expect(salePrice).toHaveClass('weni-inline-product__price--sale');

    expect(screen.queryByText('EUR')).not.toBeInTheDocument();
  });

  it('renders the price-container section wrapper', () => {
    render(
      <PriceDisplay
        price="10.00"
        currency="BRL"
      />,
    );

    const container = screen.getByText('BRL 10.00').closest('section');
    expect(container).toHaveClass('weni-inline-product__price-container');
  });
});
