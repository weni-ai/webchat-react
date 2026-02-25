import { render, screen } from "@testing-library/react";
import { WaveformVisualizer } from "@/components/VoiceMode/WaveformVisualizer";

describe("WaveformVisualizer", () => {
  it("renders 5 bars by default", () => {
    const { container } = render(<WaveformVisualizer />);
    const bars = container.querySelectorAll(".weni-waveform__bar");
    expect(bars).toHaveLength(5);
  });

  it("renders custom barCount", () => {
    const { container } = render(<WaveformVisualizer barCount={8} />);
    const bars = container.querySelectorAll(".weni-waveform__bar");
    expect(bars).toHaveLength(8);
  });

  it.each([
    ["idle", "weni-waveform--idle"],
    ["listening", "weni-waveform--listening"],
    ["speaking", "weni-waveform--speaking"],
    ["processing", "weni-waveform--processing"],
  ])('applies state class for "%s"', (state, expectedClass) => {
    const { container } = render(<WaveformVisualizer state={state} />);
    expect(container.firstChild).toHaveClass(expectedClass);
  });

  it.each([
    ["idle", "Voice mode indicator"],
    ["listening", "Listening for your voice"],
    ["speaking", "Playing audio response"],
    ["processing", "Processing your speech"],
  ])('has correct aria-label for state "%s"', (state, expectedLabel) => {
    render(<WaveformVisualizer state={state} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expectedLabel,
    );
  });

  it('renders with role="img"', () => {
    render(<WaveformVisualizer />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<WaveformVisualizer className="my-custom" />);
    expect(container.firstChild).toHaveClass("weni-waveform", "my-custom");
  });
});
