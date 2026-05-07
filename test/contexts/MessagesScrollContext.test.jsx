import { renderHook } from '@testing-library/react';
import {
  MessagesScrollProvider,
  useMessagesScroll,
} from '@/contexts/MessagesScrollContext';

describe('MessagesScrollContext', () => {
  it('returns null when used outside a provider', () => {
    const { result } = renderHook(() => useMessagesScroll());

    expect(result.current).toBeNull();
  });

  it('provides the onWordRevealed callback to consumers', () => {
    const onWordRevealed = jest.fn();
    const wrapper = ({ children }) => (
      <MessagesScrollProvider onWordRevealed={onWordRevealed}>
        {children}
      </MessagesScrollProvider>
    );

    const { result } = renderHook(() => useMessagesScroll(), { wrapper });

    expect(result.current).toBe(onWordRevealed);
  });

  it('the provided callback is callable', () => {
    const onWordRevealed = jest.fn();
    const wrapper = ({ children }) => (
      <MessagesScrollProvider onWordRevealed={onWordRevealed}>
        {children}
      </MessagesScrollProvider>
    );

    const { result } = renderHook(() => useMessagesScroll(), { wrapper });
    result.current();

    expect(onWordRevealed).toHaveBeenCalledTimes(1);
  });

  it('reflects an updated callback when the provider re-renders', () => {
    const first = jest.fn();
    const second = jest.fn();

    let currentCallback = first;

    const wrapper = ({ children }) => (
      <MessagesScrollProvider onWordRevealed={currentCallback}>
        {children}
      </MessagesScrollProvider>
    );

    const { result, rerender } = renderHook(() => useMessagesScroll(), {
      wrapper,
    });

    expect(result.current).toBe(first);

    currentCallback = second;
    rerender();

    expect(result.current).toBe(second);
  });
});
