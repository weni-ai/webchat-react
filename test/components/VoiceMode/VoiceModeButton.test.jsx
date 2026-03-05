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

import { VoiceModeButton } from "@/components/VoiceMode/VoiceModeButton";

describe("VoiceModeButton", () => {
  describe("inactive state (default)", () => {
    it('renders button with aria-label "Enter voice mode"', () => {
      render(<VoiceModeButton onClick={jest.fn()} />);
      expect(screen.getByLabelText("Enter voice mode")).toBeInTheDocument();
    });

    it("click calls onClick handler", async () => {
      const onClick = jest.fn();
      render(<VoiceModeButton onClick={onClick} />);
      await userEvent.click(screen.getByLabelText("Enter voice mode"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("disabled prop disables the button", () => {
      render(<VoiceModeButton onClick={jest.fn()} disabled />);
      expect(screen.getByLabelText("Enter voice mode")).toBeDisabled();
    });

    it("applies custom className", () => {
      render(<VoiceModeButton onClick={jest.fn()} className="extra-class" />);
      const btn = screen.getByLabelText("Enter voice mode");
      expect(btn).toHaveClass("weni-voice-mode-btn", "extra-class");
    });

    it("renders as a button element", () => {
      render(<VoiceModeButton onClick={jest.fn()} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("active state (isActive=true)", () => {
    it('renders button with aria-label "Exit voice mode"', () => {
      render(<VoiceModeButton onClick={jest.fn()} isActive />);
      expect(screen.getByLabelText("Exit voice mode")).toBeInTheDocument();
    });

    it("click calls onClick handler when active", async () => {
      const onClick = jest.fn();
      render(<VoiceModeButton onClick={onClick} isActive />);
      await userEvent.click(screen.getByLabelText("Exit voice mode"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("has active class when isActive is true", () => {
      render(<VoiceModeButton onClick={jest.fn()} isActive />);
      const btn = screen.getByLabelText("Exit voice mode");
      expect(btn).toHaveClass("weni-voice-mode-btn--active");
    });

    it("renders animated waveform bars when active", () => {
      const { container } = render(
        <VoiceModeButton onClick={jest.fn()} isActive voiceState="listening" />,
      );
      const bars = container.querySelectorAll(".weni-voice-mode-btn__bar");
      expect(bars).toHaveLength(4);
    });

    it("applies listening animation state", () => {
      const { container } = render(
        <VoiceModeButton onClick={jest.fn()} isActive voiceState="listening" />,
      );
      expect(
        container.querySelector(".weni-voice-mode-btn__bars--listening"),
      ).toBeInTheDocument();
    });

    it("applies speaking animation state", () => {
      const { container } = render(
        <VoiceModeButton onClick={jest.fn()} isActive voiceState="speaking" />,
      );
      expect(
        container.querySelector(".weni-voice-mode-btn__bars--speaking"),
      ).toBeInTheDocument();
    });

    it("applies processing animation state for processing voiceState", () => {
      const { container } = render(
        <VoiceModeButton
          onClick={jest.fn()}
          isActive
          voiceState="processing"
        />,
      );
      expect(
        container.querySelector(".weni-voice-mode-btn__bars--processing"),
      ).toBeInTheDocument();
    });

    it("applies processing animation state for thinking voiceState", () => {
      const { container } = render(
        <VoiceModeButton onClick={jest.fn()} isActive voiceState="thinking" />,
      );
      expect(
        container.querySelector(".weni-voice-mode-btn__bars--processing"),
      ).toBeInTheDocument();
    });

    it("disabled prop disables the active button", () => {
      render(<VoiceModeButton onClick={jest.fn()} isActive disabled />);
      expect(screen.getByLabelText("Exit voice mode")).toBeDisabled();
    });
  });
});
