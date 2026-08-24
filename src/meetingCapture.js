export const detectMeetingCaptureProfile=(userAgent)=>{
  const ua=String(userAgent??((typeof navigator!=="undefined"?navigator.userAgent:"")||""));
  const firefoxLike=/Firefox\//i.test(ua)||/FxiOS\//i.test(ua)||/\bZen\//i.test(ua);
  const mobile=/Android|iPhone|iPad|iPod/i.test(ua);
  const edge=/Edg\//i.test(ua);
  const chromium=edge||/Chrome\//i.test(ua)||/Chromium\//i.test(ua);
  return{
    firefoxLike,
    mobile,
    chromium,
    browserName:firefoxLike?"Zen / Firefox":edge?"Microsoft Edge":chromium?"Google Chrome / Chromium":"this browser",
    // Remote-only capture must never fall back to the device microphone,
    // because a microphone cannot reliably distinguish the user from voices
    // playing through nearby speakers.
    remoteAudioOnlyAvailable:chromium&&!mobile&&!firefoxLike,
    recommendedMode:"shared",
  };
};

// Keep this request deliberately platform-neutral. OS/vendor capture flags
// differ between Windows, macOS, Linux, ChromeOS, and browser versions and can
// make a valid meeting tab disappear from the picker. We request the standard
// display tracks, then enforce the safe source after selection in
// isBrowserTabMeetingShare: only a browser tab with its own audio is accepted.
export const MEETING_DISPLAY_OPTIONS={
  video:true,
  audio:true,
};

export const isBrowserTabMeetingShare=stream=>{
  const surface=stream?.getVideoTracks?.()[0]?.getSettings?.().displaySurface;
  return surface==="browser"&&Boolean(stream?.getAudioTracks?.().length);
};

const EMPTY_TRANSCRIPT_LINE=/^(?:you|mm[ -]?hmm+|hmm+|uh+h|uh[ -]?huh|um+|ah+|okay|ok|thank you|thanks for watching|subscribe|music|applause|silence|inaudible)[.!?,\s]*$/i;
const CONTENT_FILLERS=new Set(["you","uh","um","hmm","mmhmm","okay","ok","ah"]);

// Tiny Whisper models can hallucinate short filler words during silence and
// repeat them once per recording segment. Clean those tokens before they are
// displayed or sent to the reply model.
export const cleanMeetingTranscriptSegment=value=>{
  const lines=String(value||"")
    .replace(/[[(](?:music|applause|silence|inaudible|blank[_ ]audio)[\])]/gi,"\n")
    .split(/\r?\n/)
    .map(line=>line.trim())
    .filter(line=>line&&!EMPTY_TRANSCRIPT_LINE.test(line));
  return lines.join(" ")
    .replace(/\b(you|uh|um|hmm|mmhmm|okay|ok)\b(?:[\s,.!?;:–—-]+\1\b)+/gi," ")
    .replace(/\s+([,.!?;:])/g,"$1")
    .replace(/\s{2,}/g," ")
    .trim();
};

export const isUsefulMeetingTranscript=value=>{
  const cleaned=cleanMeetingTranscriptSegment(value);
  const words=cleaned.toLowerCase().match(/[\p{L}\p{N}']+/gu)||[];
  const contentWords=words.filter(word=>!CONTENT_FILLERS.has(word.replace(/'/g,"")));
  return cleaned.length>=10&&contentWords.length>=3;
};

export const hasAudibleMeetingSpeech=(audio,rmsThreshold=0.0045,peakThreshold=0.018)=>{
  if(!(audio instanceof Float32Array)||audio.length<800)return false;
  let sumSquares=0;let peak=0;
  for(const sample of audio){
    const magnitude=Math.abs(sample);
    sumSquares+=sample*sample;
    if(magnitude>peak)peak=magnitude;
  }
  return Math.sqrt(sumSquares/audio.length)>=rmsThreshold&&peak>=peakThreshold;
};

// Build the transcription stream from the audio tracks returned by
// getDisplayMedia only. Never call getUserMedia and never let a browser speech
// recognizer choose its own default input, because that default is normally the
// user's microphone rather than the shared meeting audio.
export const buildRemoteMeetingAudioStream=(sharedStream,MediaStreamClass=typeof MediaStream!=="undefined"?MediaStream:null)=>{
  const remoteTracks=sharedStream?.getAudioTracks?.()||[];
  if(!remoteTracks.length||typeof MediaStreamClass!=="function")return null;
  return new MediaStreamClass(remoteTracks);
};
