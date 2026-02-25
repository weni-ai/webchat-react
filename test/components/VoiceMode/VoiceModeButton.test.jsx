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
