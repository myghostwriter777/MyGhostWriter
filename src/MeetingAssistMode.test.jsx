/* eslint-disable testing-library/no-unnecessary-act -- Flush asynchronous microphone permission and graph setup before feeding PCM callbacks. */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MeetingAssistMode from "./MeetingAssistMode";
jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));

const ui={
  Card:({children,style})=><div style={style}>{children}</div>,
  FArea:({label,value,onChange,placeholder})=><label>{label}<textarea aria-label={label} value={value} onChange={onChange} placeholder={placeholder}/></label>,
  PriBtn:({children,onClick,disabled,loading})=><button type="button" onClick={onClick} disabled={disabled||loading}>{children}</button>,
  ErrBox:({msg})=><div role="alert">{msg}</div>,
  IconLabel:({children})=><span>{children}</span>,
};

const RATE=16000;
const FRAME=1024;
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
  const contexts=[];
  const node=()=>({connect:jest.fn(),disconnect:jest.fn(),frequency:{value:0},Q:{value:0},gain:{value:0},type:""});
  class FakeAudioContext{
    constructor(options){this.options=options;this.sampleRate=RATE;this.state="running";this.destination={};this.close=jest.fn().mockResolvedValue();contexts.push(this);}
    resume(){return Promise.resolve();}
    close(){return Promise.resolve();}
    addEventListener(){}
    removeEventListener(){}
    createMediaStreamSource(){return node();}
    createBiquadFilter(){return node();}
    createGain(){return node();}
    createScriptProcessor(bufferSize){const processor={...node(),bufferSize,onaudioprocess:null};processors.push(processor);return processor;}
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
  return {feed,processors,track,contexts};
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

  test("releases capture if microphone permission resolves after leaving the mode",async()=>{
    const {track,contexts}=installFakeAudio();
    let allow;
    navigator.mediaDevices.getUserMedia.mockImplementation(()=>new Promise(resolve=>{allow=resolve;}));
    const {unmount}=render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:/Start listening/}));
    unmount();
    await act(async()=>{allow({getTracks:()=>[track],getAudioTracks:()=>[track],getVideoTracks:()=>[]});});
    expect(track.stop).toHaveBeenCalled();
    expect(contexts).toHaveLength(0);
  });

  test("releases the voice-sample microphone immediately on leaving the mode",async()=>{
    jest.useFakeTimers();
    try{
      const {track,contexts}=installFakeAudio();
      const {unmount}=render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
      await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Record 6 s"}));});
      expect(contexts).toHaveLength(1);
      unmount();
      expect(track.stop).toHaveBeenCalled();
      expect(contexts[0].close).toHaveBeenCalledTimes(1);
      await act(async()=>{jest.advanceTimersByTime(1000);});
    }finally{jest.useRealTimers();}
  });

  test("closes the audio context when graph construction fails",async()=>{
    const {track,contexts}=installFakeAudio();
    window.AudioContext.prototype.createMediaStreamSource=()=>{throw new Error("Audio device was lost");};
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={jest.fn()} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    expect(screen.getByRole("alert")).toHaveTextContent("Audio device was lost");
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
    expect(track.stop).toHaveBeenCalled();
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

  test("transcribes during a brief pause and answers only after the complete question",async()=>{
    const {feed,contexts,processors}=installFakeAudio();
    const transcripts=["Tell me about a project", "you led recently."];
    global.fetch=jest.fn().mockImplementation(async()=>({ok:true,status:200,json:async()=>({text:transcripts.shift()})}));
    const request=jest.fn().mockResolvedValue(reply("Tell me about a project you led recently.",["I led the checkout redesign at [company].","At [company] I owned a migration; sequencing was the key.","Happy to. Which part matters most to you, technical or people?"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.change(screen.getByLabelText("Conversation language"),{target:{value:"en"}});
    fireEvent.change(screen.getByLabelText("About you (recommended)"),{target:{value:"Frontend engineer applying to Acme."}});
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    expect(await screen.findByRole("button",{name:/Stop listening/})).toBeInTheDocument();

    expect(contexts[0].options).toEqual({latencyHint:"interactive"});
    expect(processors[0].bufferSize).toBe(1024);
    // Decoding starts during a 400 ms pause, before the speaker's turn ends.
    await feed(join([silence(300),tone(1400),silence(400)]));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByText(/Waiting for the speaker to finish/)).toBeInTheDocument();

    // A one-second thinking pause stays in the same question.
    await feed(join([silence(550),tone(800),silence(1000)]));
    expect(request).not.toHaveBeenCalled();
    await feed(silence(250));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(2));
    const body=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.audio).toMatch(/^data:audio\/wav;base64,/);
    expect(body.language).toBe("en");
    expect(body.prompt).toMatch(/^Job interview/);
    expect(body.prompt).toContain("Acme");
    expect(await screen.findByText("I led the checkout redesign at [company].")).toBeInTheDocument();
    expect(screen.getByText("Tell me about a project you led recently.",{selector:"span"})).toBeInTheDocument();
    expect(screen.getByText("Interviewer")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][5]).toEqual(expect.objectContaining({mode:"meeting",outputLanguage:"auto"}));
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

  test.each(["","th"])("keeps short Thai speech and replies in Thai with language hint %s",async language=>{
    const {feed}=installFakeAudio();
    global.fetch=jest.fn().mockResolvedValue({ok:true,status:200,json:async()=>({text:"ทำไม"})});
    const request=jest.fn().mockResolvedValue(reply("ทำไม",["เพราะฉันอยากเรียนรู้ค่ะ","ฉันอยากพัฒนาทักษะของตัวเองค่ะ","ฉันสนใจงานนี้ค่ะ ขอรายละเอียดเพิ่มได้ไหมคะ"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    if(language)fireEvent.change(screen.getByLabelText("Conversation language"),{target:{value:language}});
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    await feed(join([tone(1200),silence(1300)]));
    expect(await screen.findByText("เพราะฉันอยากเรียนรู้ค่ะ")).toBeInTheDocument();
    const body=JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.language).toBe(language||undefined);
    expect(request.mock.calls[0][0]).toContain("Thai speech must receive natural Thai replies");
    expect(request.mock.calls[0][1]).toContain('0: "ทำไม"');
    expect(request.mock.calls[0][2]).toBe(1400);
    expect(request.mock.calls[0][5].outputLanguage).toBe("auto");
  });

  test("a new question supersedes a slow answer without cancelling transcription or showing a stale answer",async()=>{
    const {feed}=installFakeAudio();
    const transcripts=["First question about my experience.","Second question about my availability."];
    global.fetch=jest.fn().mockImplementation(async()=>({ok:true,status:200,json:async()=>({text:transcripts.shift()})}));
    let finishOld;
    const request=jest.fn().mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;})).mockResolvedValue(JSON.stringify({lines:[{index:0,speaker:"other"},{index:1,speaker:"other"}],needsReply:true,heard:"Second question about my availability.",options:["Latest one","Latest two","Latest three"]}));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    await feed(join([tone(1200),silence(1300)]));
    expect(request).toHaveBeenCalledTimes(1);
    await feed(join([tone(1200),silence(1300)]));
    expect(await screen.findByText("Latest one")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][5].signal.aborted).toBe(true);
    expect(global.fetch.mock.calls.every(([,options])=>!options.signal.aborted)).toBe(true);
    expect(request.mock.calls[1][1]).toContain("Second question about my availability.");
    await act(async()=>{finishOld(reply("First question about my experience.",["Stale one","Stale two","Stale three"]));});
    expect(screen.queryByText("Stale one")).not.toBeInTheDocument();
    expect(screen.getByText("Latest one")).toBeInTheDocument();
  });

  test("an older transcription finishing late cannot replace the latest answer",async()=>{
    const {feed}=installFakeAudio();
    let finishOld;
    global.fetch=jest.fn().mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;})).mockResolvedValue({ok:true,status:200,json:async()=>({text:"Newest question about my availability."})});
    const request=jest.fn().mockResolvedValueOnce(reply("Newest question about my availability.",["Current answer","Current two","Current three"])).mockResolvedValueOnce(reply("Older question about my experience.",["Old answer","Old two","Old three"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    await feed(join([tone(1200),silence(1300)]));
    await feed(join([tone(1200),silence(1300)]));
    expect(await screen.findByText("Current answer")).toBeInTheDocument();
    await act(async()=>{finishOld({ok:true,status:200,json:async()=>({text:"Older question about my experience."})});});
    expect(request).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Current answer")).toBeInTheDocument();
    expect(screen.queryByText("Old answer")).not.toBeInTheDocument();
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

  test("a restarted session is not blocked by the previous session's unfinished transcription queue",async()=>{
    const {feed}=installFakeAudio();
    const oldRequests=[];
    global.fetch=jest.fn().mockImplementation((url,{signal})=>{
      if(oldRequests.length<2)return new Promise(resolve=>oldRequests.push({signal,resolve}));
      return Promise.resolve({ok:true,status:200,json:async()=>({text:"A fresh question after restarting."})});
    });
    const request=jest.fn().mockResolvedValue(reply("A fresh question after restarting.",["New answer one","New answer two","New answer three"]));
    render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    for(let index=0;index<3;index+=1)await feed(join([tone(1200),silence(2400)]));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Stop listening/}));});
    await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
    expect(oldRequests.every(item=>item.signal.aborted)).toBe(true);
    await feed(join([tone(1200),silence(2400)]));
    expect(await screen.findByText("New answer one")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    await act(async()=>{for(const item of oldRequests)item.resolve({ok:true,status:200,json:async()=>({text:"Old question"})});});
    expect(screen.queryByText("Old question")).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  });

  test("an answer failure does not discard questions that arrived during its retry",async()=>{
    jest.useFakeTimers();
    try{
      const {feed}=installFakeAudio();
      let transcript=0;
      global.fetch=jest.fn().mockImplementation(async()=>({ok:true,status:200,json:async()=>({text:++transcript===1?"First interview question.":"Second interview question."})}));
      const request=jest.fn().mockRejectedValueOnce(new Error("Try again")).mockRejectedValueOnce(new Error("Still unavailable")).mockResolvedValue(reply("Second interview question.",["Later answer one","Later answer two","Later answer three"]));
      render(<MeetingAssistMode user={{email:"a@b.c"}} request={request} save={jest.fn()} parseJson={JSON.parse} ensureAI={jest.fn()} ui={ui}/>);
      fireEvent.click(screen.getByRole("checkbox"));
      await act(async()=>{fireEvent.click(screen.getByRole("button",{name:/Start listening/}));});
      await feed(join([tone(1200),silence(2400)]));
      expect(request).toHaveBeenCalledTimes(1);
      await feed(join([tone(1200),silence(2400)]));
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[0][5].signal.aborted).toBe(true);
      await act(async()=>{jest.advanceTimersByTime(2600);});
      expect(await screen.findByText("Later answer one")).toBeInTheDocument();
      expect(request).toHaveBeenCalledTimes(3);
    }finally{jest.useRealTimers();}
  });
});
