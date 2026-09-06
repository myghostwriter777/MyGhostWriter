import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));

import MeetingAssistMode from "./MeetingAssistMode";

const ui={
  Card:({children,style})=><div style={style}>{children}</div>,
  FArea:({label,value,onChange,placeholder})=><label>{label}<textarea aria-label={label} value={value} onChange={onChange} placeholder={placeholder}/></label>,
  PriBtn:({children,onClick,disabled,loading})=><button type="button" onClick={onClick} disabled={disabled||loading}>{children}</button>,
  ErrBox:({msg})=><div role="alert">{msg}</div>,
  IconLabel:({children})=><span>{children}</span>,
};

const RATE=16000;
const FRAME=4096;
const silence=ms=>new Float32Array(Math.round(RATE*ms/1000));
const tone=(ms,frequency=180,amplitude=0.25)=>{
  const output=new Float32Array(Math.round(RATE*ms/1000));
  for(let index=0;index<output.length;index+=1){const phase=(index*frequency/RATE)%1;output[index]=(phase*2-1)*amplitude;}
  return output;
};
const join=parts=>{const total=parts.reduce((sum,part)=>sum+part.length,0);const out=new Float32Array(total);let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};

// Minimal Web Audio stand-in: the script processor's callback is driven by the
// test, so a "conversation" is just PCM pushed through it.
function installFakeAudio(){
  const processors=[];
  const node=()=>({connect:jest.fn(),disconnect:jest.fn(),frequency:{value:0},Q:{value:0},gain:{value:0},type:""});
  class FakeAudioContext{
    constructor(){this.sampleRate=RATE;this.state="running";this.destination={};}
    resume(){return Promise.resolve();}
    close(){return Promise.resolve();}
    addEventListener(){}
    removeEventListener(){}
    createMediaStreamSource(){return node();}
    createBiquadFilter(){return node();}
    createGain(){return node();}
    createScriptProcessor(){const processor={...node(),onaudioprocess:null};processors.push(processor);return processor;}
  }
  window.AudioContext=FakeAudioContext;
  const track={stop:jest.fn(),addEventListener:jest.fn()};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track],getVideoTracks:()=>[]};
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:jest.fn().mockResolvedValue(stream),getDisplayMedia:jest.fn()}});
  const feed=async audio=>{
    const processor=processors.at(-1);
    await act(async()=>{
      for(let offset=0;offset<audio.length;offset+=FRAME){
        const frame=new Float32Array(FRAME);frame.set(audio.subarray(offset,Math.min(audio.length,offset+FRAME)));
        processor.onaudioprocess?.({inputBuffer:{getChannelData:()=>frame}});
      }
    });
  };
  return {feed,processors,track};
}

const reply=(heard,options,speaker="other")=>JSON.stringify({lines:[{index:0,speaker}],needsReply:speaker==="other",heard:speaker==="other"?heard:"",options:speaker==="other"?options:[]});

describe("MeetingAssistMode",()=>{
  const originalMediaDevices=navigator.mediaDevices;
  const originalAudioContext=window.AudioContext;
  const originalFetch=global.fetch;
  beforeEach(()=>{
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:jest.fn(),getDisplayMedia:jest.fn()}});
    window.AudioContext=function FakeAudioContext(){};
    localStorage.clear();
  });
  afterEach(()=>{
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:originalMediaDevices});
    window.AudioContext=originalAudioContext;
    global.fetch=originalFetch;
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

  test("remembers the conversation language per account",()=>{
    const {unmount}=render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    const select=screen.getByLabelText("Conversation language");
    expect(select).toHaveValue("");
    fireEvent.change(select,{target:{value:"th"}});
    expect(select).toHaveValue("th");
    unmount();
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    expect(screen.getByLabelText("Conversation language")).toHaveValue("th");
  });

  test("waits two seconds after the speaker finishes, then transcribes and prepares three answers",async()=>{
    const {feed}=installFakeAudio();
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({text:"Tell me about a project you led recently."})});
    const request=jest.fn().mockResolvedValue(reply("Tell me about a project you led recently.",["I led the checkout redesign at [company].","At [company] I owned a migration; sequencing was the key.","Happy to. Which part matters most to you, technical or people?"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.change(screen.getByLabelText("Conversation language"),{target:{value:"en"}});
    fireEvent.change(screen.getByLabelText("About you (recommended)"),{target:{value:"Frontend engineer applying to Acme."}});
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    expect(await screen.findByRole("button",{name:/Stop listening/})).toBeInTheDocument();

    // The speaker talks, pauses for one second mid-question, and continues.
    await feed(join([silence(300),tone(1400),silence(1000),tone(800),silence(1200)]));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByText(/Waiting for the speaker to finish/)).toBeInTheDocument();

    // Two seconds of quiet: the whole turn is transcribed and answered once.
    await feed(silence(1000));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
    const body=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.audio).toMatch(/^data:audio\/wav;base64,/);
    expect(body.language).toBe("en");
    expect(body.prompt).toMatch(/^Job interview/);
    expect(body.prompt).toContain("Acme");
    expect(await screen.findByText("I led the checkout redesign at [company].")).toBeInTheDocument();
    expect(screen.getByText("Tell me about a project you led recently.",{selector:"span"})).toBeInTheDocument();
    expect(screen.getByText("Interviewer")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][5]).toEqual(expect.objectContaining({mode:"meeting"}));
  });

  test("keeps answering after a long pause and answers the open question the moment the user starts speaking",async()=>{
    const {feed}=installFakeAudio();
    const transcripts=["What interests you about this role?","How do you handle disagreement in a team?"];
    global.fetch=jest.fn().mockImplementation(async()=>({ok:true,status:200,json:async()=>({text:transcripts.shift()||""})}));
    const request=jest.fn()
      .mockResolvedValueOnce(reply("What interests you about this role?",["First answer","Second answer","Third answer"]))
      .mockResolvedValueOnce(reply("How do you handle disagreement in a team?",["Fresh one","Fresh two","Fresh three"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    await screen.findByRole("button",{name:/Stop listening/});

    // The interviewer is still mid-question when the user taps "I'm speaking".
    await feed(join([silence(300),tone(1600)]));
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/I'm speaking/}));});
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("First answer")).toBeInTheDocument();

    // A long pause: the user's whole answer is ignored.
    await feed(join([tone(6000,120),silence(3000),tone(2000,120)]));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Resume listening/}));});

    // Next question after resuming still produces fresh answers.
    await feed(join([silence(200),tone(1500),silence(2400)]));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Fresh one")).toBeInTheDocument();
    expect(screen.queryByText("First answer")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  test("retries the answer request once before reporting a failure",async()=>{
    jest.useFakeTimers();
    try{
      const {feed}=installFakeAudio();
      global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({text:"Why should we hire you?"})});
      const request=jest.fn().mockRejectedValueOnce(new Error("Studio API error 502")).mockResolvedValueOnce(reply("Why should we hire you?",["Because A","Because B","Because C"]));
      render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
      fireEvent.click(screen.getByRole("checkbox"));
      await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
      await feed(join([silence(300),tone(1200),silence(2400)]));
      await act(async()=>{await Promise.resolve();await Promise.resolve();});
      await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
      await act(async()=>{jest.advanceTimersByTime(2600);});
      await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Because A")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }finally{jest.useRealTimers();}
  });
});
