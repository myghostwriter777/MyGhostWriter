import React, { useEffect, useRef, useState } from "react";
import { aiDetectionInputError, parseAiDetection } from "./aiDetection";

const buttonStyle = { minHeight: 40, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--gwm-border)", background: "var(--gwm-card)", color: "var(--gwm-violet-text)", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" };

export default function AiDetectionPanel({ text, rewrittenText, analyze, disabled = false }) {
  const [target, setTarget] = useState("original");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const source = target === "rewrite" ? (rewrittenText || "") : text;
  const inputError = aiDetectionInputError(source);

  useEffect(() => {
    request.current?.abort();
    setResult(null); setError(""); setLoading(false);
    return () => request.current?.abort();
  }, [source, target]);

  useEffect(() => { if (!rewrittenText) setTarget("original"); }, [rewrittenText]);

  const run = async () => {
    if (disabled || inputError || loading) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(""); setResult(null);
    try {
      const raw = await analyze(source.trim(), controller.signal);
      if (!controller.signal.aborted) setResult({ ...parseAiDetection(raw), source, target });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure?.message || "Analysis is unavailable. Please try again.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  };
  const currentResult = result?.source === source && result?.target === target ? result : null;

  return <section aria-label="AI content detection" style={{ marginBottom: 16, padding: 12, borderRadius: 8, border: "1px solid rgba(192,132,252,0.28)", background: "var(--gwm-surface)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--gwm-violet-text)" }}>AI content detection</div>
      <button type="button" onClick={run} disabled={disabled || !!inputError || loading} style={{ ...buttonStyle, opacity: disabled || inputError || loading ? 0.55 : 1, cursor: disabled || inputError || loading ? "not-allowed" : "pointer" }}>{loading ? "Analyzing…" : "Analyze AI content"}</button>
    </div>
    {rewrittenText && <div role="group" aria-label="Text to analyze" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {[{ id: "original", label: "Original text" }, { id: "rewrite", label: "Humanized text" }].map(item => <button key={item.id} type="button" aria-pressed={target === item.id} onClick={() => setTarget(item.id)} style={{ ...buttonStyle, background: target === item.id ? "rgba(192,132,252,0.1)" : "transparent" }}>{item.label}</button>)}
    </div>}
    <p style={{ fontSize: 12, color: "var(--gwm-muted)", lineHeight: 1.5, margin: "8px 0 0" }}>Estimates how AI-like the writing appears on a 1–100% scale. It cannot measure how much was written by AI or prove authorship.</p>
    <div aria-live="polite" aria-busy={loading}>
      {inputError && <p style={{ fontSize: 12, color: "var(--gwm-muted)", margin: "8px 0 0" }}>{inputError}</p>}
      {loading && <p role="status" style={{ fontSize: 13, color: "var(--gwm-violet-text)", margin: "10px 0 0" }}>Checking writing patterns in {target === "rewrite" ? "the humanized" : "the original"} text…</p>}
      {currentResult && <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}><strong style={{ fontSize: 30, color: "var(--gwm-violet-text)" }}>{currentResult.score}%</strong><span style={{ fontSize: 13, color: "var(--gwm-text)" }}>Estimated AI-content score · {target === "rewrite" ? "Humanized text" : "Original text"}</span></div>
        <div role="meter" aria-label="Estimated AI-content score" aria-valuemin={1} aria-valuemax={100} aria-valuenow={currentResult.score} style={{ height: 6, borderRadius: 4, background: "var(--gwm-border)", margin: "8px 0 10px", overflow: "hidden" }}><div style={{ width: `${currentResult.score}%`, height: "100%", background: "#c084fc" }}/></div>
        <p style={{ fontSize: 13, color: "var(--gwm-text)", lineHeight: 1.6, margin: 0 }}>{currentResult.summary}</p>
        {!!currentResult.signals.length && <ul style={{ paddingLeft: 20, margin: "8px 0 0", color: "var(--gwm-muted)", fontSize: 12, lineHeight: 1.6 }}>{currentResult.signals.map((signal, index) => <li key={index}>{signal}</li>)}</ul>}
        {source.trim().length < 1000 && <p style={{ fontSize: 12, color: "var(--gwm-muted)", margin: "8px 0 0" }}>This short sample makes the estimate especially uncertain.</p>}
      </div>}
    </div>
    {error && <p role="alert" style={{ fontSize: 13, color: "var(--gwm-red-text)", margin: "10px 0 0" }}>{error}</p>}
  </section>;
}
