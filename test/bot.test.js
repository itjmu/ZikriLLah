import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
import {createHandler} from '../bot/handler.js';
import {report,rankRange} from '../bot/stats.js';
import {screen} from '../bot/ui.js';
const date=new Date('2026-09-27T12:00:00Z');
function fixture(){const dir=mkdtempSync(join(tmpdir(),'zikr-bot-'));const store=createStore(dir);return {store,close(){store.db.close();rmSync(dir,{recursive:true,force:true});}};}
const event=(id,at='2026-09-27T11:00:00Z',zikr='subhanallah')=>({id,at,zikr});
const callback=(updateId,data,user=7)=>({update_id:updateId,callback_query:{id:`query-${updateId}`,data,from:{id:user,first_name:'Тест'},message:{message_id:1,chat:{id:user,type:'private'}}}});
test('Bot taps are idempotent and auto-next is not repeated on retry',()=>{
  const f=fixture();try{f.store.profile(7);f.store.configure(7,{autoNext:true});
    f.store.sync(7,Array.from({length:32},(_,i)=>event(`offline-${i}`)));
    const tap=event('telegram-55');assert.equal(f.store.botTap(7,tap),true);assert.equal(f.store.profile(7).settings.selected,'alhamdulillah');
    assert.equal(f.store.botTap(7,tap),false);assert.equal(f.store.profile(7).settings.selected,'alhamdulillah');assert.equal(f.store.sync(7,[]).length,33);
  }finally{f.close();}
});
test('Rankings exclude private users and honor UTC period, ties and withdrawal',()=>{
  const f=fixture();try{
    f.store.profile(1,'Один');f.store.profile(2,'Два');f.store.profile(3,'Скрытый');
    for(const id of [1,2,3])f.store.sync(id,[event(`entry-${id}00`)]);
    f.store.sync(1,[event('yesterday-100','2026-09-26T23:00:00Z')]);
    f.store.participation(1,true);f.store.participation(2,true);
    const range=rankRange('day',date);const rank=f.store.ranking(range.since,range.until);assert.equal(rank.length,2);assert.equal(rank[0].count,1);
    const text=screen(f.store,1,'rank:day',date).text;assert.match(text,/1\. Один/);assert.match(text,/1\. Два/);assert.doesNotMatch(text,/Скрытый/);
    f.store.participation(1,false);assert.equal(f.store.ranking(range.since,range.until).length,1);assert.equal(f.store.sync(1,[]).length,2);
  }finally{f.close();}
});
test('Personal stats calculate local midnight, empty days and streak',()=>{
  const events=[event('a','2026-09-26T20:00:00Z'),event('b','2026-09-26T10:00:00Z'),event('c','2026-09-25T10:00:00Z')];
  const r=report(events,300,date);assert.equal(r.today,1);assert.equal(r.yesterday,1);assert.equal(r.streak,3);assert.equal(r.week.length,7);assert.equal(report(events,300,new Date('2026-10-01T12:00:00Z')).streak,0);
});
test('Callback routing acknowledges taps, edits panel, and persists real settings',async()=>{
  const f=fixture(),calls=[];try{
    const handle=createHandler(f.store,async(method,body)=>{calls.push({method,body});return {};},{now:()=>date});
    await handle(callback(100,'tap:subhanallah'));await handle(callback(100,'tap:subhanallah'));
    assert.equal(f.store.sync(7,[]).length,1);assert.equal(calls[0].method,'answerCallbackQuery');assert.ok(calls.some(c=>c.method==='editMessageText'));
    await handle(callback(101,'goal:99'));await handle(callback(102,'auto:1'));assert.equal(f.store.profile(7).settings.goal,99);assert.equal(f.store.profile(7).settings.autoNext,true);
    await handle(callback(103,'privacy'));assert.equal(f.store.profile(7).public,0);await handle(callback(104,'participate:1'));assert.equal(f.store.profile(7).public,1);
    await handle({update_id:105,message:{from:{id:7},chat:{id:7,type:'private'},text:'/daily 750'}});assert.equal(f.store.profile(7).settings.dailyGoal,750);
  }finally{f.close();}
});
test('Every displayed callback is handled without corrupting counters',async()=>{
  const f=fixture();try{
    const handle=createHandler(f.store,async()=>({}),{now:()=>date});let id=300;
    for(const page of ['home','tasbih','choose','goals','daily','timezone','settings','stats','privacy','rank:day','help']){
      const panel=screen(f.store,7,page,date);
      for(const row of panel.reply_markup.inline_keyboard)for(const b of row)if(b.callback_data)await handle(callback(id++,b.callback_data));
    }
    assert.equal(f.store.sync(7,[]).length,0);
  }finally{f.close();}
});
test('Messages in groups and callbacks from another user are ignored',async()=>{
  const f=fixture();try{let count=0;const handle=createHandler(f.store,async()=>{count++;});const update=callback(1,'tap:subhanallah');update.callback_query.from.id=8;await handle(update);update.callback_query.message.chat.type='group';await handle(update);assert.equal(count,0);assert.equal(f.store.sync(7,[]).length,0);}finally{f.close();}
});
test('Bottom keyboard contains one large dhikr key only during practice and is removed on exit',async()=>{
  const f=fixture(),calls=[];try{
    const handle=createHandler(f.store,async(method,body)=>{calls.push({method,body});return {};},{now:()=>date});
    await handle(callback(800,'tasbih'));
    const keyboard=calls.find(c=>c.body.reply_markup?.keyboard)?.body.reply_markup;
    assert.deepEqual(keyboard.keyboard,[[{text:'📿 Субханаллах'}]]);assert.equal(keyboard.resize_keyboard,false);
    const press={update_id:801,message:{from:{id:7},chat:{id:7,type:'private'},text:'📿 Субханаллах',date:Math.floor(date.getTime()/1000)}};
    await handle(press);await handle(press);assert.equal(f.store.sync(7,[]).length,1);
    await handle(callback(802,'home'));assert.ok(calls.some(c=>c.body.reply_markup?.remove_keyboard));assert.equal(f.store.profile(7).settings.tasbihActive,false);
    await handle({...press,update_id:803});assert.equal(f.store.sync(7,[]).length,1);
  }finally{f.close();}
});
test('Automatic next dhikr updates the bottom keyboard, settings hide it',async()=>{
  const f=fixture(),calls=[];try{
    f.store.configure(7,{autoNext:true});f.store.sync(7,Array.from({length:32},(_,i)=>event(`test-next-${i}`)));
    const handle=createHandler(f.store,async(method,body)=>{calls.push({method,body});return {};},{now:()=>date});
    await handle(callback(900,'tasbih'));await handle({update_id:901,message:{from:{id:7},chat:{id:7,type:'private'},text:'📿 Субханаллах',date:Math.floor(date.getTime()/1000)}});
    const keyboards=calls.filter(c=>c.body.reply_markup?.keyboard);assert.equal(keyboards.at(-1).body.reply_markup.keyboard[0][0].text,'📿 Альхамдулиллях');
    await handle(callback(902,'settings'));assert.ok(calls.some(c=>c.body.reply_markup?.remove_keyboard));
  }finally{f.close();}
});
