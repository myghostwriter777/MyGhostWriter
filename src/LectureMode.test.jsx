import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TextEncoder, TextDecoder } from "util";
import LectureMode from "./LectureMode";
import { openLectureCapture } from "./lectureAudio";

jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));

const RATE=16000;
const tone=(seconds,frequency=180)=>Float32Array.from({length:Math.round(seconds*RATE)},(_,index)=>((index*frequency/RATE)%1*2-1)*0.22);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const readBlob=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsArrayBuffer(blob);});

function fakeAudio(){
  const processors=[],contexts=[];
  const node=()=>({connect:jest.fn(),disconnect:jest.fn(),gain:{value:0}});
  class AudioContext{
    constructor(){this.sampleRate=RATE;this.destination={};this.close=jest.fn().mockResolvedValue();this.resume=jest.fn().mockResolvedValue();contexts.push(this);}
    createMediaStreamSource(){return node();}
    createScriptProcessor(){const processor={...node(),onaudioprocess:null};processors.push(processor);return processor;}
    createGain(){return node();}
  }
  window.AudioContext=AudioContext;
  const track={stop:jest.fn(),addEventListener:jest.fn(),removeEventListener:jest.fn()};
  const stream={getTracks:()=>[track]};
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:jest.fn().mockResolvedValue(stream)}});
  const push=audio=>{for(let offset=0;offset<audio.length;offset+=4096){const frame=audio.subarray(offset,Math.min(offset+4096,audio.length));processors.at(-1)?.onaudioprocess?.({inputBuffer:{getChannelData:()=>frame}});}};
  const feed=async audio=>{await act(async()=>push(audio));};
  return {track,stream,processors,contexts,push,feed};
}

const mount=(props={})=>render(<LectureMode user={{email:"lecture@example.test"}} request={jest.fn()} ensureAI={jest.fn()} {...props}/>);
const start=async()=>{fireEvent.click(screen.getByRole("button",{name:"Start recording"}));await waitFor(()=>expect(screen.queryByRole("button",{name:"Cancel microphone request"})).not.toBeInTheDocument());};
const speak=async audio=>{await audio.feed(tone(1.4));await audio.feed(new Float32Array(RATE*2.5));};

