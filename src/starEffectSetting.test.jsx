import { fireEvent, render, screen } from "@testing-library/react";
import GhostwriterMeApp from "./App";

jest.mock("./localWhisper", () => ({ prepareLocalWhisper: jest.fn(), transcribeLocalAudio: jest.fn() }));

// Stored values are part of the contract: renaming them would silently reset
// every user's saved choice.
const STAR_EFFECT_KEY = "gwm_star_effect_v1";
const THEME_KEY = "gwm_theme_v1";
const SESSION_KEY = "gwm_session_v1";
const originalFetch = global.fetch;

const signIn = () => localStorage.setItem(SESSION_KEY, JSON.stringify({ email: "stars@example.test", name: "Star Tester", plan: "free" }));
// The landing page's theme button names the mode it switches to.
const landingThemeButton = theme => screen.getByRole("button", { name: theme === "light" ? "Switch to dark mode" : "Switch to light mode" });

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, headers: { get: () => "" }, json: async () => ({}) });
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test("shows the star effect by default and remembers that it is on", () => {
  render(<GhostwriterMeApp/>);
  expect(screen.getByTestId("starfield")).toBeInTheDocument();
  expect(localStorage.getItem(STAR_EFFECT_KEY)).toBe("on");
});

test.each(["dark", "light"])("keeps the star effect off in %s mode when this device turned it off", theme => {
  localStorage.setItem(THEME_KEY, theme);
  localStorage.setItem(STAR_EFFECT_KEY, "off");
  render(<GhostwriterMeApp/>);
  expect(landingThemeButton(theme)).toBeInTheDocument();
  expect(screen.queryByTestId("starfield")).not.toBeInTheDocument();
});

test.each(["dark", "light"])("the Settings switch turns the star effect off and back on in %s mode", theme => {
  localStorage.setItem(THEME_KEY, theme);
  signIn();
  render(<GhostwriterMeApp/>);
  expect(screen.getByTestId("starfield")).toHaveAttribute("data-theme", theme);

  fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
  const turnOff = screen.getByRole("switch", { name: "Turn off star effect" });
  expect(turnOff).toHaveAttribute("aria-checked", "true");
  fireEvent.click(turnOff);

  expect(screen.queryByTestId("starfield")).not.toBeInTheDocument();
  expect(localStorage.getItem(STAR_EFFECT_KEY)).toBe("off");
  expect(screen.getByRole("switch", { name: "Turn on star effect" })).toHaveAttribute("aria-checked", "false");

  fireEvent.click(screen.getByRole("switch", { name: "Turn on star effect" }));
  expect(screen.getByTestId("starfield")).toHaveAttribute("data-theme", theme);
  expect(localStorage.getItem(STAR_EFFECT_KEY)).toBe("on");
});

test("the star choice is independent of the colour theme", () => {
  signIn();
  render(<GhostwriterMeApp/>);
  fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
  fireEvent.click(screen.getByRole("switch", { name: "Turn off star effect" }));

  // Switching theme keeps the stars off...
  fireEvent.click(screen.getByRole("switch", { name: "Use light mode" }));
  expect(screen.getByRole("switch", { name: "Use dark mode" })).toHaveAttribute("aria-checked", "true");
  expect(screen.queryByTestId("starfield")).not.toBeInTheDocument();

  // ...and turning them back on uses the current theme's colours.
  fireEvent.click(screen.getByRole("switch", { name: "Turn on star effect" }));
  expect(screen.getByTestId("starfield")).toHaveAttribute("data-theme", "light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
});
