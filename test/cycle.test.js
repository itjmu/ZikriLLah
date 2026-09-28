import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderedCatalog,cycleIds,nextInCycle} from '../web/model.js';
test('Cycle uses displayed order, skips removed entries and wraps a single selection',()=>{
 const catalog=[{id:'a'},{id:'b'},{id:'custom-c'}],ordered=orderedCatalog(catalog,['b','custom-c','a'],['custom-c']);
 assert.deepEqual(ordered.map(z=>z.id),['b','a']);
 assert.equal(nextInCycle(ordered,['a','b'],'b'),'a');
 assert.equal(nextInCycle(ordered,['a'],'a'),'a');
 assert.deepEqual(cycleIds(ordered,['custom-c']),['b']);
 assert.equal(nextInCycle(ordered,['a'],'missing'),'a');
});