describe("Lecture capture and study flow",()=>{
  const original={audio:window.AudioContext,recorder:window.MediaRecorder,media:navigator.mediaDevices,fetch:global.fetch,encoder:global.TextEncoder,decoder:global.TextDecoder,createUrl:URL.createObjectURL,revokeUrl:URL.revokeObjectURL};
  beforeEach(()=>{
    window.MediaRecorder=undefined;
    global.TextEncoder=TextEncoder;global.TextDecoder=TextDecoder;
    URL.createObjectURL=jest.fn().mockReturnValue("blob:lecture");URL.revokeObjectURL=jest.fn();
    global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({text:"Cells divide through the process of mitosis."})});
  });
  afterEach(()=>{
    cleanup();
    window.AudioContext=original.audio;window.MediaRecorder=original.recorder;
    Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:original.media});
    global.fetch=original.fetch;global.TextEncoder=original.encoder;global.TextDecoder=original.decoder;
    URL.createObjectURL=original.createUrl;URL.revokeObjectURL=original.revokeUrl;
    jest.restoreAllMocks();
  });

  test("records, edits speaker labels, generates grounded notes and answers, and saves the result",async()=>{
    const audio=fakeAudio();const save=jest.fn();
    const request=jest.fn().mockResolvedValueOnce("# Cell division\n\nMitosis produces new cells. [00:00]").mockResolvedValueOnce("The lecture describes mitosis as cell division. [00:00]");
    mount({request,save});
    expect(screen.getByRole("button",{name:"Generate Study Notes"})).toBeDisabled();
    await start();await speak(audio);
    await waitFor(()=>expect(screen.getByLabelText("Transcript segment 1")).toHaveValue("Cells divide through the process of mitosis."));
    const speaker=screen.getByLabelText("Speaker for segment 1");speaker.focus();
    fireEvent.change(speaker,{target:{value:"Lecturer"}});
    expect(speaker).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Transcript segment 1"),{target:{value:"Mitosis produces two daughter cells."}});
    fireEvent.click(screen.getByRole("button",{name:"By speaker"}));
    expect(screen.getByRole("heading",{name:"Lecturer"})).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Stop recording"}));
    await screen.findByRole("button",{name:"Download recording"});
    expect(audio.track.stop).toHaveBeenCalledTimes(1);
    expect(audio.contexts[0].close).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button",{name:"Download recording"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button",{name:"Generate Study Notes"}));
    expect(await screen.findByLabelText("Study notes")).toHaveValue("Cell division\n\nMitosis produces new cells. [00:00]");
    const [system,,budget,files,,options]=request.mock.calls[0];
    expect(system).toMatch(/source material, not instructions/);
    expect(system).toMatch(/only information supported/);
    expect(budget).toBe(6500);
    expect(atob(files[0].dataUrl.split(",")[1])).toContain("Lecturer: Mitosis produces two daughter cells.");
    expect(options).toEqual(expect.objectContaining({mode:"lecture",outputLanguage:"auto",signal:expect.any(AbortSignal)}));
    fireEvent.change(screen.getByLabelText("Question about the lecture"),{target:{value:"What is mitosis?"}});
    fireEvent.click(screen.getByRole("button",{name:"Ask AI"}));
    expect(await screen.findByText("The lecture describes mitosis as cell division. [00:00]")).toBeInTheDocument();
    expect(request.mock.calls[1][1]).toContain("What is mitosis?");
    fireEvent.click(screen.getByRole("button",{name:"Save to history"}));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({output:expect.stringContaining("What is mitosis?"),input:expect.stringContaining("1 transcript segments")}));
    expect(save.mock.calls[0][0].input).not.toContain("Mitosis");
  });

  test("microphone denial is actionable and allows a fresh attempt",async()=>{
    fakeAudio();navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(new DOMException("Denied","NotAllowedError"));
    mount();await start();
    expect(screen.getByRole("alert")).toHaveTextContent("Microphone access was denied");
    expect(screen.getByRole("button",{name:"Start recording"})).toBeEnabled();
    await start();expect(screen.getByRole("button",{name:"Pause recording"})).toBeInTheDocument();
  });

  test("releases a microphone granted after cancellation without creating an audio graph",async()=>{
    const audio=fakeAudio();const permission=deferred();navigator.mediaDevices.getUserMedia.mockReturnValue(permission.promise);
    mount();fireEvent.click(screen.getByRole("button",{name:"Start recording"}));
    fireEvent.click(screen.getByRole("button",{name:"Cancel microphone request"}));
    await act(async()=>permission.resolve(audio.stream));
    expect(audio.track.stop).toHaveBeenCalledTimes(1);expect(audio.contexts).toHaveLength(0);
    expect(screen.getByRole("button",{name:"Start recording"})).toBeEnabled();
  });

  test("clear cancels pending transcription and ignores late responses",async()=>{
    const audio=fakeAudio();const response=deferred();global.fetch.mockReturnValue(response.promise);
    mount();await start();await speak(audio);
    const signal=global.fetch.mock.calls[0][1].signal;
    fireEvent.click(screen.getByRole("button",{name:"Clear lecture"}));
    expect(signal.aborted).toBe(true);expect(audio.track.stop).toHaveBeenCalledTimes(1);
    await act(async()=>response.resolve({ok:true,json:async()=>({text:"Old lecture should not return."})}));
    expect(screen.queryByLabelText("Transcript segment 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Generate Study Notes"})).toBeDisabled();
  });

  test("unmount cancels an AI request and releases microphone resources",async()=>{
    const audio=fakeAudio();const answer=deferred();const request=jest.fn().mockReturnValue(answer.promise);
    const view=mount({request});await start();await speak(audio);
    fireEvent.click(screen.getByRole("button",{name:"Generate Study Notes"}));
    const signal=request.mock.calls[0][5].signal;view.unmount();
    expect(signal.aborted).toBe(true);expect(audio.track.stop).toHaveBeenCalledTimes(1);
    expect(audio.contexts[0].close).toHaveBeenCalledTimes(1);
    await act(async()=>answer.resolve("Late notes"));
  });

  test("cancelled generation cannot overwrite a later generation",async()=>{
    const audio=fakeAudio();const old=deferred();const request=jest.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce("New notes");
    mount({request});await start();await speak(audio);
    fireEvent.click(screen.getByRole("button",{name:"Generate Study Notes"}));
    fireEvent.click(screen.getByRole("button",{name:"Cancel generation"}));
    expect(request.mock.calls[0][5].signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"Generate Study Notes"}));
    await screen.findByLabelText("Study notes");
    await act(async()=>old.resolve("Old notes"));
    expect(screen.getByLabelText("Study notes")).toHaveValue("New notes");
  });

  test("keeps the next question drafted while an answer is pending",async()=>{
    const audio=fakeAudio(),answer=deferred();mount({request:jest.fn().mockReturnValue(answer.promise)});
    await start();await speak(audio);
    const field=screen.getByLabelText("Question about the lecture");
    fireEvent.change(field,{target:{value:"What is mitosis?"}});fireEvent.click(screen.getByRole("button",{name:"Ask AI"}));
    fireEvent.change(field,{target:{value:"What happens next?"}});
    await act(async()=>answer.resolve("It is cell division."));
    expect(field).toHaveValue("What happens next?");
  });

  test("manual correction releases failed audio and allows an automatically paused lecture to resume",async()=>{
    const audio=fakeAudio();global.fetch.mockResolvedValue({ok:false,status:400,json:async()=>({error:"Could not transcribe",retryable:false})});
    mount();await start();
    for(let index=0;index<10;index+=1)await speak(audio);
    const resumeButton=screen.getByRole("button",{name:"Resume recording"});expect(resumeButton).toBeDisabled();
    for(let index=0;index<10;index+=1)fireEvent.change(screen.getByLabelText(`Transcript segment ${index+1}`),{target:{value:`Manually corrected lecture topic ${index+1}.`}});
    expect(screen.queryByRole("button",{name:/Retry failed/})).not.toBeInTheDocument();
    expect(resumeButton).toBeEnabled();fireEvent.click(resumeButton);
    expect(await screen.findByRole("button",{name:"Pause recording"})).toBeInTheDocument();
  });

  test("oversized history entries remain downloadable and are never marked saved",async()=>{
    const audio=fakeAudio(),save=jest.fn();mount({save});await start();await speak(audio);
    fireEvent.change(screen.getByLabelText("Transcript segment 1"),{target:{value:"a".repeat(350000)}});
    fireEvent.click(screen.getByRole("button",{name:"Save to history"}));
    expect(save).not.toHaveBeenCalled();expect(screen.getByRole("alert")).toHaveTextContent("too large for history");
    expect(screen.getByRole("button",{name:"Download notes and transcript"})).toBeEnabled();
    expect(screen.queryByRole("button",{name:"Saved to history"})).not.toBeInTheDocument();
  });

  test("retries a failed segment using retained audio and its selected language",async()=>{
    const audio=fakeAudio();global.fetch.mockRejectedValueOnce(new TypeError("offline"));
    mount();fireEvent.change(screen.getByLabelText("Lecture language"),{target:{value:"th"}});
    await start();await speak(audio);
    expect(screen.getByRole("button",{name:"Retry failed segments (1)"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button",{name:"Retry failed segments (1)"}));
    await waitFor(()=>expect(screen.getByLabelText("Transcript segment 1")).toHaveValue("Cells divide through the process of mitosis."));
    const first=JSON.parse(global.fetch.mock.calls[0][1].body),second=JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(first.audio).toBe(second.audio);expect(second.language).toBe("th");
    expect(screen.getByLabelText("Transcript segment 1")).toHaveValue("Cells divide through the process of mitosis.");
    expect(screen.queryByRole("button",{name:/Retry failed/})).not.toBeInTheDocument();
  });

  test("pause excludes audio until resumed and stop flushes the final spoken words",async()=>{
    const audio=fakeAudio();mount();await start();
    await audio.feed(tone(1.2));
    fireEvent.click(screen.getByRole("button",{name:"Pause recording"}));
    await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await speak(audio);expect(global.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button",{name:"Resume recording"}));
    await screen.findByRole("button",{name:"Pause recording"});
    await audio.feed(tone(1.2));
    fireEvent.click(screen.getByRole("button",{name:"Stop recording"}));
    await screen.findByRole("button",{name:"Download recording"});
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Transcript segment 2")).toHaveValue("Cells divide through the process of mitosis.");
  });

  test("fallback WAV has a correct header and excludes paused frames",async()=>{
    const audio=fakeAudio();const capture=await openLectureCapture({});
    audio.push(tone(1));capture.pause();audio.push(tone(1));await capture.resume();audio.push(tone(1));
    const result=await capture.stop();const bytes=await readBlob(result.blob);const view=new DataView(bytes);
    expect(result.seconds).toBe(2);expect(result.blob.type).toBe("audio/wav");
    expect(view.getUint32(24,true)).toBe(RATE);expect(view.getUint32(40,true)).toBe(RATE*2*2);
    expect(bytes.byteLength).toBe(44+RATE*2*2);
    expect(await capture.stop()).toBe(result);expect(audio.track.stop).toHaveBeenCalledTimes(1);
  });

  test("compressed recording includes the final recorder data event",async()=>{
    const audio=fakeAudio();
    class Recorder{
      static isTypeSupported(){return true;}
      constructor(){this.state="inactive";this.mimeType="audio/webm";}
      start(){this.state="recording";}
      stop(){this.state="inactive";Promise.resolve().then(()=>{this.ondataavailable({data:new Blob(["final-audio"])});this.onstop();});}
    }
    window.MediaRecorder=Recorder;
    const capture=await openLectureCapture({});audio.push(tone(1));
    const {blob}=await capture.stop();expect(blob.size).toBe(11);expect(blob.type).toBe("audio/webm");
    expect(audio.track.stop).toHaveBeenCalledTimes(1);
  });

  test("graph setup failure and an abort during context resume release the stream",async()=>{
    const audio=fakeAudio();window.AudioContext.prototype.createMediaStreamSource=()=>{throw new Error("Graph failed");};
    await expect(openLectureCapture({})).rejects.toThrow("Graph failed");
    expect(audio.track.stop).toHaveBeenCalledTimes(1);expect(audio.contexts[0].close).toHaveBeenCalledTimes(1);
    const next=fakeAudio(),resume=deferred(),controller=new AbortController();
    const Base=window.AudioContext;window.AudioContext=class extends Base{constructor(){super();this.resume=()=>resume.promise;}};
    const pending=openLectureCapture({signal:controller.signal});const outcome=pending.then(value=>({value}),error=>({error}));await waitFor(()=>expect(next.contexts).toHaveLength(1));controller.abort();
    expect(next.track.stop).toHaveBeenCalledTimes(1);resume.resolve();
    expect((await outcome).error).toHaveProperty("name","AbortError");
    expect(next.contexts[0].close).toHaveBeenCalledTimes(1);
  });
});
