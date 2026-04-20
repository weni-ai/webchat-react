import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationStarterButton } from './ConversationStarterButton';
import {
  ConversationStartersCompact,
  ConversationStartersFull,
} from './ConversationStarters';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'conversation_starters.aria_label' && options?.question) {
        return `Suggested question: ${options.question}`;
      }
      return key;
    },
    i18n: { changeLanguage: jest.fn() },
  }),
}));

const mockQuestions = [
  'What is your return policy?',
  'How do I track my order?',
  'Do you offer free shipping?',
];

describe('ConversationStarterButton', () => {
  it('renders with question text visible', () => {
    render(
      <ConversationStarterButton
        question="What is your return policy?"
        onClick={jest.fn()}
      />,
    );

    expect(screen.getByText('What is your return policy?')).toBeInTheDocument();
  });

  it('renders compact variant with correct CSS class', () => {
    const { container } = render(
      <ConversationStarterButton
        question="Test question"
        variant="compact"
        onClick={jest.fn()}
      />,
    );

    const button = container.querySelector('.weni-starter-button--compact');
    expect(button).toBeInTheDocument();
  });

  it('renders full variant with correct CSS class', () => {
    const { container } = render(
      <ConversationStarterButton
        question="Test question"
        variant="full"
        onClick={jest.fn()}
      />,
    );

    const button = container.querySelector('.weni-starter-button--full');
    expect(button).toBeInTheDocument();
  });

  it('calls onClick with question text when clicked', () => {
    const handleClick = jest.fn();
    render(
      <ConversationStarterButton
        question="How do I track my order?"
        onClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByText('How do I track my order?'));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('How do I track my order?');
  });

  it('has aria-label using t() function', () => {
    render(
      <ConversationStarterButton
        question="Do you offer free shipping?"
        onClick={jest.fn()}
      />,
    );

    expect(
      screen.getByLabelText('Suggested question: Do you offer free shipping?'),
    ).toBeInTheDocument();
  });

  it('renders using FSButton component with weni-fs-button class', () => {
    const { container } = render(
      <ConversationStarterButton
        question="Test question"
        onClick={jest.fn()}
      />,
    );

    const button = container.querySelector('.weni-fs-button');
    expect(button).toBeInTheDocument();
  });
});

describe('ConversationStartersCompact', () => {
  it('renders all questions as compact buttons', () => {
    render(
      <ConversationStartersCompact
        questions={mockQuestions}
        onStarterClick={jest.fn()}
        isVisible={true}
      />,
    );

    mockQuestions.forEach((question) => {
      expect(screen.getByText(question)).toBeInTheDocument();
    });

    const compactButtons = document.querySelectorAll(
      '.weni-starter-button--compact',
    );
    expect(compactButtons).toHaveLength(mockQuestions.length);
  });

  it('returns null when isVisible is false and isHiding is false', () => {
    const { container } = render(
      <ConversationStartersCompact
        questions={mockQuestions}
        onStarterClick={jest.fn()}
        isVisible={false}
        isHiding={false}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('has weni-starters-compact class', () => {
    const { container } = render(
      <ConversationStartersCompact
        questions={mockQuestions}
        onStarterClick={jest.fn()}
        isVisible={true}
      />,
    );

    expect(
      container.querySelector('.weni-starters-compact'),
    ).toBeInTheDocument();
  });

  it('has weni-starters-compact--hiding class when isHiding is true', () => {
    const { container } = render(
      <ConversationStartersCompact
        questions={mockQuestions}
        onStarterClick={jest.fn()}
        isVisible={false}
        isHiding={true}
      />,
    );

    expect(
      container.querySelector('.weni-starters-compact--hiding'),
    ).toBeInTheDocument();
  });

  it('calls onStarterClick when a button is clicked', () => {
    const handleClick = jest.fn();
    render(
      <ConversationStartersCompact
        questions={mockQuestions}
        onStarterClick={handleClick}
        isVisible={true}
      />,
    );

    fireEvent.click(screen.getByText(mockQuestions[1]));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockQuestions[1]);
  });
});

describe('ConversationStartersFull', () => {
  it('renders all questions as full buttons', () => {
    render(
      <ConversationStartersFull
        questions={mockQuestions}
        onStarterClick={jest.fn()}
      />,
    );

    mockQuestions.forEach((question) => {
      expect(screen.getByText(question)).toBeInTheDocument();
    });

    const fullButtons = document.querySelectorAll('.weni-starter-button--full');
    expect(fullButtons).toHaveLength(mockQuestions.length);
  });

  it('returns null when questions is empty', () => {
    const { container } = render(
      <ConversationStartersFull
        questions={[]}
        onStarterClick={jest.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('has weni-starters-full class', () => {
    const { container } = render(
      <ConversationStartersFull
        questions={mockQuestions}
        onStarterClick={jest.fn()}
      />,
    );

    expect(container.querySelector('.weni-starters-full')).toBeInTheDocument();
  });

  it('calls onStarterClick when a button is clicked', () => {
    const handleClick = jest.fn();
    render(
      <ConversationStartersFull
        questions={mockQuestions}
        onStarterClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByText(mockQuestions[2]));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(mockQuestions[2]);
  });
});
