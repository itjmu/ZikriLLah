import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
import {createBroadcasts} from '../bot/broadcasts.js';
const message=(id,body,user=7)=>({message:{message_id:id,chat:{id:user,type:'private'},from:{id:user},...body}});
const callback=(data,user=7)=>({callback_query:{id:'q',data,from:{id:user},message:{chat:{id:user,type:'private'}}}});
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'zikr-broadcast-')),store=createStore(dir),calls=[];let clock=1000,behavior=null,nextId=100;
 const api=async(method,body)=>{calls.push({method,body});if(behavior){const result=behavior(method,body);if(result)throw result;}return method==='copyMessages'?body.message_ids.map(()=>({message_id:++nextId})):{message_id:++nextId};};
 store.profile(7);store.profile(8);
 return {store,calls,worker:createBroadcasts(store,api,{adminIds:['7'],now:()=>clock}),advance(){clock+=100000;},fail(fn){behavior=fn;},close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};
}
async function draft(f){
 await f.worker.handle(callback('admin:b:new'));
 await f.worker.handle(message(1,{text:'Жирный и ссылка',entities:[{type:'bold',offset:0,length:6}]}));
 await f.worker.handle(message(2,{photo:[{file_id:'p'}],caption:'Подпись',caption_entities:[{type:'italic',offset:0,length:7}],media_group_id:'album'}));
 await f.worker.handle(message(3,{video:{file_id:'v'},media_group_id:'album',forward_origin:{type:'channel'}}));
 await f.worker.handle(callback('admin:b:preview'));
 return f.store.profile(7).settings.broadcastDraft;
}
test('Broadcast requires admin and explicit current preview confirmation, preserving message sources and albums',async()=>{
 const f=fixture();try{
  await f.worker.handle(callback('admin:b:new',8));assert.equal(f.store.profile(8).settings.broadcastDraft,undefined);
  const d=await draft(f);
  assert.deepEqual(f.calls.find(c=>c.method==='copyMessages').body.message_ids,[1,2,3]);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM broadcasts').get().n,0);
  await f.worker.handle(callback('admin:b:send:stale'));assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM broadcasts').get().n,0);
  await f.worker.handle(callback('admin:b:send:'+d.id));await f.worker.handle(callback('admin:b:send:'+d.id));
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM broadcasts').get().n,1);
  await f.worker.tick();f.advance();await f.worker.tick();f.advance();await f.worker.tick();
  const delivery=f.calls.filter(c=>c.method==='copyMessages').slice(1);
  assert.equal(delivery.length,2);assert.deepEqual(delivery[0].body.message_ids,d.preview);
  assert.equal(delivery[0].body.caption,undefined);assert.equal(delivery[0].body.parse_mode,undefined);
  assert.equal(f.store.db.prepare('SELECT status FROM broadcasts').get().status,'done');
 }finally{f.close();}
});
test('Rate limits retry later, blocked recipients do not abort, and cancellation stops pending sends',async()=>{
 const f=fixture();try{const d=await draft(f);await f.worker.handle(callback('admin:b:send:'+d.id));
  f.fail(method=>method==='copyMessages'?{code:429,retryAfter:30}:null);await f.worker.tick();
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM broadcast_deliveries WHERE status='pending'").get().n,2);
  const count=f.calls.length;await f.worker.tick();assert.equal(f.calls.length,count);
  f.advance();f.fail(method=>method==='copyMessages'?{code:403}:null);await f.worker.tick();
  assert.equal(f.store.db.prepare("SELECT COUNT(*) n FROM broadcast_deliveries WHERE status='failed'").get().n,1);
  await f.worker.handle(callback('admin:b:stop:'+d.id));f.advance();f.fail(null);const sent=f.calls.length;await f.worker.tick();assert.equal(f.calls.length,sent);
 }finally{f.close();}
});
test('Recovery never automatically duplicates an ambiguous delivery and unsupported partial previews cannot be sent',async()=>{
 const f=fixture();try{const d=await draft(f);await f.worker.handle(callback('admin:b:send:'+d.id));
  f.store.db.prepare("UPDATE broadcast_deliveries SET status='sending' WHERE user='7'").run();f.worker.recover();
  assert.equal(f.store.db.prepare("SELECT status FROM broadcast_deliveries WHERE user='7'").get().status,'uncertain');
  f.advance();await f.worker.tick();assert.equal(f.calls.at(-1).body.chat_id,'8');
  await f.worker.handle(callback('admin:b:new'));await f.worker.handle(message(42,{invoice:{}}));assert.deepEqual(f.store.profile(7).settings.broadcastDraft.ids,[]);
 }finally{f.close();}
});
test('New draft content invalidates preview and leaving the admin flow cancels message capture',async()=>{
 const f=fixture();try{const d=await draft(f);await f.worker.handle(message(44,{sticker:{file_id:'sticker'}}));await f.worker.handle(callback('admin:b:send:'+d.id));assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM broadcasts').get().n,0);
  assert.equal(await f.worker.handle(callback('admin:home')),false);assert.equal(f.store.profile(7).settings.broadcastDraft,null);
 }finally{f.close();}
});
