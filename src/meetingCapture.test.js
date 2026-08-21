import { buildRemoteMeetingAudioStream, detectMeetingCaptureProfile, MEETING_DISPLAY_OPTIONS } from "./meetingCapture";

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
    expect(MEETING_DISPLAY_OPTIONS.systemAudio).toBe("include");
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
});
