import React from "react";

// Verified against the public GhostwriterMe listing. HTTPS also works on desktop
// and devices without the Play Store app installed.
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.ghostwriterme.app";

export default function GooglePlayButton({ compact = false, href = GOOGLE_PLAY_URL, className = "", style, onClick }) {
  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Get GhostwriterMe on Google Play (opens in a new tab)"
    className={className}
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
      minHeight: 44, boxSizing: "border-box", padding: compact ? "8px 12px" : "10px 17px",
      color: "#fff", background: "#101218", border: "1px solid #737782", borderRadius: 12,
      fontFamily: "inherit", fontSize: compact ? 12 : 13, fontWeight: 600, lineHeight: 1.25,
      textDecoration: "none", ...style,
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" />
    </svg>
    <span>Get it on Google Play</span>
  </a>;
}
