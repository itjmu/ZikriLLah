import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../server/store.js';
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
