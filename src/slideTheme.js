// Colour system for the slide studio. Every renderer (live preview, fullscreen,
// PDF, PNG, PPTX, Word) reads the same palette so exports match the screen.

export const SLIDE_THEMES=[
  {id:"editorial",icon:"slides",title:"Editorial",desc:"Deep navy, soft pink headings & illustrated cards",accent:"#efa9f3",background:"#0f1140",prompt:"vibrant hand-drawn editorial illustration with clean confident ink linework, flat colour with soft dimensional shading, lush natural detail, warm light, and calm negative space"},
  {id:"executive",icon:"briefcase",title:"Executive",desc:"Quiet authority & decisive data",accent:"#79BAEC",background:"#07111d",prompt:"restrained corporate editorial illustration, cool blues and graphite, precise geometry, one decisive focal object, disciplined negative space"},
  {id:"storytelling",icon:"story",title:"Storytelling",desc:"Cinematic scenes & human tension",accent:"#f6bd75",background:"#140f1c",prompt:"cinematic painterly scenes with emotionally legible people, golden-hour light, layered depth, and strong narrative pacing"},
  {id:"classroom",icon:"academic",title:"Classroom",desc:"Concrete ideas & simple diagrams",accent:"#5eead4",background:"#0a1a1f",prompt:"friendly textbook illustration, clear labelled subjects, bright clean colour, simple readable shapes, one learning idea at a time"},
  {id:"pitch",icon:"trendUp",title:"Pitch Deck",desc:"Bold contrast & memorable proof",accent:"#f472b6",background:"#0b0b14",prompt:"bold high-contrast product illustration, saturated accent lighting, confident silhouettes, one proof point per scene"},
  {id:"custom",icon:"spark",title:"Custom Theme",desc:"Describe your own visual world",accent:"#c084fc",background:"#0f0c1c",prompt:"a distinctive user-defined visual system with consistent mood, imagery, palette, and composition"},
];
export const DEFAULT_SLIDE_THEME=SLIDE_THEMES[0];
export const SLIDE_FONTS=["Poppins","Montserrat","Inter","Plus Jakarta Sans","Open Sans","Raleway","Nunito","Oswald","League Spartan","Public Sans","Roboto","Cabinet Grotesk","Libre Baskerville","Playfair Display","Source Serif 4","Newsreader","Libre Bodoni","Fredoka","Permanent Marker","Georgia"];
export const DEFAULT_SLIDE_FONT="Poppins";
export const GOOGLE_SLIDE_FONTS=new Set(SLIDE_FONTS.filter(name=>!["Cabinet Grotesk","Georgia"].includes(name)));

export const normalizeSlideHex=value=>/^#[0-9a-f]{6}$/i.test(String(value||""))?String(value).toLowerCase():DEFAULT_SLIDE_THEME.background;
export const hexRgb=value=>{const hex=normalizeSlideHex(value).slice(1);return {r:parseInt(hex.slice(0,2),16),g:parseInt(hex.slice(2,4),16),b:parseInt(hex.slice(4,6),16)};};
export const rgbHex=({r,g,b})=>"#"+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0")).join("");
export const mixSlideColor=(from,to,amount)=>{const a=hexRgb(from),b=hexRgb(to);return rgbHex({r:a.r+(b.r-a.r)*amount,g:a.g+(b.g-a.g)*amount,b:a.b+(b.b-a.b)*amount});};
export const withAlpha=(hex,alpha)=>{const {r,g,b}=hexRgb(hex);return `rgba(${r},${g},${b},${Math.max(0,Math.min(1,alpha))})`;};
export const slideLuminance=value=>{const {r,g,b}=hexRgb(value);const linear=channel=>{const s=channel/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);};return 0.2126*linear(r)+0.7152*linear(g)+0.0722*linear(b);};
export const slideContrast=(a,b)=>{const first=slideLuminance(a),second=slideLuminance(b);return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);};

const pickReadable=(candidates,bg,bg2,minimum)=>candidates.find(color=>Math.min(slideContrast(color,bg),slideContrast(color,bg2))>=minimum)||candidates.reduce((best,color)=>Math.min(slideContrast(color,bg),slideContrast(color,bg2))>Math.min(slideContrast(best,bg),slideContrast(best,bg2))?color:best,candidates[0]);

export const readableSlideAccent=(bg,bg2,preferred,dark,minimum=3.2)=>{
  const {r,g,b}=hexRgb(preferred);const inverse=rgbHex({r:255-r,g:255-g,b:255-b});
  const candidates=dark
    ?[preferred,mixSlideColor(preferred,"#ffffff",0.2),mixSlideColor(preferred,"#ffffff",0.4),inverse,"#7dd3fc","#f9a8d4","#fcd34d","#ffffff"]
    :[mixSlideColor(preferred,"#000000",0.5),mixSlideColor(preferred,"#000000",0.62),mixSlideColor(inverse,"#000000",0.46),"#075985","#9d174d","#854d0e","#17202c"];
  return pickReadable(candidates,bg,bg2,minimum);
};

export const slideThemeById=themeId=>SLIDE_THEMES.find(item=>item.id===themeId)||DEFAULT_SLIDE_THEME;

export const slidePalette=(background,themeId,textColor="")=>{
  const bg=normalizeSlideHex(background);const dark=slideLuminance(bg)<0.56;const system=slideThemeById(themeId);
  const bg2=mixSlideColor(bg,dark?"#ffffff":"#000000",dark?0.09:0.06);
  const text=textColor?normalizeSlideHex(textColor):(dark?"#f8fbff":"#101824");
  const muted=mixSlideColor(text,bg,0.28);
  const accent=readableSlideAccent(bg,bg2,system.accent,dark);
  // Headings carry the accent when it is strong enough to read as a title;
  // otherwise they fall back to the body colour so nothing washes out.
  const heading=readableSlideAccent(bg,bg2,system.accent,dark,4.5);
  const accent2=readableSlideAccent(bg,bg2,themeId==="pitch"?"#5eead4":"#f472b6",dark);
  const accent3=readableSlideAccent(bg,bg2,themeId==="storytelling"?"#7dd3fc":"#fcd34d",dark);
  const onAccent=slideContrast(accent,"#071019")>=4.5?"#071019":"#ffffff";
  const card=withAlpha(text,dark?0.06:0.05);
  const cardBorder=withAlpha(text,dark?0.14:0.12);
  const proof=dark?mixSlideColor(mixSlideColor(accent,"#1d4ed8",0.62),bg,0.25):mixSlideColor(accent,"#ffffff",0.72);
  return {bg,bg2,text,muted,accent,heading,accent2,accent3,onAccent,card,cardBorder,proof,preview:`linear-gradient(135deg,${bg},${bg2})`,dark,themeId:system.id};
};

export const slideFontStack=font=>`"${String(font||DEFAULT_SLIDE_FONT).replace(/"/g,"")}", "Segoe UI", Arial, sans-serif`;
export const slideSerifStack='"Source Serif 4", "Libre Baskerville", Georgia, "Times New Roman", serif';
export const slidePointParts=value=>{const match=String(value||"").match(/^([^:]{1,60}):\s*(.+)$/);return match?{label:match[1].trim(),detail:match[2].trim()}:{label:String(value||"").trim(),detail:""};};
