import { render, screen, fireEvent } from "@testing-library/react";
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

import { VoiceModeOverlay } from "@/components/VoiceMode/VoiceModeOverlay";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const defaultProps = {
  isOpen: true,
  state: "idle",
  onClose: jest.fn(),
  onRetry: jest.fn(),
};

function renderOverlay(props = {}) {
  return render(<VoiceModeOverlay {...defaultProps} {...props} />);
}

describe("VoiceModeOverlay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when isOpen is false", () => {
    const { container } = renderOverlay({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog with role="dialog" and aria-modal="true"', () => {
    renderOverlay();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders title from i18n by default", () => {
    renderOverlay();
    expect(screen.getByText("voice_mode.title")).toBeInTheDocument();
  });

  it("renders title from texts prop when provided", () => {
    renderOverlay({ texts: { title: "My Voice" } });
    expect(screen.getByText("My Voice")).toBeInTheDocument();
  });

  it("close button calls onClose", async () => {
    const onClose = jest.fn();
    renderOverlay({ onClose });
    await userEvent.click(screen.getByLabelText("Close voice mode"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape key calls onClose", () => {
    const onClose = jest.fn();
    renderOverlay({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape when isOpen is false", () => {
    const onClose = jest.fn();
    renderOverlay({ isOpen: false, onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("displays partial transcript when provided", () => {
    renderOverlay({ partialTranscript: "Hello wor" });
    expect(screen.getByText("Hello wor")).toBeInTheDocument();
  });

  it("does not display partial transcript area when empty", () => {
    const { container } = renderOverlay({ partialTranscript: "" });
    expect(
      container.querySelector(".weni-voice-overlay__transcript--partial"),
    ).not.toBeInTheDocument();
  });

  it("displays committed transcript when provided", () => {
    renderOverlay({ committedTranscript: "Hello world" });
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("displays agent text when provided", () => {
    renderOverlay({ agentText: "I can help you" });
    expect(screen.getByText("I can help you")).toBeInTheDocument();
  });

  it('renders WaveformVisualizer with "listening" state for listening voice state', () => {
    const { container } = renderOverlay({ state: "listening" });
    expect(
      container.querySelector(".weni-waveform--listening"),
    ).toBeInTheDocument();
  });

  it('renders WaveformVisualizer with "speaking" state for speaking voice state', () => {
    const { container } = renderOverlay({ state: "speaking" });
    expect(
      container.querySelector(".weni-waveform--speaking"),
    ).toBeInTheDocument();
  });

  it('renders WaveformVisualizer with "processing" state for processing voice state', () => {
    const { container } = renderOverlay({ state: "processing" });
    expect(
      container.querySelector(".weni-waveform--processing"),
    ).toBeInTheDocument();
  });

  it('maps "listening_active" to waveform "listening"', () => {
    const { container } = renderOverlay({ state: "listening_active" });
    expect(
      container.querySelector(".weni-waveform--listening"),
    ).toBeInTheDocument();
  });

  it('maps "thinking" to waveform "processing"', () => {
    const { container } = renderOverlay({ state: "thinking" });
    expect(
      container.querySelector(".weni-waveform--processing"),
    ).toBeInTheDocument();
  });

  it("renders VoiceModeError when error prop is set", () => {
    const error = {
      code: "MIC_DENIED",
      message: "Mic denied",
      recoverable: true,
    };
    renderOverlay({ error });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Mic denied")).toBeInTheDocument();
  });

  it("does not render waveform when error is present", () => {
    const error = { code: "ERR", message: "Oops", recoverable: false };
    const { container } = renderOverlay({ error });
    expect(container.querySelector(".weni-waveform")).not.toBeInTheDocument();
  });

  it("shows listening status text for listening state", () => {
    renderOverlay({ state: "listening" });
    expect(screen.getByText("voice_mode.listening")).toBeInTheDocument();
    expect(screen.getByText("voice_mode.microphoneHint")).toBeInTheDocument();
  });

  it("shows processing status text for processing state", () => {
    renderOverlay({ state: "processing" });
    expect(screen.getByText("voice_mode.processing")).toBeInTheDocument();
  });

  it("shows speaking status text for speaking state", () => {
    renderOverlay({ state: "speaking" });
    expect(screen.getByText("voice_mode.speaking")).toBeInTheDocument();
  });
});
