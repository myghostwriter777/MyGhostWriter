export function clampGenerationCount(value,{min=1,max=30,fallback=min}={}){
  if(value===""||value==null)return Math.max(min,Math.min(max,Math.round(Number(fallback)||min)));
  const parsed=Number(value);
  const safeFallback=Math.max(min,Math.min(max,Math.round(Number(fallback)||min)));
  if(!Number.isFinite(parsed))return safeFallback;
  return Math.max(min,Math.min(max,Math.round(parsed)));
}
