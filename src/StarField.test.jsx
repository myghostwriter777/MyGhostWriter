import React from "react";
import { render, screen } from "@testing-library/react";
import StarField, {
  bandCenter,
  createRandom,
  createStars,
  drawShootingStar,
  drawStars,
  nextShootingDelay,
  shootingStarFade,
  spawnShootingStar,
  starCount,
  starfieldPalette,
} from "./StarField";

function fakeContext() {
  const gradient = { addColorStop: jest.fn() };
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    setTransform: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    gradient,
  };
}

describe("star field geometry", () => {
  test("the seeded generator is reproducible", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createRandom(42)()).not.toBe(createRandom(43)());
  });

  test("star count grows with the viewport and is capped for phones and big monitors", () => {
    expect(starCount(390, 844)).toBe(140);
    expect(starCount(1440, 900)).toBe(463);
    expect(starCount(3840, 2160)).toBe(900);
    expect(starCount(1440, 900, 0)).toBe(0);
  });

  test("stars stay inside the sky and a share of them gather along the diagonal band", () => {
    const width = 1600;
    const height = 900;
    const stars = createStars(width, height, { seed: 7 });
    expect(stars).toHaveLength(starCount(width, height));
    const inside = stars.filter(star => star.x >= -width * 0.1 && star.x <= width * 1.1 && star.y >= -height * 0.2 && star.y <= height * 1.2);
    expect(inside.length).toBe(stars.length);
    const band = stars.filter(star => star.band);
    expect(band.length / stars.length).toBeGreaterThan(0.3);
    expect(band.length / stars.length).toBeLessThan(0.46);
    // Band stars hug the diagonal; scattered stars do not.
    const distance = star => Math.abs(star.y - bandCenter(width, height, star.x / width).y);
    const average = list => list.reduce((sum, star) => sum + distance(star), 0) / list.length;
    expect(average(band)).toBeLessThan(average(stars.filter(star => !star.band)) * 0.6);
    // A few bright stars, mostly faint pinpricks.
    const bright = stars.filter(star => star.bright).length / stars.length;
    expect(bright).toBeGreaterThan(0.005);
    expect(bright).toBeLessThan(0.03);
    expect(createStars(width, height, { seed: 7 })).toEqual(stars);
  });

  test("a shooting star starts high, falls diagonally, and fades in then out", () => {
    const random = createRandom(3);
    const shooter = spawnShootingStar(1600, 900, random);
    expect(shooter.y).toBeLessThan(900 * 0.55);
    expect(shooter.vy).toBeGreaterThan(0);
    expect(Math.abs(shooter.vx)).toBeGreaterThan(shooter.vy);
    expect(shooter.ttl).toBeGreaterThan(0.7);
    expect(shootingStarFade({ life: 0, ttl: 1 })).toBeCloseTo(0);
    expect(shootingStarFade({ life: 0.5, ttl: 1 })).toBeCloseTo(1);
    expect(shootingStarFade({ life: 1, ttl: 1 })).toBeCloseTo(0);
    const delay = nextShootingDelay(createRandom(9));
    expect(delay).toBeGreaterThanOrEqual(2.2);
    expect(delay).toBeLessThanOrEqual(7.7);
  });

  test("shooting stars remain on screen at peak brightness on a phone", () => {
    const random = createRandom(42);
    const directions = new Set();
    for (let index = 0; index < 100; index += 1) {
      const shooter = spawnShootingStar(390, 844, random);
      const peakX = shooter.x + shooter.vx * shooter.ttl / 2;
      const peakY = shooter.y + shooter.vy * shooter.ttl / 2;
      expect(peakX).toBeGreaterThan(0);
      expect(peakX).toBeLessThan(390);
      expect(peakY).toBeGreaterThan(0);
      expect(peakY).toBeLessThan(844);
      directions.add(Math.sign(shooter.vx));
    }
    expect(directions).toEqual(new Set([-1, 1]));
  });

  test("stars are white on dark and black, softer, on light", () => {
    expect(starfieldPalette("dark")).toEqual({ r: 255, g: 255, b: 255, alphaScale: 1 });
    const light = starfieldPalette("light");
    expect(light).toEqual({ r: 0, g: 0, b: 0, alphaScale: 0.72 });
    expect(light.alphaScale).toBeLessThan(1);
    const ctx = fakeContext();
    drawStars(ctx, createStars(400, 300, { seed: 1 }), light, 0, false);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(String(ctx.fillStyle)).toMatch(/^rgba\(0,0,0,/);
  });

  test("a shooting star is drawn as a fading tail with a bright head", () => {
    const ctx = fakeContext();
    drawShootingStar(ctx, { x: 100, y: 50, vx: 800, vy: 400, length: 150, width: 2, life: 0.4, ttl: 0.8 }, starfieldPalette("dark"));
    expect(ctx.createLinearGradient).toHaveBeenCalledTimes(1);
    expect(ctx.gradient.addColorStop).toHaveBeenCalledWith(1, "rgba(255,255,255,0)");
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
    expect(ctx.lineCap).toBe("round");
  });
});

