import Icon from '@/components/common/Icon';
import {
  ComponentType,
  SKELETON_CTA_DEFAULT_WIDTH_PX,
  SKELETON_DEFAULT_WIDTH_PX,
} from '@/utils/componentStreaming';

import './ComponentSkeleton.scss';

export interface ComponentSkeletonProps {
  variant: ComponentType;
  labels?: string[];
  count?: number;
}

const VARIANT_MODIFIER: Record<ComponentType, string> = {
  quick_replies: 'quick-reply',
  list_message: 'list',
  cta_message: 'cta',
};

const VARIANT_ICON: Record<ComponentType, string | null> = {
  quick_replies: null,
  list_message: 'list',
  cta_message: 'open_in_new',
};

const FALLBACK_WIDTH_PX: Record<ComponentType, number> = {
  quick_replies: SKELETON_DEFAULT_WIDTH_PX,
  list_message: SKELETON_DEFAULT_WIDTH_PX,
  cta_message: SKELETON_CTA_DEFAULT_WIDTH_PX,
};

const CONTAINER_CLASS: Record<ComponentType, string> = {
  quick_replies: 'weni-quick-replies',
  list_message: 'weni-list-message',
  cta_message: 'weni-call-to-action',
};

export function ComponentSkeleton({
  variant,
  labels,
  count,
}: ComponentSkeletonProps) {
  const validLabels =
    Array.isArray(labels) && labels.length > 0 ? labels : null;
  const placeholderCount = validLabels
    ? validLabels.length
    : Math.max(1, count ?? 1);

  const modifier = VARIANT_MODIFIER[variant];
  const iconName = VARIANT_ICON[variant];
  const fallbackWidth = FALLBACK_WIDTH_PX[variant];
  const containerClass = CONTAINER_CLASS[variant];

  const items = validLabels
    ? validLabels.map((label, index) => ({
        key: `${variant}-label-${index}-${label}`,
        label,
      }))
    : Array.from({ length: placeholderCount }, (_, index) => ({
        key: `${variant}-fallback-${index}`,
        label: null,
      }));

  return (
    <section
      className={`${containerClass} weni-component-skeleton weni-component-skeleton--${modifier}`}
      aria-hidden="true"
    >
      {items.map((item) => {
        const isFallback = item.label === null;
        const itemClassName = [
          'weni-component-skeleton__item',
          `weni-component-skeleton__item--${modifier}`,
          isFallback ? 'weni-component-skeleton__item--fallback' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <span
            key={item.key}
            className={itemClassName}
            style={isFallback ? { width: `${fallbackWidth}px` } : undefined}
          >
            {/* Invisible in-flow sizer matches the exact rendered button dimensions
                and multi-line wrap height without forced layout reflows (BD-002). */}
            <span className="weni-component-skeleton__sizer">
              {iconName && (
                <Icon
                  name={iconName}
                  size="medium"
                />
              )}
              {item.label ?? '\u00A0'}
            </span>
          </span>
        );
      })}
    </section>
  );
}

export default ComponentSkeleton;
