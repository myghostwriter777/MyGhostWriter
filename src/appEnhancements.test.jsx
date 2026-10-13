import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TextDecoder, TextEncoder } from "util";
import { AppShell, callClaude, callStudioAI, ImageInput } from "./App";

jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));

const originalFetch=global.fetch;
const originalEncoder=global.TextEncoder;
const freeUser={email:"enhancements@example.test",name:"Feature Tester",plan:"free"};
const proUser={...freeUser,plan:"pro"};
const response=data=>({ok:true,status:200,json:async()=>data});
const requestsTo=path=>global.fetch.mock.calls.filter(([url])=>url===path).map(([,options])=>JSON.parse(options.body));
const attachedText=file=>new TextDecoder().decode(Uint8Array.from(atob(file.dataUrl.split(",")[1]),character=>character.charCodeAt(0)));
let claudeText;
let studioResults;

function Shell({initialMode="writing",user=freeUser}){
  const [mode,setMode]=useState(initialMode);
  return <AppShell user={user} activeMode={mode} setActiveMode={setMode} onSignOut={jest.fn()} onUpdateUser={jest.fn()} onUpgrade={jest.fn()} onChangePlan={jest.fn()} onCancelPlan={jest.fn()} theme="dark" onToggleTheme={jest.fn()} starEffect={false} onToggleStarEffect={jest.fn()}/>;
}

beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();
  global.TextEncoder=TextEncoder;
  jest.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null);
  claudeText="A complete generated answer.";studioResults=[];
  global.fetch=jest.fn(async url=>{
    if(url==="/api/claude")return response({content:[{type:"text",text:claudeText}],stop_reason:"end_turn"});
    if(url==="/api/openai")return response(studioResults.shift()||{output_text:"A complete studio answer."});
    return response({items:[]});
  });
});
afterEach(()=>{jest.restoreAllMocks();global.fetch=originalFetch;global.TextEncoder=originalEncoder;});

test("a free user can research a general question, inspect sources, and ask a researched follow-up",async()=>{
  const sourceUrl="https://example.org/battery-study";
  const report="Conclusion: replacing the battery can extend a laptop's useful life.";
  studioResults=[
    {output_text:report,sources:[{title:"Battery study",url:sourceUrl}]},
    {output_text:"The study reports that repair can reduce material waste. https://example.org/repair-evidence"},
  ];
  render(<Shell/>);
  fireEvent.click(screen.getByRole("button",{name:"Deep Research",exact:true}));
  const question=screen.getByPlaceholderText(/How effective are four-day work weeks/);
  expect(question).toBeVisible();
  fireEvent.change(question,{target:{value:"When should I replace a laptop battery instead of buying a new laptop?"}});
  fireEvent.change(screen.getByPlaceholderText(/Location, dates, budget/),{target:{value:"Compare repair cost and environmental impact."}});
  fireEvent.click(screen.getByRole("button",{name:"Start Deep Research"}));

  const source=await screen.findByRole("link",{name:/Battery study/});
  expect(source).toHaveAttribute("href",sourceUrl);
  const initial=requestsTo("/api/openai")[0];
  expect(initial).toMatchObject({mode:"deep-research",use_search:true,search_depth:6,user_id:freeUser.email});
  expect(initial.system).toContain("research analyst for any topic");
  expect(initial.system).toContain("do not force a school essay format");
  expect(initial.user).toContain("repair cost and environmental impact");
  const saved=JSON.parse(localStorage.getItem(`gwm2_${freeUser.email}_research`));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({mode:"research",input:expect.stringContaining("laptop battery"),output:expect.stringContaining(report)});
  expect(saved[0].output).toContain(`Source trail\n1. Battery study: ${sourceUrl}`);

  fireEvent.change(screen.getByRole("textbox",{name:"Follow-up question"}),{target:{value:"What evidence supports the environmental benefit?"}});
  fireEvent.click(screen.getByRole("button",{name:"Send",exact:true}));
  expect(await screen.findByText(/The study reports that repair can reduce material waste/)).toBeVisible();
  const followUp=requestsTo("/api/openai")[1];
  expect(followUp).toMatchObject({mode:"deep-research",use_search:true,search_depth:4});
  expect(followUp.files).toHaveLength(1);
  expect(followUp.files[0]).toMatchObject({name:"research-report.txt",type:"text/plain"});
  expect(attachedText(followUp.files[0])).toContain(report);
  expect(attachedText(followUp.files[0])).toContain(`Source URLs:\nBattery study: ${sourceUrl}`);
  expect(followUp.system).not.toContain(report);
  expect(followUp.user).toContain("What evidence supports the environmental benefit?");
  expect(requestsTo("/api/claude")).toHaveLength(0);
});

