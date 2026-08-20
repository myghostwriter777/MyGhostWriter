import {HISTORY_INITIAL_VISIBLE,HISTORY_REVEAL_STEP,nextHistoryVisibleCount,prepareHistoryItems} from "./historyPaging";

describe("History progressive reveal",()=>{
  const items=Array.from({length:24},(_,index)=>({id:String(index),mode:index%2?"email":"essay",ts:index+1}));

  test("orders newest first and initially supports six visible items",()=>{
    const prepared=prepareHistoryItems(items,"all");
    expect(prepared.slice(0,HISTORY_INITIAL_VISIBLE).map(item=>item.ts)).toEqual([24,23,22,21,20,19]);
  });

  test("reveals eight more per click without passing the total",()=>{
    expect(HISTORY_REVEAL_STEP).toBe(8);
    expect(nextHistoryVisibleCount(6,24)).toBe(14);
    expect(nextHistoryVisibleCount(14,24)).toBe(22);
    expect(nextHistoryVisibleCount(22,24)).toBe(24);
  });

  test("filters before ordering and revealing",()=>{
    const email=prepareHistoryItems(items,"email");
    expect(email).toHaveLength(12);
    expect(email.every(item=>item.mode==="email")).toBe(true);
    expect(email[0].ts).toBe(24);
  });

  test("orders the ISO timestamps stored by History",()=>{
    const prepared=prepareHistoryItems([
      {id:"old",mode:"manga",ts:"2026-08-19T09:00:00.000Z"},
      {id:"new",mode:"manga",ts:"2026-08-21T09:00:00.000Z"},
    ]);
    expect(prepared.map(item=>item.id)).toEqual(["new","old"]);
  });
});
