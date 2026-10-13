import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageInput } from "./App";

const originalFetch=global.fetch;
afterEach(()=>{global.fetch=originalFetch;});
test.each(["remove","unmount","reset"])("%s cancels OCR and prevents late text from replacing the current input",async action=>{
  let resolveRequest,signal;const extracted=jest.fn();
  global.fetch=jest.fn((_url,options)=>{signal=options.signal;return new Promise(resolve=>{resolveRequest=resolve;});});
  function Harness(){
    const [image,setImage]=useState(null);
    return <><button onClick={()=>setImage(null)}>Reset form</button><ImageInput imageData={image} onImage={setImage} onClear={()=>setImage(null)} onExtract={extracted}/></>;
  }
  const {container,unmount}=render(<Harness/>);
  fireEvent.change(container.querySelector('input[type="file"]'),{target:{files:[new File(["pixels"],"photo.png",{type:"image/png"})]}});
  await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
  if(action==="remove")fireEvent.click(screen.getByRole("button",{name:"Remove attached image"}));
  else if(action==="reset")fireEvent.click(screen.getByRole("button",{name:"Reset form"}));
  else unmount();
  expect(signal.aborted).toBe(true);
  await act(async()=>{resolveRequest({ok:true,json:async()=>({content:[{type:"text",text:"Stale OCR"}]})});});
  expect(extracted).not.toHaveBeenCalled();
});
