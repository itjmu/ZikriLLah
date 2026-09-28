import {test} from 'node:test';
import assert from 'node:assert/strict';
import {statistics,mergeSync,TapGate} from '../web/model.js';
const event=(id,at,zikr='subhanallah')=>({id,at,zikr});
test('One shared interval rejects pointer/click duplicates and accepts the next deliberate tap',()=>{
  const gate=new TapGate();assert.equal(gate.accept(1000,200),true);assert.equal(gate.accept(1001,200),false);assert.equal(gate.accept(1199,200),false);assert.equal(gate.accept(1200,200),true);assert.equal(gate.accept(1450,350),false);assert.equal(gate.accept(1550,350),true);
});
test('Calendar stats respect yesterday, month and gaps between visits',()=>{
  const now=new Date(2026,8,1,12);
  const events=[event('a',new Date(2026,8,1,8).toISOString()),event('b',new Date(2026,7,31,22).toISOString()),event('c',new Date(2026,7,27,12).toISOString())];
  const result=statistics(events,'subhanallah',33,now);assert.equal(result.today,1);assert.equal(result.yesterday,1);assert.equal(result.month,1);
  assert.equal(statistics(events,'subhanallah',33,new Date(2026,8,5)).yesterday,0);
});
test('A completed round displays the goal then restarts without losing totals',()=>{
  const events=Array.from({length:33},(_,i)=>event(String(i),new Date().toISOString()));
  assert.equal(statistics(events,'subhanallah',33).current,33);events.push(event('next',new Date().toISOString()));
  const s=statistics(events,'subhanallah',33);assert.equal(s.current,1);assert.equal(s.total,34);assert.equal(s.rounds,1);
});
test('An in-flight sync preserves new taps and tolerates repeated acknowledgements',()=>{
  const a=event('a',new Date().toISOString()),b=event('b',a.at),c=event('remote',a.at);
  const merged=mergeSync([a,b],[a],[a,c]);assert.deepEqual(merged.pending,[b]);assert.equal(merged.events.length,3);
  const final=mergeSync(merged.pending,[b],[a,b,c]);assert.equal(final.pending.length,0);assert.equal(final.events.length,3);
});
