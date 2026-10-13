import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppShell, MODES } from "./App";

jest.mock("./localWhisper",()=>({prepareLocalWhisper:jest.fn(),transcribeLocalAudio:jest.fn()}));
const originalFetch=global.fetch;
const user={email:"modes@example.test",name:"Mode Tester",plan:"student",allFeatures:true,isAdmin:true};
const props={user,theme:"dark",setActiveMode:jest.fn(),onChangePlan:jest.fn()};
beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();
  jest.spyOn(HTMLCanvasElement.prototype,"getContext").mockReturnValue(null);
  global.fetch=jest.fn(async()=>({ok:true,json:async()=>({items:[]})}));
});
afterEach(()=>{jest.restoreAllMocks();global.fetch=originalFetch;});

test("opening Settings and switching modes preserves unsaved writing",()=>{
  const {rerender}=render(<AppShell {...props} activeMode="writing"/>);
  const input=screen.getByPlaceholderText(/Add bullet points or short notes/);
  fireEvent.change(input,{target:{value:"My unsaved notes"}});
  fireEvent.click(screen.getByRole("button",{name:"Open settings"}));
  fireEvent.click(screen.getByRole("button",{name:"Back to writing tools"}));
  expect(screen.getByDisplayValue("My unsaved notes")).toBeVisible();
  expect(screen.getByDisplayValue("My unsaved notes")).toBe(input);
  rerender(<AppShell {...props} activeMode="email"/>);
  expect(input).not.toBeVisible();
  rerender(<AppShell {...props} activeMode="writing"/>);
  expect(screen.getByDisplayValue("My unsaved notes")).toBe(input);
});

test("Writing history appears offline and malformed stored mode history does not crash it",async()=>{
  localStorage.setItem(`gwm2_${user.email}_writing`,JSON.stringify([{id:"writing-1",mode:"writing",title:"Saved writing",output:"A complete sentence.",ts:new Date().toISOString()}]));
  localStorage.setItem(`gwm2_${user.email}_email`,JSON.stringify({invalid:true}));
  global.fetch.mockRejectedValue(new Error("offline"));
  render(<AppShell {...props} activeMode="history"/>);
  expect(await screen.findByText("Saved writing")).toBeInTheDocument();
  await waitFor(()=>expect(screen.getByText(/Could not reach the sync server/)).toBeInTheDocument());
});

test.each(MODES.filter(mode=>mode.id!=="history").map(mode=>[mode.id]))("%s mode mounts a working form",async id=>{
  const {container}=render(<AppShell {...props} activeMode={id}/>);
  await waitFor(()=>expect(screen.queryByText(/Loading (tool|Meeting Assist|Lecture)…/)).not.toBeInTheDocument());
  const mode=container.querySelector(".mode-stage");
  expect(mode.querySelector("input,textarea,button")).not.toBeNull();
  expect(mode.textContent).not.toMatch(/Something went wrong|is in final testing|could not open/);
});
