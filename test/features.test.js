import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
import {createHandler} from '../bot/handler.js';
import {createAppServer} from '../server/index.js';
import {mediaExtension} from '../bot/media.js';
import {screen} from '../bot/ui.js';
import {publicationButton} from '../web/links.js';
import {createHaptics} from '../web/haptics.js';
import {publicContent,sendPublication} from '../bot/publications.js';
const at='2026-09-28T10:00:00Z',custom={id:'custom-11111111-1111-4111-8111-111111111111',name:'Мой зикр',arabic:'',meaning:'Мой текст'};
function fixture(){const dir=mkdtempSync(join(tmpdir(),'zikr-v05-'));return {dir,store:createStore(dir),close(){this.store.db.close();rmSync(dir,{recursive:true,force:true});}};}
const message=(id,text,user=7,extra={})=>({update_id:id,message:{message_id:id,from:{id:user},chat:{id:user,type:'private'},date:Date.parse(at)/1000,text,...extra}});
const callback=(id,data,user=7)=>({update_id:id,callback_query:{id:String(id),data,from:{id:user},message:{message_id:90,chat:{id:user,type:'private'}}}});
function transport(){const calls=[];let id=1000;return {calls,api:async(method,body)=>{calls.push({method,body});return {message_id:++id};}};}
test('Repeated bottom taps delete incoming messages and edit the same persisted panel',async()=>{
  const f=fixture(),t=transport();try{let h=createHandler(f.store,t.api);await h(callback(1,'tasbih'));t.calls.length=0;
    await h(message(2,'📿 Субханаллах'));h=createHandler(f.store,t.api);await h(message(3,'📿 Субханаллах'));await h(message(3,'📿 Субханаллах'));
    assert.equal(f.store.sync(7,[]).length,2);assert.equal(t.calls.filter(c=>c.method==='sendMessage').length,0);
    assert.ok(t.calls.filter(c=>c.method==='editMessageText').every(c=>c.body.message_id===90));assert.deepEqual(t.calls.filter(c=>c.method==='deleteMessage').map(c=>c.body.message_id),[2,3,3]);
  }finally{f.close();}
});
test('Missing counter panel is recreated once and reused',async()=>{
  const f=fixture(),t=transport();try{f.store.configure(7,{tasbihActive:true,keyboardZikr:'subhanallah',keyboardMessage:88,panelMessage:90});
    const h=createHandler(f.store,async(method,body)=>{if(method==='editMessageText'&&body.message_id===90)throw Object.assign(Error(),{code:400});return t.api(method,body);});
    await h(message(4,'📿 Субханаллах'));await h(message(5,'📿 Субханаллах'));assert.equal(t.calls.filter(c=>c.method==='sendMessage').length,1);assert.equal(f.store.sync(7,[]).length,2);
  }finally{f.close();}
});
test('Custom catalog sync is account private, immutable, idempotent and preserves new counts',()=>{
  const f=fixture();try{const events=[{id:'custom-event-01',zikr:custom.id,at}];f.store.sync(7,events,[custom]);f.store.sync(7,events,[custom]);
    assert.equal(f.store.sync(7,[]).length,1);assert.equal(f.store.customZikrs(7).length,1);assert.equal(f.store.customZikrs(8).length,0);
    assert.throws(()=>f.store.sync(8,events));assert.throws(()=>f.store.mergeZikrs(7,[{...custom,name:'Changed'}]));
    f.store.configure(7,{selected:custom.id,goal:7});assert.equal(f.store.profile(7).settings.goal,7);assert.throws(()=>f.store.configure(7,{goal:0}));
    f.store.db.close();f.store=createStore(f.dir);assert.equal(f.store.customZikrs(7)[0].name,custom.name);assert.equal(f.store.sync(7,[]).length,1);
  }finally{f.close();}
});
test('Bot accepts a custom dhikr, custom goal, and counts duplicate names for selected ID',async()=>{
  const f=fixture(),t=transport();try{const h=createHandler(f.store,t.api);await h(callback(1,'newzikr'));await h(message(2,'Субханаллах | | Мой текст'));const id=f.store.customZikrs(7)[0].id;
    await h(message(3,'📿 Субханаллах'));assert.equal(f.store.sync(7,[])[0].zikr,id);
    await h(callback(4,'customgoal'));await h(message(5,'17'));assert.equal(f.store.profile(7).settings.goal,17);
    await h(callback(6,'customgoal'));await h(message(7,'-1'));assert.equal(f.store.profile(7).settings.goal,17);await h(message(8,'/menu'));assert.equal(f.store.profile(7).settings.inputMode,'');
  }finally{f.close();}
});
test('Only configured admins can stage, preview, publish and remove a publication',async()=>{
  const f=fixture(),t=transport();let downloads=0;try{const h=createHandler(f.store,t.api,{adminIds:['7'],saveMedia:async()=>{downloads++;return '/media/11111111-1111-4111-8111-111111111111.mp4';}});
    await h(callback(1,'admin:new',8));await h(message(2,'fake',8,{video:{file_id:'private'}}));await h(callback(3,'admin:publish',8));assert.equal(downloads,0);assert.equal(f.store.content(),null);
    await h(callback(4,'admin:new'));await h(message(5,undefined,7,{animation:{file_id:'animation-file',file_size:10},caption:'Новость'}));assert.equal(downloads,1);assert.equal(f.store.content(),null);assert.ok(t.calls.some(c=>c.method==='sendAnimation'));
    await h(callback(6,'admin:publish'));assert.equal(f.store.content().text,'Новость');await h(callback(7,'admin:remove'));assert.ok(f.store.content());await h(callback(8,'admin:remove-confirm'));assert.equal(f.store.content(),null);
    await h(callback(9,'admin:new'));await h(message(10,'/menu'));await h(message(11,'обычное сообщение'));assert.equal(f.store.profile(7).settings.adminDraft,null);
  }finally{f.close();}
});
test('Media detection rejects HTML and recognizes GIF and MP4',()=>{
  assert.equal(mediaExtension(Buffer.from('GIF89atest')),'gif');assert.equal(mediaExtension(Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109])),'mp4');assert.throws(()=>mediaExtension(Buffer.from('<html>fake</html>')));
});
test('HTTP serves sanitized publications and media ranges, and merges custom dhikr across devices',async()=>{
  const f=fixture();const server=createAppServer(f.store,f.dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  try{const media='/media/11111111-1111-4111-8111-111111111111.mp4';mkdirSync(join(f.dir,'media'));writeFileSync(join(f.dir,media.slice(1)),Buffer.from('0123456789'));f.store.publish({id:'publication-id',text:'Hello',kind:'video',media,fileId:'SECRET_FILE_ID'});
    const feed=await (await fetch(base+'/api/content')).json();assert.equal(feed.content.text,'Hello');assert.equal(feed.content.fileId,undefined);
    const range=await fetch(base+media,{headers:{Range:'bytes=2-5'}});assert.equal(range.status,206);assert.equal(await range.text(),'2345');assert.equal((await fetch(base+media,{headers:{Range:'bytes=99-'}})).status,416);
    for(const path of ['/catalog.js','/publication.js','/app.js'])assert.equal((await fetch(base+path)).status,200);
    const token=f.store.redeem(f.store.code(7));const post=body=>fetch(base+'/api/sync',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const a=await post({events:[{id:'device-one-event',zikr:custom.id,at}],customZikrs:[custom]});assert.equal(a.status,200);const b=await (await post({events:[]})).json();assert.equal(b.customZikrs[0].name,custom.name);assert.equal(b.events.length,1);assert.equal(b.content.fileId,undefined);
  }finally{await new Promise(r=>server.close(r));f.close();}
});
test('Bot catalog paginates and statistics stay within Telegram text size',()=>{
  const f=fixture();try{for(let i=0;i<200;i++)f.store.mergeZikrs(7,[{...custom,id:'custom-'+String(i).padStart(8,'0')+'-1111-4111-8111-111111111111',name:'Длинное имя '.repeat(6)}]);
    assert.ok(screen(f.store,7,'stats').text.length<4096);assert.ok(screen(f.store,7,'choose').reply_markup.inline_keyboard.length<20);assert.ok(screen(f.store,7,'choose:12').reply_markup.inline_keyboard.some(row=>row.some(b=>b.callback_data==='newzikr')));
  }finally{f.close();}
});

test('Publication button is optional and appears only after both fields are set',async()=>{
  const f=fixture(),t=transport();try{const h=createHandler(f.store,t.api,{adminIds:['7']});
    await h(callback(1,'admin:new'));await h(message(2,'Новость'));assert.equal(publicContent(f.store.profile(7).settings.adminDraft).button,null);
    await h(callback(3,'admin:button'));await h(message(4,'Подробнее'));await h(message(5,'javascript:alert(1)'));assert.equal(f.store.profile(7).settings.adminAwait,'button-url');
    await h(message(6,'https://example.com/news?q=1'));assert.deepEqual(f.store.profile(7).settings.adminDraft.button,{text:'Подробнее',url:'https://example.com/news?q=1'});
    assert.ok(t.calls.at(-1).body.reply_markup.inline_keyboard.some(row=>row.some(b=>b.url==='https://example.com/news?q=1')));
    await h(callback(7,'admin:publish'));assert.equal(publicContent(f.store.content()).button.text,'Подробнее');
    await h(callback(8,'admin:edit'));await h(callback(9,'admin:no-button'));await h(callback(10,'admin:publish'));assert.equal(publicContent(f.store.content()).button,null);
    const last=[];await sendPublication(async(method,body)=>{last.push(body);},7,f.store.content());assert.equal(last[0].reply_markup,undefined);
    await h(callback(11,'admin:edit',8));assert.equal(f.store.profile(8).settings.adminDraft,undefined);
  }finally{f.close();}
});
test('Link validation rejects incomplete, executable and credential-bearing URLs',()=>{
  for(const value of [null,{}, {text:'',url:'https://example.com'},{text:'a',url:'javascript:alert(1)'},{text:'a',url:'file:///test'},{text:'a',url:'https://name:password@example.com'},{text:'a'.repeat(65),url:'https://example.com'}])assert.equal(publicationButton(value),null);
  assert.deepEqual(publicationButton({text:' Читать ',url:'https://example.com'}),{text:'Читать',url:'https://example.com/'});
});
test('Browser vibration is stronger at round end and cannot be cut short by next tap',()=>{
  const calls=[];let time=1000;const pulse=createHaptics({navigator:{vibrate:ms=>{calls.push(ms);return true;}},telegram:()=>null,now:()=>time});
  assert.equal(pulse(false),'browser');assert.equal(pulse(true),'browser');time+=200;assert.equal(pulse(false),'held');time+=120;assert.equal(pulse(false),'browser');assert.deepEqual(calls,[75,320,75]);
  assert.equal(createHaptics({navigator:{},telegram:()=>null})(false),'unavailable');assert.equal(createHaptics({navigator:{vibrate:()=>{throw Error();}},telegram:()=>null})(true),'unavailable');
});
test('Telegram Mini App uses native haptics with a distinct completion notification',()=>{
  const calls=[];const tg={platform:'android',isVersionAtLeast:()=>true,HapticFeedback:{impactOccurred:style=>calls.push(style),notificationOccurred:type=>calls.push(type)}};
  const pulse=createHaptics({navigator:{vibrate:()=>{throw Error('Should use Telegram');}},telegram:()=>tg});pulse(false);pulse(true);assert.deepEqual(calls,['medium','success']);
});

test('Keyboard owner stays after repeated taps and setup remains silent',async()=>{
  const f=fixture(),t=transport();try{const handle=createHandler(f.store,t.api);await handle(callback(41,'tasbih'));
    const setup=t.calls.find(c=>c.body.reply_markup?.keyboard);assert.equal(setup.body.disable_notification,true);assert.doesNotMatch(setup.body.text,/Кнопка зикра готова|управление/);
    const owner=f.store.profile(7).settings.keyboardMessage;assert.ok(owner);
    await handle(message(42,setup.body.reply_markup.keyboard[0][0].text));
    await handle(message(43,setup.body.reply_markup.keyboard[0][0].text));
    assert.equal(f.store.profile(7).settings.keyboardMessage,owner);
    assert.equal(t.calls.filter(c=>c.body.reply_markup?.keyboard).length,1);
    assert.ok(!t.calls.some(c=>c.method==='deleteMessage'&&c.body.message_id===owner));
  }finally{f.close();}
});
test('Counter entities use correct UTF-16 offsets without parsing user text as markup',()=>{
  const f=fixture();try{f.store.mergeZikrs(7,[{...custom,name:'📿 <b>Мой зикр</b>'}]);f.store.configure(7,{selected:custom.id});f.store.sync(7,[{id:'bold-test-event',zikr:custom.id,at}]);
    const panel=screen(f.store,7,'tasbih',new Date(at));assert.equal(panel.parse_mode,undefined);assert.ok(panel.text.includes('<b>Мой зикр</b>'));const segments=panel.entities.map(e=>panel.text.slice(e.offset,e.offset+e.length));assert.ok(segments.includes('1'));assert.ok(segments.includes('33'));assert.ok(panel.entities.every(e=>e.type==='bold'));
  }finally{f.close();}
});

test('Existing active practice repairs a missing reply keyboard owner',async()=>{
 const f=fixture(),t=transport();try{f.store.configure(7,{tasbihActive:true,keyboardZikr:'subhanallah',keyboardMessage:0});const handle=createHandler(f.store,t.api);await handle(callback(61,'tasbih'));assert.ok(f.store.profile(7).settings.keyboardMessage);assert.equal(t.calls.filter(c=>c.body.reply_markup?.keyboard).length,1);}finally{f.close();}
});

test('Deletion survives stale offline catalogs, preserves queued history, and is account private',()=>{
 const f=fixture();try{
  f.store.mergeZikrs(7,[custom]);f.store.configure(7,{selected:custom.id});
  f.store.deleteZikrs(7,[custom.id]);
  const events=f.store.sync(7,[{id:'offline-deleted-event',zikr:custom.id,at}],[custom],[]);
  assert.equal(events.length,1);assert.ok(!f.store.catalog(7).some(z=>z.id===custom.id));
  assert.notEqual(f.store.profile(7).settings.selected,custom.id);
  assert.deepEqual(f.store.deletedZikrs(8),[]);
  assert.throws(()=>f.store.deleteZikrs(7,['subhanallah']));
  assert.ok(f.store.catalog(7).some(z=>z.id==='subhanallah'));
 }finally{f.close();}
});
test('Bot cycle respects custom order and singleton selection; builtins cannot be deleted',async()=>{
 const f=fixture(),t=transport();try{const h=createHandler(f.store,t.api);
  const ids=f.store.catalog(7).map(z=>z.id);await h(callback(300,'only:'+ids[0]));await h(callback(301,'cycle:'+ids[2]));
  await h(callback(302,'up:'+ids[2]));assert.equal(f.store.catalog(7)[1].id,ids[2]);
  f.store.configure(7,{goal:1});f.store.botTap(7,{id:'ordered-cycle-tap',zikr:ids[0],at});assert.equal(f.store.profile(7).settings.selected,ids[2]);
  await h(callback(303,'only:'+ids[2]));f.store.botTap(7,{id:'singleton-cycle-tap',zikr:ids[2],at});assert.equal(f.store.profile(7).settings.selected,ids[2]);
  await h(callback(304,'remove:'+ids[2]));assert.ok(f.store.catalog(7).some(z=>z.id===ids[2]));
 }finally{f.close();}
});
test('HTTP sync distributes deletion markers without losing history',async()=>{
 const f=fixture(),server=createAppServer(f.store,f.dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
  const token=f.store.redeem(f.store.code(7)),url='http://127.0.0.1:'+server.address().port+'/api/sync';
  const post=body=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const r=await post({events:[{id:'deleted-api-event',zikr:custom.id,at}],customZikrs:[custom],deletedZikrs:[custom.id]});assert.equal(r.status,200);
  const next=await (await post({events:[],customZikrs:[custom]})).json();assert.deepEqual(next.deletedZikrs,[custom.id]);assert.equal(next.events.length,1);
 }finally{await new Promise(r=>server.close(r));f.close();}
});

test('Incremental APK sync returns new records without cross-account data or duplicate counts',()=>{
 const f=fixture();try{
  f.store.sync(7,[{id:'cursor-first-000',zikr:'subhanallah',at}]);const cursor=f.store.cursor(7);
  f.store.sync(8,[{id:'cursor-private-000',zikr:'subhanallah',at}]);
  f.store.sync(7,[{id:'cursor-second-000',zikr:'subhanallah',at}]);
  const delta=f.store.sync(7,[],[],[],cursor);assert.deepEqual(delta.map(e=>e.id),['cursor-second-000']);
  assert.equal(f.store.sync(7,delta).length,2);assert.equal(f.store.sync(7,[],[],[],f.store.cursor(7)).length,0);
  assert.throws(()=>f.store.sync(7,[],[],[],-1));
 }finally{f.close();}
});
