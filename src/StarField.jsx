import React, { useEffect, useRef } from "react";
import starTexture from "./assets/starfield-reference.webp";

// The supplied sky photograph provides the dense, fine-grained star field.
// A sparse canvas foreground adds subtle twinkles and falling-star trails.
//
// The isolated theme root keeps the z-index -1 sky above the body background
// and below page content. Screen roots stay transparent; the body carries the
// theme colour, and cards keep their solid surfaces for readability.
//
// Dark theme: white stars. Light theme: black stars at lower opacity so
// they read as texture rather than dirt.

export const STAR_COLORS = {
  dark: { r: 255, g: 255, b: 255, alphaScale: 1 },
  light: { r: 0, g: 0, b: 0, alphaScale: 0.72 },
};

export function starfieldPalette(theme) {
  return theme === "light" ? STAR_COLORS.light : STAR_COLORS.dark;
}

// mulberry32: tiny seeded generator so a layout can be reproduced in tests and
// kept stable across theme toggles.
export function createRandom(seed) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bound the animated foreground independently of the static sky texture.
export function starCount(width, height, density = 1) {
  const area = Math.max(0, width) * Math.max(0, height);
  return Math.round(Math.min(900, Math.max(140, area / 2800)) * Math.max(0, density));
}

// Point on the diagonal band for a given progress 0..1 across the width.
export function bandCenter(width, height, t) {
  return { x: t * width, y: height * (0.64 - 0.34 * t) };
}

export function createStars(width, height, { seed = 1, density = 1 } = {}) {
  const random = createRandom(seed);
  const count = starCount(width, height, density);
  const stars = [];
  for (let index = 0; index < count; index += 1) {
    let x = random() * width;
    let y = random() * height;
    const band = random() < 0.38;
    if (band) {
      const t = random();
      const center = bandCenter(width, height, t);
      // Sum of two uniforms gives a soft, centre-heavy spread.
      x = center.x + (random() + random() - 1) * width * 0.05;
      y = center.y + (random() + random() - 1) * height * 0.16;
    }
    const tier = random();
    const bright = tier >= 0.985;
    const radius = tier < 0.8 ? 0.2 + random() * 0.25 : bright ? 0.85 + random() * 0.55 : 0.45 + random() * 0.35;
    stars.push({
      x, y, radius, band, bright,
      base: bright ? 0.6 + random() * 0.25 : 0.15 + random() * 0.25,
      amp: 0.04 + random() * 0.08,
      speed: 0.3 + random() * 0.6,
      phase: random() * Math.PI * 2,
    });
  }
  return stars;
}

// A shooting star starts in the upper part of the sky and falls at a shallow
// diagonal, left or right, over roughly a second.
export function spawnShootingStar(width, height, random = Math.random) {
  const angle = ((22 + random() * 26) * Math.PI) / 180;
  const direction = random() < 0.5 ? 1 : -1;
  const viewportScale = Math.min(1, Math.max(1, width) / 1200);
  const speed = (820 + random() * 620) * viewportScale;
  // Enter from the side opposite the direction of travel. Scale the journey
  // on narrow screens so the bright part stays visible on phones, too.
  const startX = direction === 1 ? 0.05 + random() * 0.15 : 0.8 + random() * 0.15;
  return {
    x: startX * width,
    y: random() * height * 0.55,
    vx: Math.cos(angle) * speed * direction,
    vy: Math.sin(angle) * speed,
    length: (140 + random() * 170) * viewportScale,
    width: 1.2 + random() * 1.1,
    life: 0,
    ttl: 0.75 + random() * 0.55,
  };
}

// Seconds until the next shooting star: frequent enough to be noticed within
// a few seconds of arriving, rare enough not to become wallpaper.
export function nextShootingDelay(random = Math.random) {
  return 2.2 + random() * 5.5;
}

export function shootingStarFade(shooter) {
  const progress = Math.min(1, Math.max(0, shooter.life / shooter.ttl));
  return Math.sin(Math.PI * progress);
}

