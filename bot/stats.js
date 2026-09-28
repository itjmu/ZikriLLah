export const dayKey=(date,offset=0)=>new Date(new Date(date).getTime()+offset*60000).toISOString().slice(0,10);
export function shiftDay(key,delta){const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
export function report(events,offset,now=new Date()){
  const today=dayKey(now,offset),days=new Map(),byZikr={subhanallah:0,alhamdulillah:0,allahuakbar:0};
  let first=null,last=null;
  for(const e of events){const d=new Date(e.at);if(!Number.isFinite(d.getTime()))continue;const key=dayKey(d,offset);days.set(key,(days.get(key)||0)+1);byZikr[e.zikr]=(byZikr[e.zikr]||0)+1;if(!first||d<first)first=d;if(!last||d>last)last=d;}
  const week=Array.from({length:7},(_,i)=>{const day=shiftDay(today,i-6);return {day,count:days.get(day)||0};});
  let cursor=days.has(today)?today:shiftDay(today,-1),streak=0;
  while(days.has(cursor)){streak++;cursor=shiftDay(cursor,-1);}
  const best=[...days.entries()].sort((a,b)=>b[1]-a[1]||b[0].localeCompare(a[0]))[0];
  return {today:days.get(today)||0,yesterday:days.get(shiftDay(today,-1))||0,month:[...days].filter(([day])=>day.startsWith(today.slice(0,7))).reduce((n,[,count])=>n+count,0),week,total:events.length,byZikr,streak,activeDays:days.size,best,first,last};
}
export function rankRange(period,now=new Date()){
  const today=dayKey(now);return {since:period==='day'?`${today}T00:00:00Z`:period==='week'?`${shiftDay(today,-6)}T00:00:00Z`:'1970-01-01T00:00:00Z',until:now.toISOString()};
}
export function localTime(date,offset){if(!date)return '—';return new Date(new Date(date).getTime()+offset*60000).toISOString().slice(0,16).replace('T',' ');}
