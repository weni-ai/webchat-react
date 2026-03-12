import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const SvgStub = (props) => <svg {...props} />;
jest.mock("@/utils/icons", () => ({
  icons: new Proxy(
    {},
    {
      get: () => ({ default: SvgStub, filled: SvgStub }),
    },
  ),
}));

import { VoiceModeError } from "@/components/VoiceMode/VoiceModeError";

const baseError = {
  code: "MIC_DENIED",
  message: "Microphone access denied",
  suggestion: "Please allow microphone access",
  recoverable: true,
};

describe("VoiceModeError", () => {
  it('renders with role="alert"', () => {
    render(<VoiceModeError error={baseError} onDismiss={jest.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<VoiceModeError error={baseError} onDismiss={jest.fn()} />);
    expect(screen.getByText("Microphone access denied")).toBeInTheDocument();
  });

  it("renders suggestion text", () => {
    render(<VoiceModeError error={baseError} onDismiss={jest.fn()} />);
    expect(
      screen.getByText("Please allow microphone access"),
    ).toBeInTheDocument();
  });

  it("does not render message when absent", () => {
    const error = { code: "ERR", recoverable: false };
    const { container } = render(
      <VoiceModeError error={error} onDismiss={jest.fn()} />,
    );
    expect(
      container.querySelector(".weni-voice-error__message"),
    ).not.toBeInTheDocument();
  });

  it("does not render suggestion when absent", () => {
    const error = { code: "ERR", message: "Oops", recoverable: false };
    const { container } = render(
      <VoiceModeError error={error} onDismiss={jest.fn()} />,
    );
    expect(
      container.querySelector(".weni-voice-error__suggestion"),
    ).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = jest.fn();
    render(
      <VoiceModeError
        error={baseError}
        onRetry={onRetry}
        onDismiss={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render retry button when error is not recoverable", () => {
    const error = { ...baseError, recoverable: false };
    render(
      <VoiceModeError
        error={error}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it("does not render retry button when onRetry is not provided", () => {
    render(<VoiceModeError error={baseError} onDismiss={jest.fn()} />);
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = jest.fn();
    render(<VoiceModeError error={baseError} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders default title "Something went wrong"', () => {
    render(<VoiceModeError error={baseError} onDismiss={jest.fn()} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("custom texts override defaults", () => {
    const texts = {
      errorTitle: "Custom Error",
      retry: "Retry Now",
      dismiss: "Close",
    };
    render(
      <VoiceModeError
        error={baseError}
        onRetry={jest.fn()}
        onDismiss={jest.fn()}
        texts={texts}
      />,
    );
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByText("Retry Now")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });
});
