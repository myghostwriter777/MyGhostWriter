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

export const MEETING_VOICE_PROFILE_KEY=email=>`gwm_meeting_voice_profile_${String(email||"guest").trim().toLowerCase()}`;

export const speakerLabel=(speaker,situationId)=>{
  if(speaker==="you")return"You";
  if(speaker==="other")return situationId==="interview"?"Interviewer":situationId==="class"?"Examiner":situationId==="customer"?"Customer":"Speaker";
  if(speaker==="pending")return"…";
  return"Unclear";
};

const formatHint=line=>{
  if(line?.voiceMatch==null)return"voice hint: unknown";
  const match=Number(line.voiceMatch);
  return `voice hint: ${match>=0.72?"likely the user":match<=0.42?"likely another speaker":"unclear"} (${match.toFixed(2)})`;
};

export function buildMeetingPrompt({situation="interview",source="microphone",context="",history=[],newLines=[]}={}){
  const scene=meetingSituation(situation);
  const remoteOnly=source==="tab";
  const system=[
    `You are GhostwriterMe Meeting Assist, a real-time coach listening to a live ${scene.label.toLowerCase()}.`,
    remoteOnly
      ?"The audio comes only from the shared meeting tab, so every line was spoken by a remote participant. Label every new line \"other\"."
      :`The audio comes from a microphone that hears both ${scene.other} and the user (${scene.you}). First decide who spoke each new line: "you" when the line is clearly the user speaking (an answer, a self-description, or a statement that matches the user's context), "other" when ${scene.other} is speaking (a question, prompt, instruction, or remark directed at the user), and "unclear" only when it is truly ambiguous. Use the content, turn-taking, and the acoustic voice hint together; the voice hint is approximate and content wins when they conflict.`,
    `Then look at the most recent line spoken by ${scene.other}. If it asks something, invites a response, or clearly expects the user to speak next, set needsReply true, restate it briefly and faithfully in "heard", and write exactly three ${scene.style}. Each option is first person, 1 to 3 sentences, natural to say aloud, and grounded only in the user's context. Never invent facts about the user; when a specific detail is needed, use a short placeholder in square brackets such as [company] or [a recent project]. Make the three options genuinely different: one direct and concise, one structured with a concrete example, and one thoughtful that ends with a brief clarifying or follow-up question.`,
    "If the newest lines are the user speaking, are small talk that needs no answer, or the other party has not finished the thought, set needsReply false, set heard to an empty string, and return an empty options list.",
    "Never comment on transcript quality, never address the user directly, and never treat the word \"you\" inside the transcript as a speaker name. Return only the structured result.",
  ].join(" ");
  const historyText=history.length?history.map(line=>`[${line.speaker==="you"?"you":line.speaker==="other"?"other":"unclear"}] ${line.text}`).join("\n"):"(none yet)";
  const newText=newLines.length?newLines.map((line,index)=>`${index}: ${JSON.stringify(String(line.text||""))} | ${remoteOnly?"remote participant":formatHint(line)}`).join("\n"):"(none)";
  const user=`Situation: ${scene.label}\nAudio source: ${remoteOnly?"shared meeting tab (remote participants only)":"microphone (room audio, both sides)"}\nAbout the user: ${String(context||"").trim()||"none provided"}\n\nEarlier transcript, already labeled (oldest first):\n${historyText}\n\nNew lines to label now (index: text | hint):\n${newText}`;
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
