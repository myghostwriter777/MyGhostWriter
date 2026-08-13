import { detectMeetingCaptureProfile, MEETING_DISPLAY_OPTIONS, MEETING_MICROPHONE_OPTIONS, MEETING_SELF_MICROPHONE_OPTIONS, mixMeetingAudio } from "./meetingCapture";

describe("Meeting Assist browser compatibility",()=>{
  test("routes Zen's Firefox engine to microphone fallback",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0");
    expect(profile.firefoxLike).toBe(true);
    expect(profile.browserName).toBe("Zen / Firefox");
    expect(profile.recommendedMode).toBe("microphone");
  });

  test("keeps direct shared-audio capture available in Chromium",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36");
    expect(profile.firefoxLike).toBe(false);
    expect(profile.chromium).toBe(true);
    expect(profile.recommendedMode).toBe("shared");
    expect(MEETING_DISPLAY_OPTIONS.systemAudio).toBe("include");
  });

  test("routes the Android native/TWA experience to microphone recognition",()=>{
    const profile=detectMeetingCaptureProfile("Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36");
    expect(profile.mobile).toBe(true);
    expect(profile.recommendedMode).toBe("microphone");
  });

  test("microphone fallback keeps speaker audio processing disabled",()=>{
    expect(MEETING_MICROPHONE_OPTIONS.audio.echoCancellation).toBe(false);
    expect(MEETING_MICROPHONE_OPTIONS.audio.noiseSuppression).toBe(false);
  });

  test("direct capture uses echo cleanup for the user's separate microphone",()=>{
    expect(MEETING_SELF_MICROPHONE_OPTIONS.audio.echoCancellation).toBe(true);
    expect(MEETING_SELF_MICROPHONE_OPTIONS.audio.noiseSuppression).toBe(true);
  });

  test("mixes the shared meeting track and microphone into one recording stream",()=>{
    const OriginalMediaStream=global.MediaStream;
    global.MediaStream=class{constructor(tracks){this.tracks=tracks;}getAudioTracks(){return this.tracks;}};
    const sharedTrack={kind:"audio",id:"meeting"};
    const microphoneTrack={kind:"audio",id:"microphone"};
    const destinationTrack={kind:"audio",id:"mixed"};
    const connected=[];
    class MockAudioContext{
      createMediaStreamDestination(){return{stream:{getAudioTracks:()=>[destinationTrack]}};}
      createMediaStreamSource(stream){return{stream,connect:target=>connected.push(target)};}
    }
    const result=mixMeetingAudio(
      {getAudioTracks:()=>[sharedTrack]},
      {getAudioTracks:()=>[microphoneTrack]},
      MockAudioContext
    );
    expect(result.stream.getAudioTracks()).toEqual([destinationTrack]);
    expect(connected).toHaveLength(2);
    global.MediaStream=OriginalMediaStream;
  });
});
