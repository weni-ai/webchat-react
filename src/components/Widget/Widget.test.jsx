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
});
