declare module '*.scss';

declare module 'react' {
  export type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;

  export interface ReactElement<P = Record<string, unknown>> {
    type: unknown;
    props: P;
    key: string | null;
  }

  export type CSSProperties = Record<string, string | number | undefined>;

  export interface MutableRefObject<T> {
    current: T;
  }

  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);

  export function useState<S>(
    initialState: S | (() => S),
  ): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(
    effect: () => void | (() => void) | undefined,
    deps?: readonly unknown[],
  ): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    callback: T,
    deps: readonly unknown[],
  ): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;

  export function Fragment(props: { children?: ReactNode }): ReactElement;

  export namespace JSX {
    export type Element = ReactElement;

    export interface HTMLAttributes {
      key?: string | number | null;
      id?: string;
      className?: string;
      style?: CSSProperties;
      role?: string;
      tabIndex?: number;
      'aria-hidden'?: boolean | 'true' | 'false';
      'aria-live'?: 'off' | 'polite' | 'assertive';
      'aria-atomic'?: boolean | 'true' | 'false';
      'aria-label'?: string;
      'data-testid'?: string;
      children?: ReactNode;
    }

    export interface IntrinsicElements {
      div: HTMLAttributes;
      span: HTMLAttributes;
      section: HTMLAttributes;
    }
  }
}

declare module 'react/jsx-runtime' {
  import type { JSX, ReactElement, ReactNode } from 'react';
  export { JSX };
  export function Fragment(props: { children?: ReactNode }): ReactElement;
  export function jsx(
    type: unknown,
    props: Record<string, unknown>,
    key?: string | number,
  ): ReactElement;
  export function jsxs(
    type: unknown,
    props: Record<string, unknown>,
    key?: string | number,
  ): ReactElement;
}

declare module 'react-i18next' {
  import type { TranslateFn } from '@/utils/componentStreaming';
  export function useTranslation(): {
    t: TranslateFn;
    i18n: { language: string };
  };
}

declare module '@/components/common/Icon' {
  import type { ReactElement } from 'react';
  export interface IconProps {
    name: string;
    size?: 'small' | 'medium' | 'large';
    color?: string;
    filled?: boolean;
    className?: string;
  }
  export function Icon(props: IconProps): ReactElement;
  export default Icon;
}

declare module '@/hooks/useStreamingBuffer' {
  export function useStreamingBuffer(params: {
    text?: string;
    isStreaming: boolean;
  }): {
    displayedText: string;
    isBuffering: boolean;
  };
}

declare module '@/hooks/useWeniChat' {
  export interface WeniServiceRef {
    config?: { channelUuid?: string };
    getSession?: () => { sessionId?: string } | null | undefined;
    getState?: () => {
      messages?: unknown[];
      isThinking?: boolean;
      connection?: Record<string, unknown>;
    };
    emit?: (event: string, ...args: unknown[]) => void;
    simulateMessageReceived?: (payload: unknown) => void;
  }

  export function useWeniChat(): {
    service?: WeniServiceRef;
    sendMessage: (text: string, options?: Record<string, unknown>) => void;
  };
}

declare module '@/components/Messages/MessageContainer' {
  import type { ReactElement, ReactNode } from 'react';
  export interface MessageContainerProps {
    direction: 'incoming' | 'outgoing';
    type: string;
    className?: string;
    children: ReactNode;
  }
  export function MessageContainer(props: MessageContainerProps): ReactElement;
  export default MessageContainer;
}

declare module '@/components/Messages/MessageText' {
  import type { ReactElement, ReactNode } from 'react';
  import type { StreamedMessage } from '@/utils/componentStreaming';
  export interface MessageTextProps {
    message: StreamedMessage;
    componentsEnabled?: boolean;
    displayedText?: string;
    isBuffering?: boolean;
    renderListSlot?: ReactNode;
    renderCtaSlot?: ReactNode;
  }
  export function MessageText(props: MessageTextProps): ReactElement;
  export default MessageText;
}

declare module '@/components/Messages/TextComponents/QuickReplies' {
  import type { ReactElement } from 'react';
  import type { QuickReplyItem } from '@/utils/componentStreaming';
  export interface QuickRepliesProps {
    quickReplies: QuickReplyItem[];
    disabled?: boolean;
    animate?: boolean;
    staggerOffset?: number;
    staggerMs?: number;
    durationMs?: number;
  }
  export function QuickReplies(props: QuickRepliesProps): ReactElement;
}

declare module '@/components/Messages/TextComponents/ListMessage' {
  import type { ReactElement } from 'react';
  import type { ListItem } from '@/utils/componentStreaming';
  export interface ListMessageProps {
    buttonText?: string;
    items: ListItem[];
    disabled?: boolean;
    animate?: boolean;
    staggerOffset?: number;
    staggerMs?: number;
    durationMs?: number;
  }
  export function ListMessage(props: ListMessageProps): ReactElement;
}

declare module '@/components/Messages/TextComponents/CallToAction' {
  import type { ReactElement } from 'react';
  export interface CallToActionProps {
    buttonText: string;
    url: string;
    disabled?: boolean;
    animate?: boolean;
    staggerOffset?: number;
    staggerMs?: number;
    durationMs?: number;
  }
  export function CallToAction(props: CallToActionProps): ReactElement | null;
}
