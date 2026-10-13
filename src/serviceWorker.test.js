/** @jest-environment node */
const fs=require("fs");
const path=require("path");
const vm=require("vm");

function worker(){
  const handlers={};
  const cache={addAll:jest.fn(async()=>{}),match:jest.fn(async()=>undefined),put:jest.fn(async()=>{})};
  const caches={open:jest.fn(async()=>cache),keys:jest.fn(async()=>["gwm-v2","gwm-v3","whisper-models"]),delete:jest.fn(async()=>true)};
  const fetch=jest.fn();
  const context={URL,Response:{error:()=>({offline:true})},caches,fetch,self:{location:{origin:"https://ghostwriterme.com"},addEventListener:(type,fn)=>{handlers[type]=fn;},skipWaiting:jest.fn(),clients:{claim:jest.fn()}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public/service-worker.js"),"utf8"),context);
  return{handlers,cache,caches,fetch};
}
function request(pathname,mode="cors"){
  return{request:{url:`https://ghostwriterme.com${pathname}`,method:"GET",mode},respondWith:jest.fn(),waitUntil:jest.fn()};
}

test("updates purge old app caches without deleting downloaded speech models",async()=>{
  const {handlers,caches}=worker();const event={waitUntil:jest.fn()};handlers.activate(event);await event.waitUntil.mock.calls[0][0];
  expect(caches.delete.mock.calls).toEqual([["gwm-v2"]]);
});
test.each(["/pdf.worker.min.mjs","/pptxgen.bundle.js","/manifest.json","/api/history"])("%s is fetched normally rather than kept indefinitely",pathname=>{
  const {handlers}=worker();const event=request(pathname);handlers.fetch(event);expect(event.respondWith).not.toHaveBeenCalled();
});
test("fingerprinted assets reuse the versioned cache",async()=>{
  const {handlers,cache,fetch}=worker();const cached={body:"javascript"};cache.match.mockResolvedValue(cached);
  const event=request("/static/js/main.a54bcdef.js");handlers.fetch(event);
  expect(await event.respondWith.mock.calls[0][0]).toBe(cached);expect(fetch).not.toHaveBeenCalled();
});
test("a server error never overwrites the last working offline shell",async()=>{
  const {handlers,cache,fetch}=worker();fetch.mockResolvedValue({ok:false,status:503});
  const event=request("/","navigate");handlers.fetch(event);await event.respondWith.mock.calls[0][0];
  expect(cache.put).not.toHaveBeenCalled();
});
test("navigation returns an explicit network error when no offline shell exists",async()=>{
  const {handlers,fetch}=worker();fetch.mockRejectedValue(new Error("offline"));const event=request("/","navigate");handlers.fetch(event);
  expect(await event.respondWith.mock.calls[0][0]).toEqual({offline:true});
});
