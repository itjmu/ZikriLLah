import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
import {createAppAdmin} from '../bot/app-admin.js';
import {publicExperience,themeFromText,validBackground} from '../server/experience.js';
import {effectiveTheme,backgroundPath} from '../web/experience.js';
const q=(data,id=7)=>({callback_query:{id:'q',data,from:{id},message:{chat:{id,type:'private'}}}});
const m=(text,id=7,extra={})=>({message:{text,...extra,from:{id},chat:{id,type:'private'}}});
test('Application admin requires authorization and current confirmation; notices remain available to offline devices',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zikr-app-')),store=createStore(dir);let time=1000;const calls=[];const handler=createAppAdmin(store,async(method,body)=>{calls.push({method,body});return{};},{adminIds:['7'],now:()=>time});
 try{await handler(q('admin:app:notice',8));await handler(m('unauthorized',8));assert.equal(publicExperience(store).notifications.length,0);
  await handler(q('admin:app:notice'));await handler(m('News'));assert.equal(publicExperience(store,time).notifications.length,0);
  const draft=store.profile(7).settings.appDraft;await handler(q('admin:app:publish:stale'));assert.equal(publicExperience(store,time).notifications.length,0);
  await handler(q('admin:app:publish:'+draft.id));await handler(q('admin:app:publish:'+draft.id));assert.equal(publicExperience(store,time).notifications.length,1);
  time+=86400001;assert.equal(publicExperience(store,time).notifications.length,1);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Custom themes validate contrast, can be scheduled temporarily, and restore personal preferences',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zikr-theme-')),store=createStore(dir);let time=1000;const handler=createAppAdmin(store,async()=>({}),{adminIds:['7'],now:()=>time});
 try{assert.throws(()=>themeFromText('Bad | #FFFFFF | #FFFFFF | #FFFFFF | #FFFFFF','bad'));
  await handler(q('admin:app:new-theme'));await handler(m('Night | #101820 | #1C2833 | #A9DFBF | #FFFFFF'));
  const draft=store.profile(7).settings.appDraft;await handler(q('admin:app:publish:'+draft.id));
  const theme=publicExperience(store,time).themes[0];assert.equal(theme.name,'Night');
  await handler(q('admin:app:apply:'+theme.id+':1'));assert.equal(effectiveTheme('light',publicExperience(store,time),time),theme.id);
  time+=3600001;assert.equal(effectiveTheme('light',publicExperience(store,time),time),'light');assert.equal(publicExperience(store,time).themes.length,1);
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Photo background is confined to uploaded images and must be confirmed',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zikr-bg-')),store=createStore(dir),path='/media/11111111-1111-4111-8111-111111111111.jpg';
 const handler=createAppAdmin(store,async()=>({}),{adminIds:['7'],saveMedia:async()=>path});
 try{for(const bad of ['https://other/image.jpg','/media/../secret','javascript:alert(1)']){assert.equal(validBackground(bad),false);assert.equal(backgroundPath(bad),'');}
  await handler(q('admin:app:bg-main'));await handler(m(undefined,7,{photo:[{file_id:'photo',file_size:30}]}));
  assert.equal(publicExperience(store).backgrounds.main,'');await handler(q('admin:app:publish:'+store.profile(7).settings.appDraft.id));assert.equal(publicExperience(store).backgrounds.main,path);
  await handler(q('admin:app:clear-main'));assert.equal(publicExperience(store).backgrounds.main,'');
 }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
