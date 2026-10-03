import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
import {createAppServer} from '../server/index.js';
import {createAppAdmin} from '../bot/app-admin.js';
import {createBroadcasts} from '../bot/broadcasts.js';
import {publicExperience} from '../server/experience.js';
const q=data=>({callback_query:{id:'q',data,from:{id:7},message:{chat:{id:7,type:'private'}}}});
const msg=(text,extra={})=>({message:{text,...extra,from:{id:7},chat:{id:7,type:'private'}}});
test('Admin shared dhikr and sound require confirmation and sync with full content; feed stays private',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zikr-content-')),store=createStore(dir);const api=async()=>({});
 const handle=createAppAdmin(store,api,{adminIds:['7'],saveMedia:async()=>'/media/11111111-1111-1111-1111-111111111111.wav'});
 const server=createAppServer(store,dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  await handle(q('admin:app:zikr'));await handle(msg('Общий зикр | سبحان الله | Перевод'));
  assert.equal(store.sharedZikrs().length,0);let draft=store.profile(7).settings.appDraft;
  await handle(q('admin:app:publish:'+draft.id));assert.equal(store.sharedZikrs().length,1);
  const zikr=store.sharedZikrs()[0];assert.ok(store.catalog(99).some(z=>z.id===zikr.id));
  assert.equal(store.sync('99',[{id:'global-event-1',zikr:zikr.id,at:new Date().toISOString()}]).length,1);
  await handle(q('admin:app:sound'));await handle(msg('',{document:{file_id:'sound',file_size:2000,file_name:'test.wav'},caption:'Капля'}));
  draft=store.profile(7).settings.appDraft;await handle(q('admin:app:publish:'+draft.id));assert.equal(publicExperience(store).sounds[0].name,'Капля');
  createBroadcasts(store,api);store.db.prepare('INSERT INTO broadcast_feed VALUES(?,?)').run('job',JSON.stringify({text:'Private broadcast'}));store.db.prepare('INSERT INTO broadcast_deliveries(job,user) VALUES(?,?)').run('job','99');
  const base='http://127.0.0.1:'+server.address().port;
  const fetchSync=async user=>(await fetch(base+'/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+store.token(user)},body:JSON.stringify({events:[]})})).json();
  const data=await fetchSync('99');assert.equal(data.account,'99');assert.equal(data.experience.zikrs.length,1);assert.equal(data.experience.sounds.length,1);assert.equal(data.broadcasts.length,1);
  assert.equal((await fetchSync('100')).broadcasts.length,0);assert.equal((await(await fetch(base+'/api/content')).json()).broadcasts,undefined);
 }finally{await new Promise(r=>server.close(r));store.db.close();rmSync(dir,{recursive:true,force:true});}
});