export function drawStars(ctx, stars, palette, time, animate = true) {
  const { r, g, b, alphaScale } = palette;
  for (const star of stars) {
    const flicker = animate ? star.amp * Math.sin(time * star.speed + star.phase) : 0;
    const alpha = Math.min(1, Math.max(0.04, (star.base + flicker) * alphaScale));
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    if (star.bright) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${r},${g},${b},${(alpha * 0.16).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const size = star.radius * 2;
      ctx.fillRect(star.x - star.radius, star.y - star.radius, size, size);
    }
  }
}

export function drawShootingStar(ctx, shooter, palette) {
  const { r, g, b, alphaScale } = palette;
  const fade = shootingStarFade(shooter) * alphaScale;
  if (fade <= 0) return;
  const magnitude = Math.hypot(shooter.vx, shooter.vy) || 1;
  const tailX = shooter.x - (shooter.vx / magnitude) * shooter.length;
  const tailY = shooter.y - (shooter.vy / magnitude) * shooter.length;
  const gradient = ctx.createLinearGradient(shooter.x, shooter.y, tailX, tailY);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${(0.95 * fade).toFixed(3)})`);
  gradient.addColorStop(0.35, `rgba(${r},${g},${b},${(0.45 * fade).toFixed(3)})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = shooter.width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(shooter.x, shooter.y);
  ctx.lineTo(tailX, tailY);
  ctx.stroke();
  ctx.fillStyle = `rgba(${r},${g},${b},${fade.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(shooter.x, shooter.y, shooter.width * 0.9, 0, Math.PI * 2);
  ctx.fill();
}

export default function StarField({ theme = "dark", density = 0.2 }) {
  const canvasRef = useRef(null);
  // One seed per mount keeps the layout identical when the theme flips.
  const seedRef = useRef(Math.floor(Math.random() * 0xffffffff));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const palette = starfieldPalette(theme);
    const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduceMotion = Boolean(motionQuery?.matches);
    let width = 0;
    let height = 0;
    let stars = [];
    let shooters = [];
    let untilNextShooter = nextShootingDelay();
    let frame = 0;
    let lastTime = 0;
    let disposed = false;

    const clear = () => {
      ctx.clearRect(0, 0, width, height);
    };

    const drawStatic = () => {
      clear();
      drawStars(ctx, stars, palette, 0, false);
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(width, height, { seed: seedRef.current, density });
      shooters = [];
      drawStatic();
    };

    const tick = now => {
      if (disposed) return;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
      lastTime = now;
      const time = now / 1000;

      untilNextShooter -= dt;
      if (untilNextShooter <= 0 && shooters.length < 2) {
        shooters.push(spawnShootingStar(width, height));
        untilNextShooter = nextShootingDelay();
      }
      for (const shooter of shooters) {
        shooter.x += shooter.vx * dt;
        shooter.y += shooter.vy * dt;
        shooter.life += dt;
      }
      shooters = shooters.filter(
        shooter => shooter.life < shooter.ttl && shooter.y < height + shooter.length && shooter.x > -shooter.length && shooter.x < width + shooter.length
      );

      clear();
      drawStars(ctx, stars, palette, time, true);
      for (const shooter of shooters) drawShootingStar(ctx, shooter, palette);
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduceMotion || disposed || frame) return;
      lastTime = 0;
      frame = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onMotionChange = event => {
      reduceMotion = Boolean(event.matches);
      stop();
      shooters = [];
      drawStatic();
      if (!document.hidden) start();
    };

    resize();
    if (!document.hidden) start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (motionQuery?.addEventListener) motionQuery.addEventListener("change", onMotionChange);
    else motionQuery?.addListener?.(onMotionChange);
    return () => {
      disposed = true;
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener("change", onMotionChange);
      else motionQuery?.removeListener?.(onMotionChange);
    };
  }, [theme, density]);

  return (
    <div
      aria-hidden="true"
      data-testid="starfield"
      data-theme={theme}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", overflow: "hidden", pointerEvents: "none", zIndex: -1 }}
    >
      <img
        src={starTexture}
        alt=""
        draggable={false}
        decoding="async"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", filter: theme === "light" ? "grayscale(1) invert(1)" : "grayscale(1)", opacity: theme === "light" ? 0.72 : 1 }}
      />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}/>
    </div>
  );
}
