import { render, screen } from '@testing-library/react';

jest.mock('marked', () =>
  jest.requireActual('../../../node_modules/marked/lib/marked.umd.js'),
);

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

  it('falls back to "Image" as alt text when caption is blank', () => {
    render(<MessageImage message={buildMessage({ caption: '   ' })} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Image');
  });
});

describe('MessageImage — caption', () => {
  it('renders a non-blank caption under the image with text formatting', () => {
    const { container } = render(
      <MessageImage
        message={buildMessage({
          caption: 'See the [photo](https://example.com/page)\nsecond line',
        })}
      />,
    );

    const block = container.querySelector('.weni-message-image-block');
    expect(block.firstElementChild).toContainElement(screen.getByRole('img'));
    expect(screen.getByText(/second line/)).toBeInTheDocument();
    const captionLink = screen.getByRole('link', { name: 'photo' });
    expect(captionLink).toHaveAttribute('href', 'https://example.com/page');
    expect(block.querySelector('.weni-message-text')).toHaveClass(
      'weni-message-text--incoming',
    );
  });

  it.each([
    ['absent', {}],
    ['empty', { caption: '' }],
    ['whitespace', { caption: '   ' }],
  ])('omits the caption when it is %s', (_label, overrides) => {
    const { container } = render(
      <MessageImage message={buildMessage(overrides)} />,
    );
    expect(container.querySelector('.weni-message-text')).toBeNull();
  });

  it('keeps the caption outside the image link', () => {
    render(
      <MessageImage message={buildMessage({ caption: 'A sunset photo' })} />,
    );
    const imageLink = screen.getByRole('link', { name: 'A sunset photo' });
    expect(imageLink).toHaveAttribute('href', 'https://example.com/photo.jpg');
    expect(imageLink).not.toContainElement(screen.getByText('A sunset photo'));
  });

  it('strips script markup from the caption', () => {
    const { container } = render(
      <MessageImage
        message={buildMessage({
          caption: '<script>alert(1)</script>hello',
        })}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('hello')).toBeInTheDocument();
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
