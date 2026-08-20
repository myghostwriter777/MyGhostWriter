export const HISTORY_INITIAL_VISIBLE=6;
export const HISTORY_REVEAL_STEP=8;

export function prepareHistoryItems(items,filter="all"){
  const selected=filter==="all"?items:items.filter(item=>item.mode===filter);
  const timestamp=value=>typeof value==="number"?value:(Date.parse(value)||0);
  return selected.slice().sort((a,b)=>timestamp(b?.ts)-timestamp(a?.ts));
}

export function nextHistoryVisibleCount(current,total){
  return Math.min(Math.max(0,total),Math.max(HISTORY_INITIAL_VISIBLE,current)+HISTORY_REVEAL_STEP);
}
