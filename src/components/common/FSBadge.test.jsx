import { render, screen } from '@testing-library/react';
import { FSBadge } from './FSBadge';

describe('FSBadge', () => {
  it('renders the success variant', () => {
    render(<FSBadge type="success">Forwarded to human agent</FSBadge>);
    const badge = screen.getByText('Forwarded to human agent');
    expect(badge).toHaveClass('weni-fs-badge', 'weni-fs-badge--success');
  });

  it('renders the neutral variant', () => {
    render(<FSBadge type="neutral">Human support ended</FSBadge>);
    const badge = screen.getByText('Human support ended');
    expect(badge).toHaveClass('weni-fs-badge', 'weni-fs-badge--neutral');
  });
});