test("a long research follow-up keeps the full UTF-8 report and latest question outside the system prompt",async()=>{
  const sourceUrl="https://example.org/full-study";
  const tail="ท้ายรายงาน: ผลการศึกษายังมีข้อจำกัดและต้องทบทวนหลักฐานเพิ่มเติม";
  const report="รายงานการวิจัยฉบับเต็ม\n\n"+"Evidence supports careful comparisons across the studies. ".repeat(420)+`\n\n${tail}\n\nSource trail\n${sourceUrl}`;
  const question="Compare the evidence. ".repeat(500)+"ข้อสรุปท้ายรายงานมีข้อจำกัดอะไรบ้าง";
  expect(report.length).toBeGreaterThan(18000);
  expect(question.length).toBeGreaterThan(8000);
  studioResults=[
    {output_text:report,sources:[{title:"งานวิจัยฉบับเต็ม",url:sourceUrl}]},
    {output_text:"ข้อจำกัดคือหลักฐานในแต่ละการศึกษายังแตกต่างกัน"},
  ];
  render(<Shell initialMode="research"/>);
  fireEvent.change(screen.getByPlaceholderText(/How effective are four-day work weeks/),{target:{value:"Compare all of the evidence in detail."}});
  fireEvent.click(screen.getByRole("button",{name:"Start Deep Research"}));
  await screen.findByRole("link",{name:/งานวิจัยฉบับเต็ม/});
  fireEvent.change(screen.getByRole("textbox",{name:"Follow-up question"}),{target:{value:question}});
  fireEvent.click(screen.getByRole("button",{name:"Send",exact:true}));
  expect(await screen.findByText("ข้อจำกัดคือหลักฐานในแต่ละการศึกษายังแตกต่างกัน")).toBeVisible();

  const followUp=requestsTo("/api/openai")[1];
  expect(followUp.system.length).toBeLessThan(12000);
  expect(followUp.system).not.toContain(tail);
  expect(followUp.files).toHaveLength(1);
  expect(followUp.files[0]).toMatchObject({name:"research-report.txt",type:"text/plain",dataUrl:expect.stringMatching(/^data:text\/plain;base64,/)});
  expect(attachedText(followUp.files[0])).toBe(report+`\n\nSource URLs:\nงานวิจัยฉบับเต็ม: ${sourceUrl}`);
  expect(followUp.user).toContain("Current question:\n"+question);
  expect(followUp.user.endsWith(question)).toBe(true);
});

test("a failed follow-up preserves the next draft typed while waiting and removes the failed question from history",async()=>{
  studioResults=[{output_text:"Repair is useful when replacement parts are available."}];
  const handleFetch=global.fetch.getMockImplementation();
  let researchCalls=0;
  let rejectFollowUp;
  global.fetch.mockImplementation((url,options)=>{
    if(url==="/api/openai"&&++researchCalls===2)return new Promise((resolve,reject)=>{rejectFollowUp=reject;});
    return handleFetch(url,options);
  });
  render(<Shell initialMode="research"/>);
  fireEvent.change(screen.getByPlaceholderText(/How effective are four-day work weeks/),{target:{value:"When should I repair a laptop?"}});
  fireEvent.click(screen.getByRole("button",{name:"Start Deep Research"}));
  const input=await screen.findByRole("textbox",{name:"Follow-up question"});
  const failedQuestion="Which brands sell replacement batteries?";
  const nextDraft="How should I compare warranty coverage?";
  fireEvent.change(input,{target:{value:failedQuestion}});
  fireEvent.click(screen.getByRole("button",{name:"Send",exact:true}));
  await waitFor(()=>expect(rejectFollowUp).toBeDefined());
  fireEvent.change(input,{target:{value:nextDraft}});
  await act(async()=>{rejectFollowUp(new Error("Research connection lost"));});

  expect(await screen.findByText("Research connection lost")).toBeVisible();
  expect(input).toHaveValue(nextDraft);
  expect(screen.queryByText(failedQuestion)).not.toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Send",exact:true})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:"Send",exact:true}));
  expect(await screen.findByText("A complete studio answer.")).toBeVisible();
  const retry=requestsTo("/api/openai")[2];
  expect(retry.user).toContain(nextDraft);
  expect(retry.user).not.toContain(failedQuestion);
});

test("the Settings language selection applies immediately to both AI routes without saving the profile",async()=>{
  localStorage.setItem("gwm_lang","en");
  render(<Shell/>);
  fireEvent.click(screen.getByRole("button",{name:"Open settings"}));
  fireEvent.change(screen.getByRole("combobox",{name:"AI output language"}),{target:{value:"th"}});
  expect(localStorage.getItem("gwm_lang")).toBe("th");
  fireEvent.click(screen.getByRole("button",{name:"Back to writing tools"}));

  await Promise.all([
    callClaude("Write a useful answer.","Explain this idea."),
    callStudioAI("Write a useful report.","Explain this idea.",1200,[],freeUser.email,{mode:"deep-research"}),
  ]);
  for(const request of [...requestsTo("/api/claude"),...requestsTo("/api/openai")]){
    expect(request.system).toContain("Write all user-facing prose in Thai.");
    expect(request.system).not.toContain("Write all user-facing prose in English.");
    expect(request.system).toContain("Keep required JSON property names and machine-readable enum values exactly as specified");
  }
});

