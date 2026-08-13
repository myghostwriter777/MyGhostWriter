export const resampleAudioBufferToMono16k=audioBuffer=>{
  const targetRate=16000;
  const sourceRate=Number(audioBuffer?.sampleRate)||targetRate;
  const sourceLength=Number(audioBuffer?.length)||0;
  const channels=Math.max(1,Number(audioBuffer?.numberOfChannels)||1);
  if(!sourceLength)return new Float32Array();

  const outputLength=Math.max(1,Math.round(sourceLength*targetRate/sourceRate));
  const output=new Float32Array(outputLength);
  const channelData=Array.from({length:channels},(_,index)=>audioBuffer.getChannelData(index));

  for(let outputIndex=0;outputIndex<outputLength;outputIndex+=1){
    const sourcePosition=outputIndex*sourceRate/targetRate;
    const left=Math.min(sourceLength-1,Math.floor(sourcePosition));
    const right=Math.min(sourceLength-1,left+1);
    const mix=sourcePosition-left;
    let sample=0;
    for(const channel of channelData)sample+=channel[left]+(channel[right]-channel[left])*mix;
    output[outputIndex]=sample/channels;
  }
  return output;
};

export const audioBlobToMono16k=async blob=>{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)throw new Error("This browser cannot decode meeting audio for offline transcription.");
  const context=new Context();
  try{
    const decoded=await context.decodeAudioData(await blob.arrayBuffer());
    return resampleAudioBufferToMono16k(decoded);
  }finally{
    try{await context.close();}catch{}
  }
};

