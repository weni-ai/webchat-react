import { render, screen } from '@testing-library/react';

import { MessageImage } from './MessageImage';

function buildMessage(overrides = {}) {
  return {
    id: 'msg-1',
    type: 'image',
    direction: 'incoming',
    media: 'https://example.com/photo.jpg',
    timestamp: 1000,
    ...overrides,
  };
}

describe('MessageImage — image rendering', () => {
  it('renders an img with the media URL as src', () => {
    render(<MessageImage message={buildMessage()} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'https://example.com/photo.jpg',
    );
  });

  it('uses caption as alt text', () => {
    render(
      <MessageImage message={buildMessage({ caption: 'A sunset photo' })} />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'A sunset photo');
  });

  it('falls back to "Image" as alt text when caption is absent', () => {
    render(<MessageImage message={buildMessage()} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Image');
  });
});

describe('MessageImage — open in new tab', () => {
  it('wraps the image in an anchor pointing to the media URL', () => {
    render(<MessageImage message={buildMessage()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/photo.jpg');
  });

  it('anchor opens in a new tab', () => {
    render(<MessageImage message={buildMessage()} />);
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
  });

  it('anchor has rel="noopener noreferrer"', () => {
    render(<MessageImage message={buildMessage()} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });

  it('the img is a child of the anchor', () => {
    render(<MessageImage message={buildMessage()} />);
    const link = screen.getByRole('link');
    expect(link).toContainElement(screen.getByRole('img'));
  });
});
