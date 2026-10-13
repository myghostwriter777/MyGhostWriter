// Convert presentation markup to editable plain text before showing, copying,
// saving or exporting a generated essay. Meaningful # and * characters remain.
export function plainWritingText(value) {
  return String(value ?? "")
    .replace(/^\s*```[^\n]*\n?/gm, "")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm, "$1")
    .replace(/^[ \t]{0,3}(?:\*[ \t]*){3,}$/gm, "")
    .replace(/(^|[\s([{])(\*{2,3})([^\s*\n](?:[^*\n]*[^\s*\n])?)\2(?=$|[\s.,!?;:)\]}])/g, "$1$3")
    .replace(/(^|[\s([{])\*([^\s*\n](?:[^*\n]*[^\s*\n])?)\*(?=$|[\s.,!?;:)\]}])/g, "$1$2")
    .replace(/(^|[\s([{])_{1,2}([^\s_\n](?:[^_\n]*[^\s_\n])?)_{1,2}(?=$|[\s.,!?;:)\]}])/g, "$1$2")
    .replace(/^[ \t]*\*[ \t]+/gm, "• ")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const PLAIN_ESSAY_FORMAT = "Use plain text only for the entire essay, including its title, subtitles, headings, and key points. Put titles and headings on their own lines with blank lines around them. Never use Markdown heading markers (#), emphasis markers (* or _), code fences, or decorative separators. If key points are requested, use numbered items or plain bullet characters. Preserve symbols that are part of the actual subject, such as C#, hashtags, and arithmetic.";
