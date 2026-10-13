/* global globalThis */
import { pipeline } from "@huggingface/transformers";
jest.mock("@huggingface/transformers",()=>({env:{},pipeline:jest.fn()}));

test("transcribes multilingual speech, serializes inference, and skips cancelled work",async()=>{
  const originalHandler=globalThis.onmessage;
  const originalPost=globalThis.postMessage;
  const calls=[];
  const inference=jest.fn(()=>new Promise((resolve,reject)=>calls.push({resolve,reject})));
  pipeline.mockResolvedValue(inference);
  globalThis.postMessage=jest.fn();
  try{
    require("./whisper.worker");
    const first=globalThis.onmessage({data:{id:1,type:"transcribe",audio:new Float32Array(20)}});
    const second=globalThis.onmessage({data:{id:2,type:"transcribe",audio:new Float32Array(20),language:"th"}});
    for(let i=0;i<8;i+=1)await Promise.resolve();
    expect(inference).toHaveBeenCalledTimes(1);
    expect(pipeline).toHaveBeenCalledWith("automatic-speech-recognition","Xenova/whisper-tiny",expect.objectContaining({dtype:"fp32"}));
    expect(inference.mock.calls[0][1]).toEqual({task:"transcribe"});
    calls[0].reject(new Error("Bad chunk"));
    await first;
    for(let i=0;i<8;i+=1)await Promise.resolve();
    expect(inference).toHaveBeenCalledTimes(2);
    expect(inference.mock.calls[1][1]).toEqual({task:"transcribe",language:"th"});
    calls[1].resolve({text:"ทำไม"});await second;
    expect(globalThis.postMessage).toHaveBeenCalledWith({id:1,type:"error",error:"Bad chunk"});
    expect(globalThis.postMessage).toHaveBeenCalledWith({id:2,type:"result",text:"ทำไม"});
    const third=globalThis.onmessage({data:{id:3,type:"transcribe",audio:new Float32Array(20)}});
    const fourth=globalThis.onmessage({data:{id:4,type:"transcribe",audio:new Float32Array(20)}});
    for(let i=0;i<8;i+=1)await Promise.resolve();
    globalThis.onmessage({data:{id:3,type:"cancel"}});
    globalThis.onmessage({data:{id:4,type:"cancel"}});
    calls[2].resolve({text:"Outdated result"});await third;await fourth;
    expect(inference).toHaveBeenCalledTimes(3);
    expect(globalThis.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({id:3}));
    expect(globalThis.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({id:4}));
  }finally{globalThis.onmessage=originalHandler;globalThis.postMessage=originalPost;}
});
