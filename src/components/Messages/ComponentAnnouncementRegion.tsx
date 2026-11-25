import { useEffect, useRef, useState } from 'react';
import { AnnouncementItem } from '@/utils/componentStreaming';

import './ComponentAnnouncementRegion.scss';

const SEQUENTIAL_ANNOUNCE_GAP_MS = 60;

export interface ComponentAnnouncementRegionProps {
  announcements: AnnouncementItem[];
}

export function ComponentAnnouncementRegion({
  announcements,
}: ComponentAnnouncementRegionProps) {
  const [activeText, setActiveText] = useState<string>('');
  const processedIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<AnnouncementItem[]>([]);
  const isFlushingRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const newItems = announcements.filter(
      (item) => !processedIdsRef.current.has(item.id),
    );
    if (newItems.length === 0) return;

    newItems.forEach((item) => {
      processedIdsRef.current.add(item.id);
      queueRef.current.push(item);
    });

    const flushNext = () => {
      const next = queueRef.current.shift();
      if (!next) {
        isFlushingRef.current = false;
        return;
      }

      isFlushingRef.current = true;
      // Clear before setting ensures assistive tech re-reads consecutive identical strings.
      setActiveText('');
      timerRef.current = setTimeout(() => {
        setActiveText(next.text);
        if (queueRef.current.length > 0) {
          timerRef.current = setTimeout(flushNext, SEQUENTIAL_ANNOUNCE_GAP_MS);
        } else {
          isFlushingRef.current = false;
        }
      }, 0);
    };

    if (!isFlushingRef.current) {
      flushNext();
    }
  }, [announcements]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="weni-sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {activeText}
    </div>
  );
}

export default ComponentAnnouncementRegion;
