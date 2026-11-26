import { useTranslation } from 'react-i18next';

import { FSBadge } from '@/components/common/FSBadge';
import {
  formatMessageTimestamp,
  MILESTONE_CONFIG_MAP,
  validateHumanSupportEvent,
  type HumanSupportEvent,
  type HumanSupportLogContext,
} from '@/utils/humanSupportStatus';

import './HumanSupportMilestone.scss';

export interface HumanSupportMilestoneProps {
  event: HumanSupportEvent | unknown;
  logContext?: HumanSupportLogContext;
}

export function HumanSupportMilestone({
  event,
  logContext,
}: HumanSupportMilestoneProps) {
  const { t, i18n } = useTranslation();
  const validated = validateHumanSupportEvent(event, logContext);

  if (!validated) {
    return null;
  }

  const config = MILESTONE_CONFIG_MAP[validated.event];
  const time = formatMessageTimestamp(validated.occurredAt, i18n?.language);

  if (!time) {
    return null;
  }

  return (
    <section className="weni-human-support-milestone">
      <FSBadge type={config.badgeType}>{t(config.labelKey, { time })}</FSBadge>
    </section>
  );
}

export default HumanSupportMilestone;
