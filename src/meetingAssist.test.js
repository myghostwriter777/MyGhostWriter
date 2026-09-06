import { buildMeetingPrompt, buildTranscriptionHint, MEETING_LANGUAGES, meetingSessionAsText, MEETING_SITUATIONS, mergeUtteranceText, normalizeMeetingReply, speakerLabel } from "./meetingAssist";

describe("meeting assist prompts",()=>{
  test("asks the model to separate the user's voice from the interviewer in microphone mode",()=>{
    const {system,user}=buildMeetingPrompt({
      situation:"interview",source:"microphone",context:"Frontend developer applying to Acme",
      history:[{speaker:"other",text:"Welcome, thanks for joining."},{speaker:"you",text:"Happy to be here."}],
      newLines:[{text:"Can you walk me through a project you led?",voiceMatch:0.2},{text:"Sure, so last year",voiceMatch:0.88}],
    });
    expect(system).toMatch(/exactly three/);
    expect(system).toMatch(/"you" when the line is clearly the user speaking/);
    expect(system).toMatch(/square brackets/);
    expect(system).toMatch(/one complete speaker turn/);
    // Every turn from the other party gets options, so answers never silently stop.
    expect(system).toMatch(/Whenever such a line exists, set needsReply true/);
    expect(system).toMatch(/only when none of the new lines was spoken by the other party/);
    expect(user).toContain("[other] Welcome, thanks for joining.");
    expect(user).toContain('0: "Can you walk me through a project you led?" | voice hint: likely another speaker (0.20)');
    expect(user).toContain('1: "Sure, so last year" | voice hint: likely the user (0.88)');
    expect(user).toContain("Frontend developer applying to Acme");
  });

  test("labels every line as the remote party when audio comes from a shared tab",()=>{
    const {system,user}=buildMeetingPrompt({situation:"meeting",source:"tab",newLines:[{text:"Could you own the rollout plan?"}]});
    expect(system).toMatch(/Label every new line "other"/);
    expect(user).toContain("| remote participant");
    expect(MEETING_SITUATIONS.map(item=>item.id)).toEqual(["interview","meeting","class","customer","casual"]);
  });

  test("clips very long lines so the request stays small and fast",()=>{
    const {user}=buildMeetingPrompt({newLines:[{text:"word ".repeat(600)}],history:[{speaker:"other",text:"x".repeat(2000)}]});
    expect(user.length).toBeLessThan(2600);
    expect(user).toContain("…");
  });
});

describe("transcription hints",()=>{
  test("names the conversation type and proper nouns from the user's context",()=>{
    const hint=buildTranscriptionHint({situation:"interview",context:"I'm applying to Stripe as a Frontend Engineer. My last project was Nimbus at Grab."});
    expect(hint).toMatch(/^Job interview between the interviewer and the candidate\./);
    expect(hint).toContain("Stripe");
    expect(hint).toContain("Nimbus");
    expect(hint).toContain("Grab");
    expect(hint).not.toMatch(/\bI'm\b/);
    expect(hint.length).toBeLessThanOrEqual(360);
    expect(buildTranscriptionHint({situation:"customer"})).toBe("Customer call between the customer and the representative.");
  });

  test("offers auto-detect first in the language list",()=>{
    expect(MEETING_LANGUAGES[0]).toEqual({value:"",label:"Auto-detect"});
    expect(MEETING_LANGUAGES.map(item=>item.value)).toContain("en");
    expect(new Set(MEETING_LANGUAGES.map(item=>item.value)).size).toBe(MEETING_LANGUAGES.length);
  });

  test("joins transcribed chunks of one turn cleanly",()=>{
    expect(mergeUtteranceText(["Tell me about a time","", " you led a project. "," How did it go?"])).toBe("Tell me about a time you led a project. How did it go?");
    expect(mergeUtteranceText(["So,",", what next?"])).toBe("So, what next?");
    expect(mergeUtteranceText([])).toBe("");
  });
});

describe("meeting assist replies",()=>{
  test("maps speaker labels by index and keeps three distinct options",()=>{
    const result=normalizeMeetingReply({
      lines:[{index:0,speaker:"other"},{index:1,speaker:"you"},{index:7,speaker:"other"},{index:2,speaker:"robot"}],
      needsReply:true,
      heard:"Walk me through a project you led.",
      options:["1. I led the checkout redesign at [company].","I led the checkout redesign at [company].",'"Last year I owned a migration; the key was sequencing." ',"Happy to; which part matters most to you, the technical or the people side?","A fourth option"],
    },3);
    expect(result.labels).toEqual(["other","you","unclear"]);
    expect(result.needsReply).toBe(true);
    expect(result.options).toHaveLength(3);
    expect(result.options[0]).toBe("I led the checkout redesign at [company].");
    expect(result.options[1]).toBe("Last year I owned a migration; the key was sequencing.");
  });

  test("returns no options when the model says no reply is needed or gives none",()=>{
    expect(normalizeMeetingReply({lines:[],needsReply:false,heard:"x",options:["Still here"]},0)).toEqual({labels:[],needsReply:false,heard:"",options:[]});
    expect(normalizeMeetingReply({needsReply:true,heard:"Q",options:[]},1).needsReply).toBe(false);
    expect(normalizeMeetingReply(null,2).labels).toEqual([null,null]);
  });

  test("describes speakers and exports a readable session",()=>{
    expect(speakerLabel("other","interview")).toBe("Interviewer");
    expect(speakerLabel("other","customer")).toBe("Customer");
    expect(speakerLabel("you","meeting")).toBe("You");
    const text=meetingSessionAsText({situation:"interview",lines:[{speaker:"other",text:"Tell me about yourself."}],answer:{heard:"Tell me about yourself.",options:["A","B","C"]}});
    expect(text).toContain("Interviewer: Tell me about yourself.");
    expect(text).toContain("ANSWER OPTIONS\n1. A\n2. B\n3. C");
  });
});
