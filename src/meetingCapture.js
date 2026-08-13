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
    recommendedMode:firefoxLike||mobile?"microphone":"shared",
  };
};

// Browsers ignore capture hints they do not support. Chromium uses these to
// expose the most useful tab, window, and system-audio choices in its picker.
export const MEETING_DISPLAY_OPTIONS={
  video:{displaySurface:"browser"},
  audio:{suppressLocalAudioPlayback:false},
  preferCurrentTab:false,
  selfBrowserSurface:"exclude",
  systemAudio:"include",
  surfaceSwitching:"include",
  monitorTypeSurfaces:"include",
  windowAudio:"system",
};

// Disabling speech cleanup makes a laptop microphone more likely to retain
// meeting audio playing through nearby speakers. This is a compatibility
// fallback, not direct system-audio capture.
export const MEETING_MICROPHONE_OPTIONS={
  video:false,
  audio:{
    channelCount:1,
    echoCancellation:false,
    noiseSuppression:false,
    autoGainControl:true,
  },
};

// In direct shared-audio mode, this second microphone track captures the
// user's own voice. Echo cleanup is intentionally enabled here because the
// remote participants already arrive through the shared meeting track.
export const MEETING_SELF_MICROPHONE_OPTIONS={
  video:false,
  audio:{
    channelCount:1,
    echoCancellation:true,
    noiseSuppression:true,
    autoGainControl:true,
  },
};

export const mixMeetingAudio=(sharedStream,microphoneStream,AudioContextClass)=>{
  const Context=AudioContextClass||(typeof window!=="undefined"?(window.AudioContext||window.webkitAudioContext):null);
  if(!Context)throw new Error("This browser cannot combine meeting audio with microphone audio.");
  if(!sharedStream?.getAudioTracks?.().length)throw new Error("The shared meeting source has no audio track.");
  if(!microphoneStream?.getAudioTracks?.().length)throw new Error("The microphone has no audio track.");

  const audioContext=new Context();
  const destination=audioContext.createMediaStreamDestination();
  const sharedSource=audioContext.createMediaStreamSource(new MediaStream(sharedStream.getAudioTracks()));
  const microphoneSource=audioContext.createMediaStreamSource(new MediaStream(microphoneStream.getAudioTracks()));
  sharedSource.connect(destination);
  microphoneSource.connect(destination);
  return{stream:destination.stream,audioContext,sources:[sharedSource,microphoneSource]};
};
