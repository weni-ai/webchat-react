import { render } from '@testing-library/react';
import {
  SKELETON_CTA_DEFAULT_WIDTH_PX,
  SKELETON_DEFAULT_WIDTH_PX,
} from '@/utils/componentStreaming';
import { ComponentSkeleton } from './ComponentSkeleton';

jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => (
    <span data-testid={`skeleton-icon-${name}`} />
  ),
}));

describe('ComponentSkeleton', () => {
  it('renders aria-hidden non-focusable span placeholders with hidden label sizers for quick replies', () => {
    const { container } = render(
      <ComponentSkeleton
        variant="quick_replies"
        labels={[
          'Express · within 2h',
          'A longer multi-line delivery option label',
        ]}
      />,
    );

    const wrapper = container.querySelector('.weni-component-skeleton');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('button')).toHaveLength(0);

    const items = container.querySelectorAll('.weni-component-skeleton__item');
    expect(items).toHaveLength(2);
    expect(items[0].tagName).toBe('SPAN');
    expect(items[0]).toHaveTextContent('Express · within 2h');
    expect(items[1]).toHaveTextContent(
      'A longer multi-line delivery option label',
    );
  });

  it('uses 120px fallback width for labelless quick_replies and list_message hints', () => {
    const { container: qrContainer } = render(
      <ComponentSkeleton
        variant="quick_replies"
        count={3}
      />,
    );
    const qrItems = qrContainer.querySelectorAll(
      '.weni-component-skeleton__item',
    );
    expect(qrItems).toHaveLength(3);
    qrItems.forEach((item) => {
      expect(item).toHaveStyle({ width: `${SKELETON_DEFAULT_WIDTH_PX}px` });
    });

    const { container: listContainer } = render(
      <ComponentSkeleton variant="list_message" />,
    );
    const listItem = listContainer.querySelector(
      '.weni-component-skeleton__item',
    );
    expect(listItem).toHaveStyle({ width: `${SKELETON_DEFAULT_WIDTH_PX}px` });
    expect(
      listContainer.querySelector('[data-testid="skeleton-icon-list"]'),
    ).toBeInTheDocument();
  });

  it('uses 210px fallback width and open_in_new icon slot for cta_message hints', () => {
    const { container } = render(<ComponentSkeleton variant="cta_message" />);
    const item = container.querySelector('.weni-component-skeleton__item');
    expect(item).toHaveStyle({ width: `${SKELETON_CTA_DEFAULT_WIDTH_PX}px` });
    expect(
      container.querySelector('[data-testid="skeleton-icon-open_in_new"]'),
    ).toBeInTheDocument();
  });
});
