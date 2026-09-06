// Prompt and result helpers for Meeting Assist. Kept free of React and browser
// APIs so the speaker-attribution contract with the model can be unit tested.

export const MEETING_SITUATIONS=[
  {id:"interview",label:"Job interview",icon:"interview",other:"the interviewer",you:"the candidate",style:"confident spoken answers a candidate could say out loud"},
  {id:"meeting",label:"Work meeting",icon:"meeting",other:"a colleague, manager, or client",you:"the participant",style:"clear, collaborative spoken contributions"},
  {id:"class",label:"Class or viva",icon:"academic",other:"the teacher or examiner",you:"the student",style:"precise, well-structured academic answers"},
  {id:"customer",label:"Customer call",icon:"contact",other:"the customer",you:"the representative",style:"warm, professional replies that solve the customer's problem"},
  {id:"casual",label:"Casual chat",icon:"casual",other:"the other person",you:"the user",style:"friendly, natural replies"},
];

export const meetingSituation=id=>MEETING_SITUATIONS.find(item=>item.id===id)||MEETING_SITUATIONS[0];

// Spoken language of the conversation. "Auto" lets the transcription model
// detect it; a fixed language stops short segments from being mis-detected.
export const MEETING_LANGUAGES=[
  {value:"",label:"Auto-detect"},
  {value:"en",label:"English"},
  {value:"th",label:"Thai"},
  {value:"ja",label:"Japanese"},
  {value:"ko",label:"Korean"},
  {value:"zh",label:"Chinese"},
  {value:"es",label:"Spanish"},
  {value:"fr",label:"French"},
  {value:"de",label:"German"},
  {value:"pt",label:"Portuguese"},
  {value:"hi",label:"Hindi"},
  {value:"id",label:"Indonesian"},
  {value:"vi",label:"Vietnamese"},
  {value:"ar",label:"Arabic"},
];

export const MEETING_VOICE_PROFILE_KEY=email=>`gwm_meeting_voice_profile_${String(email||"guest").trim().toLowerCase()}`;
export const MEETING_LANGUAGE_KEY=email=>`gwm_meeting_language_${String(email||"guest").trim().toLowerCase()}`;

export const speakerLabel=(speaker,situationId)=>{
  if(speaker==="you")return"You";
  if(speaker==="other")return situationId==="interview"?"Interviewer":situationId==="class"?"Examiner":situationId==="customer"?"Customer":"Speaker";
  if(speaker==="pending")return"…";
  return"Unclear";
};

// Short vocabulary hint for the transcription model: the kind of conversation
// plus proper nouns from the user's context (company, product, school names)
// so they are spelled the way the user spelled them.
export const buildTranscriptionHint=({situation="interview",context=""}={})=>{
  const scene=meetingSituation(situation);
  const words=String(context||"").match(/\b[A-Z][A-Za-z0-9&.+-]{1,24}\b/g)||[];
  const skip=new Set(["I","Im","The","A","An","My","Me","We","And","Or","But","For","In","On","At","To","Of","With","About","Role","Company","Experience"]);
  const terms=[];const seen=new Set();
  for(const word of words){
    const key=word.toLowerCase();
    if(skip.has(word)||seen.has(key))continue;
    seen.add(key);terms.push(word);
    if(terms.length>=14)break;
  }
  const base=`${scene.label} between ${scene.other} and ${scene.you}.`;
  const hint=terms.length?`${base} Names and terms: ${terms.join(", ")}.`:base;
  return hint.slice(0,360);
};

// Joins the transcribed chunks of one speaker turn in order. Chunks are cut at
// pauses, so a space is the right joiner; doubled punctuation and spaces from
// the boundaries are tidied.
export const mergeUtteranceText=parts=>String((parts||[]).map(part=>String(part||"").trim()).filter(Boolean).join(" "))
  .replace(/\s+([,.!?;:])/g,"$1")
  .replace(/([,.!?;:])\1+/g,"$1")
  .replace(/\s{2,}/g," ")
  .trim();

const formatHint=line=>{
  if(line?.voiceMatch==null)return"voice hint: unknown";
  const match=Number(line.voiceMatch);
  return `voice hint: ${match>=0.72?"likely the user":match<=0.42?"likely another speaker":"unclear"} (${match.toFixed(2)})`;
};

const clipForPrompt=(text,limit)=>{const value=String(text||"").replace(/\s+/g," ").trim();return value.length>limit?`${value.slice(0,limit-1)}…`:value;};

