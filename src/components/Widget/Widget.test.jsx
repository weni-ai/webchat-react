import { render, screen } from '@testing-library/react';
import Widget from './Widget';

const baseConfig = {
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

describe('Widget', () => {
  it('renders the widget container', () => {
    render(<Widget config={baseConfig} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget');
  });

  it('applies weni-widget--bottom-right class by default', () => {
    render(<Widget config={baseConfig} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-right');
  });

  it('applies weni-widget--bottom-right class when position is bottom-right', () => {
    render(<Widget config={{ ...baseConfig, position: 'bottom-right' }} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-right');
    expect(widget).not.toHaveClass('weni-widget--bottom-left');
  });

  it('applies weni-widget--bottom-left class when position is bottom-left', () => {
    render(<Widget config={{ ...baseConfig, position: 'bottom-left' }} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-left');
    expect(widget).not.toHaveClass('weni-widget--bottom-right');
  });
});
