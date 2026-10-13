import React, { Suspense, useState } from "react";

// An error in one tool must not unmount the shell or discard other drafts.
export class ModeBoundary extends React.Component {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState(state => ({ failed: false, attempt: state.attempt + 1 }));
    }
  }

  retry = () => {
    this.props.onRetry?.();
    this.setState(state => ({ failed: false, attempt: state.attempt + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" style={{ padding: 18, border: "1px solid var(--gwm-border)", borderRadius: 10, background: "var(--gwm-card)", color: "var(--gwm-text)" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 800 }}>{this.props.label || "This tool"} could not open.</p>
          <p style={{ margin: "0 0 14px", color: "var(--gwm-muted)", lineHeight: 1.5 }}>Try again to restart this tool. Your other tools remain available.</p>
          <button type="button" onClick={this.retry} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid var(--gwm-border)", background: "var(--gwm-surface)", color: "var(--gwm-text)", font: "inherit", cursor: "pointer" }}>Try again</button>
        </div>
      );
    }
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}

const loadMeetingAssist = () => import("./MeetingAssistMode");

export function LazyMeetingAssistMode({ load = loadMeetingAssist, ...props }) {
  // React.lazy caches rejected imports. A new lazy component is required to
  // retry a lost connection without reloading the app and its other drafts.
  const [MeetingAssist, setMeetingAssist] = useState(() => React.lazy(load));
  return (
    <ModeBoundary label="Meeting Assist" resetKey={MeetingAssist} onRetry={() => setMeetingAssist(() => React.lazy(load))}>
      <Suspense fallback={<div role="status" style={{ padding: 18, color: "var(--gwm-muted)" }}>Loading Meeting Assist…</div>}>
        <MeetingAssist {...props} />
      </Suspense>
    </ModeBoundary>
  );
}

const loadLecture = () => import("./LectureMode");

export function LazyLectureMode({ load = loadLecture, ...props }) {
  const [Lecture, setLecture] = useState(() => React.lazy(load));
  return (
    <ModeBoundary label="Lecture" resetKey={Lecture} onRetry={() => setLecture(() => React.lazy(load))}>
      <Suspense fallback={<div role="status" style={{ padding: 18, color: "var(--gwm-muted)" }}>Loading Lecture…</div>}>
        <Lecture {...props} />
      </Suspense>
    </ModeBoundary>
  );
}
