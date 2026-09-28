import {builtinZikrs} from './catalog.js';
export const zikrs=builtinZikrs;
export function statistics(events,selected,goal,now=new Date()) {
  const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);
  let today=0,previous=0,month=0,count=0;let first=null,last=null;
  for(const e of events){const d=new Date(e.at);if(!Number.isFinite(d.getTime()))continue;
    if(d.toDateString()===now.toDateString())today++;
    if(d.toDateString()===yesterday.toDateString())previous++;
    if(d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth())month++;
    if(e.zikr===selected)count++;
    if(!first||d<first)first=d;if(!last||d>last)last=d;
  }
  const target=[3500,7000,14000,30000,50000].find(n=>n>events.length)||50000;
  return {today,yesterday:previous,month,count,current:count===0?0:((count-1)%goal)+1,rounds:Math.floor(count/goal),total:events.length,first,last,target,achieved:events.length>=50000};
}
export function mergeSync(pending,batch,remote){
  const acknowledged=new Set(batch.map(e=>e.id));
  const remaining=pending.filter(e=>!acknowledged.has(e.id));
  return {pending:remaining,events:[...new Map([...remote,...remaining].map(e=>[e.id,e])).values()]};
}
export class TapGate {
  last=-Infinity;
  accept(now,interval=200){if(now-this.last<interval)return false;this.last=now;return true;}
}

export function orderedCatalog(catalog,order=[],deleted=[]){
 const available=new Map(catalog.filter(z=>!deleted.includes(z.id)).map(z=>[z.id,z]));
 return [...new Set([...order,...available.keys()])].filter(id=>available.has(id)).map(id=>available.get(id));
}
export function cycleIds(catalog,chosen=null){
 const ids=catalog.map(z=>z.id),filtered=chosen===null?ids:ids.filter(id=>chosen.includes(id));
 return filtered.length?filtered:ids.slice(0,1);
}
export function nextInCycle(catalog,chosen,current){
 const ids=cycleIds(catalog,chosen);return ids[(ids.indexOf(current)+1)%ids.length];
}

export function feedbackPolicy({soundEnabled=true,vibrationEnabled=true,silent=false,stealth=false},complete=false){return {sound:soundEnabled&&!silent&&!stealth,vibrate:!silent&&(stealth?complete:vibrationEnabled)};}
export function weekCounts(events,now=new Date()){
 const dates=Array.from({length:7},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-6+i);return d;});
 const keys=new Map(dates.map((d,i)=>[d.toDateString(),i])),counts=dates.map(()=>0);
 for(const e of events){const i=keys.get(new Date(e.at).toDateString());if(i!==undefined)counts[i]++;}
 return dates.map((date,i)=>({date,count:counts[i]}));
}