test("Meeting's automatic language override takes precedence over an English output preference",async()=>{
  localStorage.setItem("gwm_lang","en");
  await callStudioAI("Prepare three spoken replies.","ทำไมคุณถึงสนใจงานนี้",1400,[],freeUser.email,{mode:"meeting",outputLanguage:"auto"});
  const request=requestsTo("/api/openai")[0];
  expect(request.mode).toBe("meeting");
  expect(request.user).toBe("ทำไมคุณถึงสนใจงานนี้");
  expect(request.system).toContain("For Thai speech or text, reply in Thai");
  expect(request.system).toContain("latest spoken utterance");
  expect(request.system).not.toContain("Write all user-facing prose in English.");
});

test("image OCR preserves exact source text despite a different output-language preference",async()=>{
  localStorage.setItem("gwm_lang","th");
  claudeText="Keep This English Quote exactly: 2 * 3 = 6.";
  const extracted=jest.fn();
  function ImageHarness(){
    const [image,setImage]=useState(null);
    return <ImageInput imageData={image} onImage={setImage} onClear={()=>setImage(null)} onExtract={extracted}/>;
  }
  const {container}=render(<ImageHarness/>);
  // The native upload input is hidden behind the image attachment button.
  fireEvent.change(container.querySelector('input[type="file"]'),{target:{files:[new File(["pixels"],"source.png",{type:"image/png"})]}}); // eslint-disable-line testing-library/no-container, testing-library/no-node-access
  await waitFor(()=>expect(extracted).toHaveBeenCalledWith(claudeText));
  const request=requestsTo("/api/claude")[0];
  expect(request.system).toContain("Transcribe source text exactly in its original language. Do not translate it.");
  expect(request.system).not.toContain("OUTPUT LANGUAGE:");
  expect(request.system).not.toContain("Write all user-facing prose in Thai.");
  expect(request.system).not.toContain("CEFR WRITING LEVEL:");
  expect(request.messages[0].content[0]).toMatchObject({type:"image",source:{media_type:"image/png",data:expect.any(String)}});
});

test("Essay displays and saves plain text while preserving meaningful hash and arithmetic symbols",async()=>{
  claudeText="# **Community Gardens**\n\n## **Shared Benefits**\n\n**Gardens support neighbours.** C# is a name; 2 * 3 = 6.\n\n* Fresh food";
  const expected="Community Gardens\n\nShared Benefits\n\nGardens support neighbours. C# is a name; 2 * 3 = 6.\n\n• Fresh food";
  render(<Shell initialMode="essay" user={proUser}/>);
  fireEvent.change(screen.getByPlaceholderText(/The impact of social media/),{target:{value:"Benefits of a community garden"}});
  fireEvent.click(screen.getByRole("button",{name:"Generate Essay"}));
  expect(await screen.findByText(expected,{normalizer:value=>value})).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Edit result"}));
  expect(screen.getByRole("textbox",{name:"Edit Argumentative essay"})).toHaveValue(expected);
  const saved=JSON.parse(localStorage.getItem(`gwm2_${proUser.email}_essay`));
  expect(saved).toHaveLength(1);
  expect(saved[0].output).toBe(expected);
  expect(requestsTo("/api/history")[0].item.output).toBe(expected);
});

test("research and lecture history remain visible and filterable when sync is offline",async()=>{
  for(const item of [
    {id:"research-saved",mode:"research",title:"Saved battery research",output:"Repair evidence: https://example.org/battery-study"},
    {id:"lecture-saved",mode:"lecture",title:"Saved biology lecture",output:"LECTURE TRANSCRIPT\nLecturer: Mitosis produces two daughter cells."},
  ])localStorage.setItem(`gwm2_${freeUser.email}_${item.mode}`,JSON.stringify([{...item,ts:"2026-10-13T08:00:00.000Z"}]));
  global.fetch.mockRejectedValue(new Error("offline"));
  render(<Shell initialMode="history"/>);
  expect(await screen.findByText("Saved battery research")).toBeVisible();
  expect(screen.getByText("Saved biology lecture")).toBeVisible();
  expect(await screen.findByText(/Could not reach the sync server/)).toBeVisible();
  // History filters precede the separate tool-navigation buttons of the same name.
  fireEvent.click(screen.getAllByRole("button",{name:"Deep Research",exact:true})[0]);
  expect(screen.getByText("Saved battery research")).toBeVisible();
  expect(screen.queryByText("Saved biology lecture")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button",{name:"Lecture",exact:true})[0]);
  expect(screen.getByText("Saved biology lecture")).toBeVisible();
  expect(screen.queryByText("Saved battery research")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Details",exact:true}));
  expect(within(screen.getByRole("dialog",{name:"History details"})).getByText(/Mitosis produces two daughter cells/)).toBeVisible();
});
