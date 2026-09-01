const MIN_HUMANIZE_OUTPUT_TOKENS=3000;
const MAX_HUMANIZE_OUTPUT_TOKENS=8000;

// Humanize returns the complete rewritten source inside a JSON string. A fixed
// 2,000-token cap can therefore stop in the middle of that string on ordinary
// reports. Scale the allowance with source length and leave room for the JSON
// wrapper plus the short change summary.
export function humanizeOutputTokenBudget(source){
  const characters=String(source||"").length;
  return Math.min(MAX_HUMANIZE_OUTPUT_TOKENS,Math.max(MIN_HUMANIZE_OUTPUT_TOKENS,Math.ceil(characters/3)+1200));
}

const responseError=(message,code)=>{const error=new Error(message);error.code=code;return error;};

// JSON strings cannot contain literal line breaks. Models occasionally keep
// the rewritten paragraph breaks as raw control characters even when asked for
// JSON. Escape only control characters that occur inside quoted strings; JSON
// whitespace outside strings is left untouched.
function escapeControlsInsideStrings(value){
  let result="";let inString=false;let escaped=false;
  for(const character of String(value||"")){
    if(inString&&(character==="\n"||character==="\r"||character==="\t")){
      result+=character==="\t"?"\\t":"\\n";escaped=false;continue;
    }
    result+=character;
    if(escaped){escaped=false;continue;}
    if(character==="\\"&&inString){escaped=true;continue;}
    if(character==='"')inString=!inString;
  }
  return result;
}

export function parseHumanizeResponse(raw){
  const cleaned=String(raw||"").replace(/```json|```/gi,"").trim();
  const start=cleaned.indexOf("{");const end=cleaned.lastIndexOf("}");
  if(start<0||end<start)throw responseError("The rewrite ended before it was complete.","HUMANIZE_RESPONSE_INCOMPLETE");
  const candidate=cleaned.slice(start,end+1);let parsed;
  try{parsed=JSON.parse(candidate);}
  catch{
    try{parsed=JSON.parse(escapeControlsInsideStrings(candidate));}
    catch{throw responseError("The rewrite was not returned in a readable format.","HUMANIZE_RESPONSE_INVALID");}
  }
  if(!parsed||typeof parsed.humanized!=="string"||!parsed.humanized.trim())throw responseError("The rewrite did not contain completed text.","HUMANIZE_RESPONSE_INVALID");
  return {
    ...parsed,
    humanized:parsed.humanized,
    changes:Array.isArray(parsed.changes)?parsed.changes.filter(change=>change&&typeof change==="object").slice(0,4):[],
    note:typeof parsed.note==="string"?parsed.note:"",
  };
}

export function isRetryableHumanizeResponseError(error){
  return error?.code==="HUMANIZE_RESPONSE_INCOMPLETE"||error?.code==="HUMANIZE_RESPONSE_INVALID";
}
