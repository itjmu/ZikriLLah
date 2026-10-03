import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
test('APK, web and bot converge for the same Telegram ID while another account stays isolated',()=>{
  const dir=mkdtempSync(join(tmpdir(),'zikr-three-')),store=createStore(dir);
  try{
    const user='12345';store.profile(user,'Test');
    const apk=store.token(user),web=store.token(user);
    const event=(id)=>({id,zikr:'subhanallah',at:new Date().toISOString()});
    const offline=[event('apk-offline-1'),event('apk-offline-2')];
    store.sync(store.user(apk),offline);store.sync(store.user(web),[event('web-event-1')]);
    store.botTap(user,event('telegram-event-1'));
    assert.equal(store.sync(store.user(apk),offline).length,4);
    assert.equal(store.sync(store.user(web),[]).length,4);
    assert.equal(store.sync(user,[]).length,4);
    assert.equal(store.sync('other',[]).length,0);
  }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Offline devices merge, retries do not duplicate, accounts stay isolated, data survives restart',()=>{
  const dir=mkdtempSync(join(tmpdir(),'zikrillah-'));let store=createStore(dir);
  try{
    const code=store.code('user1');const token=store.redeem(code);assert.equal(store.user(token),'user1');assert.equal(store.redeem(code),null);
    const a={id:'device-a-1',zikr:'subhanallah',at:new Date().toISOString()};const b={...a,id:'device-b-1'};
    store.sync('user1',[a]);assert.equal(store.sync('user1',[a,b]).length,2);assert.equal(store.sync('user2',[]).length,0);
    assert.throws(()=>store.sync('user1',[{...a,id:'invalid-1',zikr:'fake'}]));assert.equal(store.sync('user1',[]).length,2);
    store.db.close();store=createStore(dir);assert.equal(store.sync('user1',[]).length,2);assert.equal(store.user(token),'user1');
    const expired=store.code('user2');store.db.exec('UPDATE codes SET expires=0');assert.equal(store.redeem(expired),null);
  }finally{store.db.close();rmSync(dir,{recursive:true,force:true});}
});
