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
