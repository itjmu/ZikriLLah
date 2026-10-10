export function mergeDhikrs(...lists){const map=new Map();for(const z of lists.flat()){const old=map.get(z.id);if(!old||(z.revision||'')>(old.revision||''))map.set(z.id,z);}return [...map.values()];}
export function mergeResets(...lists){return [...new Map(lists.flat().map(r=>[r.id,r])).values()];}
export function applyResets(events,resets=[]){return events.filter(e=>!resets.some(r=>Date.parse(e.at)>=Date.parse(r.from)&&Date.parse(e.at)<=Date.parse(r.to)));}
export function resetRange(days,now=new Date()){const from=new Date(now);from.setHours(0,0,0,0);from.setDate(from.getDate()-(days-1));return {from:from.toISOString(),to:now.toISOString()};}