describe("StarField component", () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalMatchMedia = window.matchMedia;
  let ctx;

  beforeEach(() => {
    ctx = fakeContext();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ctx);
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    window.matchMedia = originalMatchMedia;
    jest.restoreAllMocks();
  });

  test("renders a decorative, click-through sky behind the page", () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    render(<StarField theme="light" />);
    const sky = screen.getByTestId("starfield");
    expect(sky).toHaveAttribute("aria-hidden", "true");
    expect(sky).toHaveAttribute("data-theme", "light");
    expect(sky.style.pointerEvents).toBe("none");
    expect(sky.style.position).toBe("fixed");
    expect(sky.style.zIndex).toBe("-1");
  });

  test("with reduced motion it draws the sky once and never animates", () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    const raf = jest.spyOn(window, "requestAnimationFrame");
    render(<StarField theme="dark" />);
    expect(ctx.setTransform).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  test("otherwise it animates and stops cleanly on unmount", () => {
    window.matchMedia = jest.fn(() => ({ matches: false }));
    const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => 17);
    const cancel = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { unmount } = render(<StarField theme="dark" />);
    expect(raf).toHaveBeenCalledTimes(1);
    unmount();
    expect(cancel).toHaveBeenCalledWith(17);
  });

  test("changing reduced-motion preference stops and resumes animation with listener cleanup", () => {
    const motionQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    window.matchMedia = jest.fn(() => motionQuery);
    const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => 17);
    const cancel = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { unmount } = render(<StarField theme="dark" />);
    const onChange = motionQuery.addEventListener.mock.calls[0][1];
    const initialDraws = ctx.clearRect.mock.calls.length;

    onChange({ matches: true });
    expect(cancel).toHaveBeenCalledWith(17);
    expect(ctx.clearRect.mock.calls.length).toBe(initialDraws + 1);
    expect(raf).toHaveBeenCalledTimes(1);

    onChange({ matches: false });
    expect(raf).toHaveBeenCalledTimes(2);
    unmount();
    expect(motionQuery.removeEventListener).toHaveBeenCalledWith("change", onChange);
  });

  test("draws an initial sky while hidden and only animates when the page becomes visible", () => {
    window.matchMedia = jest.fn(() => ({ matches: false }));
    const hidden = jest.spyOn(document, "hidden", "get").mockReturnValue(true);
    const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(() => 17);
    const cancel = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    render(<StarField />);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(raf).toHaveBeenCalledTimes(1);

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(cancel).toHaveBeenCalledWith(17);
  });

  test("renders nothing harmful when the browser has no 2D canvas", () => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
    expect(() => render(<StarField />)).not.toThrow();
  });
});