export function buildMeetingPrompt({situation="interview",source="microphone",context="",history=[],newLines=[]}={}){
  const scene=meetingSituation(situation);
  const remoteOnly=source==="tab";
  const system=[
    `You are GhostwriterMe Meeting Assist, a real-time coach listening to a live ${scene.label.toLowerCase()}. Each new line is one complete speaker turn (the speaker paused for two seconds).`,
    remoteOnly
      ?"The audio comes only from the shared meeting tab, so every line was spoken by a remote participant. Label every new line \"other\"."
      :`The audio comes from a microphone that hears both ${scene.other} and the user (${scene.you}). First decide who spoke each new line: "you" when the line is clearly the user speaking (an answer, a self-description, or a statement that matches the user's context), "other" when ${scene.other} is speaking (a question, prompt, instruction, or remark directed at the user), and "unclear" only when it is truly ambiguous. Use the content, turn-taking, and the acoustic voice hint together; the voice hint is approximate and content wins when they conflict.`,
    `Then take the most recent new line spoken by ${scene.other}. Whenever such a line exists, set needsReply true, restate it briefly and faithfully in "heard", and write exactly three ${scene.style}. A question gets three answers; a remark, instruction, or partial thought gets three natural spoken responses to what was heard so far that keep the conversation moving. Each option is first person, 1 to 3 sentences, natural to say aloud, and grounded only in the user's context. Never invent facts about the user; when a specific detail is needed, use a short placeholder in square brackets such as [company] or [a recent project]. Make the three options genuinely different: one direct and concise, one structured with a concrete example, and one thoughtful that ends with a brief clarifying or follow-up question.`,
    "Set needsReply false, heard to an empty string, and options to an empty list only when none of the new lines was spoken by the other party.",
    "Never comment on transcript quality, never address the user directly, and never treat the word \"you\" inside the transcript as a speaker name. Return only the structured result.",
  ].join(" ");
  const historyText=history.length?history.map(line=>`[${line.speaker==="you"?"you":line.speaker==="other"?"other":"unclear"}] ${clipForPrompt(line.text,420)}`).join("\n"):"(none yet)";
  const newText=newLines.length?newLines.map((line,index)=>`${index}: ${JSON.stringify(clipForPrompt(line.text,1200))} | ${remoteOnly?"remote participant":formatHint(line)}`).join("\n"):"(none)";
  const user=`Situation: ${scene.label}\nAudio source: ${remoteOnly?"shared meeting tab (remote participants only)":"microphone (room audio, both sides)"}\nAbout the user: ${clipForPrompt(context,1600)||"none provided"}\n\nEarlier transcript, already labeled (oldest first):\n${historyText}\n\nNew lines to label now (index: text | hint):\n${newText}`;
  return {system,user};
}

const cleanOption=value=>String(value||"").replace(/\s+/g," ").trim().replace(/^(?:option\s*)?\d+[.):-]\s*/i,"").replace(/^["“]+|["”]+$/g,"").trim();

export function normalizeMeetingReply(raw,newLineCount=0){
  const source=raw&&typeof raw==="object"?raw:{};
  const labels=Array.from({length:Math.max(0,Number(newLineCount)||0)},()=>null);
  for(const entry of Array.isArray(source.lines)?source.lines:[]){
    const index=Number(entry?.index);
    if(!Number.isInteger(index)||index<0||index>=labels.length)continue;
    labels[index]=["other","you","unclear"].includes(entry?.speaker)?entry.speaker:"unclear";
  }
  const seen=new Set();
  const options=(Array.isArray(source.options)?source.options:[]).map(cleanOption).filter(option=>{
    const key=option.toLowerCase();
    if(!option||seen.has(key))return false;seen.add(key);return true;
  }).slice(0,3);
  const heard=String(source.heard||"").replace(/\s+/g," ").trim();
  const needsReply=source.needsReply===true&&options.length>0;
  return {labels,needsReply,heard:needsReply?heard:"",options:needsReply?options:[]};
}

export const meetingSessionAsText=({lines=[],answer=null,situation="interview"}={})=>{
  const transcript=lines.map(line=>`${speakerLabel(line.speaker,situation)}: ${line.text}`).join("\n");
  const answers=answer?.options?.length?`\n\nLAST QUESTION\n${answer.heard||"(see transcript)"}\n\nANSWER OPTIONS\n${answer.options.map((option,index)=>`${index+1}. ${option}`).join("\n")}`:"";
  return `TRANSCRIPT\n${transcript}${answers}`;
};
