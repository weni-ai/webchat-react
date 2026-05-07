import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/utils/constants', () => ({
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'text/csv'],
}));

jest.mock('@/components/common/Icon', () => ({
  Icon: () => <span data-testid="icon" />,
}));

import { MessageDocument } from './MessageDocument';

function buildMessage(overrides = {}) {
  return {
    id: 'msg-1',
    type: 'file',
    direction: 'incoming',
    media: 'https://example.com/report.pdf',
    timestamp: 1000,
    ...overrides,
  };
}

describe('MessageDocument — label', () => {
  it('shows the filename from metadata', () => {
    render(
      <MessageDocument
        message={buildMessage({
          metadata: {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            size: 1024,
          },
        })}
      />,
    );
    expect(screen.getByRole('button')).toHaveTextContent('report.pdf');
  });

  it('falls back to caption when filename is absent', () => {
    render(
      <MessageDocument
        message={buildMessage({
          caption: 'Privacy policy',
          metadata: { mimeType: 'application/pdf', size: 0 },
        })}
      />,
    );
    expect(screen.getByRole('button')).toHaveTextContent('Privacy policy');
  });

  it('falls back to "file" when both filename and caption are absent', () => {
    render(<MessageDocument message={buildMessage()} />);
    expect(screen.getByRole('button')).toHaveTextContent('file');
  });

  it('does not crash when metadata is undefined', () => {
    render(<MessageDocument message={buildMessage({ metadata: undefined })} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('MessageDocument — mimeType inference from URL', () => {
  it('infers mimeType from PDF extension and allows view', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <MessageDocument
        message={buildMessage({
          media: 'https://example.com/terms.pdf',
          metadata: undefined,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith(
      'https://example.com/terms.pdf',
      '_blank',
    );

    open.mockRestore();
  });

  it('infers mimeType from CSV extension and allows view', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <MessageDocument
        message={buildMessage({
          media: 'https://example.com/data.csv',
          metadata: undefined,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith('https://example.com/data.csv', '_blank');

    open.mockRestore();
  });

  it('does not call window.open for an unknown extension', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <MessageDocument
        message={buildMessage({
          media: 'https://example.com/archive.xyz',
          metadata: undefined,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(open).not.toHaveBeenCalled();

    open.mockRestore();
  });
});

describe('MessageDocument — open in new tab', () => {
  it('opens a plain URL in a new tab when mimeType is allowed', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <MessageDocument
        message={buildMessage({
          media: 'https://example.com/doc.pdf',
          metadata: {
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 0,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(open).toHaveBeenCalledWith('https://example.com/doc.pdf', '_blank');

    open.mockRestore();
  });

  it('does not call window.open when mimeType is not in ALLOWED_DOCUMENT_TYPES', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});

    render(
      <MessageDocument
        message={buildMessage({
          metadata: { filename: 'photo.jpg', mimeType: 'image/jpeg', size: 0 },
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(open).not.toHaveBeenCalled();

    open.mockRestore();
  });
});

describe('MessageDocument — direction styling', () => {
  it('applies outgoing modifier class to button', () => {
    render(
      <MessageDocument
        message={buildMessage({
          direction: 'outgoing',
          metadata: {
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 0,
          },
        })}
      />,
    );
    expect(screen.getByRole('button')).toHaveClass(
      'weni-message-document__view--outgoing',
    );
  });

  it('applies incoming modifier class to button', () => {
    render(
      <MessageDocument
        message={buildMessage({
          metadata: {
            filename: 'doc.pdf',
            mimeType: 'application/pdf',
            size: 0,
          },
        })}
      />,
    );
    expect(screen.getByRole('button')).toHaveClass(
      'weni-message-document__view--incoming',
    );
  });
});
