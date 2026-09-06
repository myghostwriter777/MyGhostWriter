import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));

import MeetingAssistMode from "./MeetingAssistMode";

const ui={
  Card:({children,style})=><div style={style}>{children}</div>,
  FArea:({label,value,onChange,placeholder})=><label>{label}<textarea aria-label={label} value={value} onChange={onChange} placeholder={placeholder}/></label>,
  PriBtn:({children,onClick,disabled,loading})=><button type="button" onClick={onClick} disabled={disabled||loading}>{children}</button>,
  ErrBox:({msg})=><div role="alert">{msg}</div>,
  IconLabel:({children})=><span>{children}</span>,
};

describe("MeetingAssistMode",()=>{
  const originalMediaDevices=navigator.mediaDevices;
  const originalAudioContext=window.AudioContext;
  beforeEach(()=>{
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:jest.fn(),getDisplayMedia:jest.fn()}});
    window.AudioContext=function FakeAudioContext(){};
    localStorage.clear();
  });
  afterEach(()=>{
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:originalMediaDevices});
    window.AudioContext=originalAudioContext;
  });

  test("defaults to the microphone, an interview, and requires consent before starting",()=>{
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    expect(screen.getByRole("button",{name:/^Microphone/})).toHaveAttribute("aria-pressed","true");
    expect(screen.getByRole("button",{name:/Job interview/})).toHaveAttribute("aria-pressed","true");
    const start=screen.getByRole("button",{name:/Start listening/});
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(start).not.toBeDisabled();
    expect(screen.getByText(/Teach Ghosty your voice/)).toBeInTheDocument();
    expect(screen.queryByText(/Prepare Offline/)).not.toBeInTheDocument();
  });

  test("keeps the meeting-tab source available only where a tab can be shared",()=>{
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    const tab=screen.getByRole("button",{name:/Meeting tab audio/});
    // jsdom's user agent is not Chromium, so the remote-only path is disabled.
    expect(tab).toBeDisabled();
  });
});
