import { buildRemoteMeetingAudioStream, cleanMeetingTranscriptSegment, detectMeetingCaptureProfile, hasAudibleMeetingSpeech, isBrowserTabMeetingShare, isUsefulMeetingTranscript, MEETING_DISPLAY_OPTIONS } from "./meetingCapture";

describe("Meeting Assist browser compatibility",()=>{
  test("keeps Zen's Firefox engine out of remote-only capture",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0");
    expect(profile.firefoxLike).toBe(true);
    expect(profile.browserName).toBe("Zen / Firefox");
    expect(profile.recommendedMode).toBe("shared");
    expect(profile.remoteAudioOnlyAvailable).toBe(false);
  });

  test("keeps direct shared-audio capture available in Chromium",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36");
    expect(profile.firefoxLike).toBe(false);
    expect(profile.chromium).toBe(true);
    expect(profile.recommendedMode).toBe("shared");
    expect(profile.remoteAudioOnlyAvailable).toBe(true);
    expect(MEETING_DISPLAY_OPTIONS).toEqual({video:true,audio:true});
    expect(MEETING_DISPLAY_OPTIONS).not.toHaveProperty("systemAudio");
    expect(MEETING_DISPLAY_OPTIONS).not.toHaveProperty("windowAudio");
    expect(MEETING_DISPLAY_OPTIONS).not.toHaveProperty("monitorTypeSurfaces");
  });

  test("does not use the Android microphone for remote-only capture",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36");
    expect(profile.mobile).toBe(true);
    expect(profile.recommendedMode).toBe("shared");
    expect(profile.remoteAudioOnlyAvailable).toBe(false);
  });

  test("constructs transcription input only from shared meeting audio tracks",()=>{
    const meetingTrack={id:"remote-meeting-audio"};
    const microphoneTrack={id:"local-microphone"};
    const sharedStream={getAudioTracks:()=>[meetingTrack]};
    class FakeMediaStream{constructor(tracks){this.tracks=tracks;}}

    const result=buildRemoteMeetingAudioStream(sharedStream,FakeMediaStream);

    expect(result.tracks).toEqual([meetingTrack]);
    expect(result.tracks).not.toContain(microphoneTrack);
  });

  test("refuses to create a transcription stream when sharing has no audio",()=>{
    class FakeMediaStream{constructor(tracks){this.tracks=tracks;}}
    expect(buildRemoteMeetingAudioStream({getAudioTracks:()=>[]},FakeMediaStream)).toBeNull();
  });

  test("accepts only a browser-tab share with an audio track",()=>{
    const shared=surface=>({
      getVideoTracks:()=>[{getSettings:()=>({displaySurface:surface})}],
      getAudioTracks:()=>[{id:"audio"}],
    });
    expect(isBrowserTabMeetingShare(shared("browser"))).toBe(true);
    expect(isBrowserTabMeetingShare(shared("window"))).toBe(false);
    expect(isBrowserTabMeetingShare(shared("monitor"))).toBe(false);
    expect(isBrowserTabMeetingShare({...shared("browser"),getAudioTracks:()=>[]})).toBe(false);
  });

  test("removes repeated Whisper filler hallucinations before display",()=>{
    const dirty="Hello!\nMm-hmm.\nyou\nyou\nyou\nCould you send the revised plan by Friday?";
    expect(cleanMeetingTranscriptSegment(dirty)).toBe("Hello! Could you send the revised plan by Friday?");
    expect(cleanMeetingTranscriptSegment("you you you you")).toBe("");
    expect(isUsefulMeetingTranscript("you\nyou\nMm-hmm.")).toBe(false);
    expect(isUsefulMeetingTranscript("Could you send the revised plan by Friday?")).toBe(true);
  });

  test("skips silent audio before on-device transcription",()=>{
    expect(hasAudibleMeetingSpeech(new Float32Array(16000))).toBe(false);
    const speech=new Float32Array(16000);
    for(let index=0;index<speech.length;index+=1)speech[index]=Math.sin(index/8)*0.06;
    expect(hasAudibleMeetingSpeech(speech)).toBe(true);
  });
});
