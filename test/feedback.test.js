import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feedbackPolicy,weekCounts} from '../web/model.js';
test('Sound and vibration are independent, stealth only vibrates on completion, silence wins',()=>{
 assert.deepEqual(feedbackPolicy({soundEnabled:true,vibrationEnabled:false}),{sound:true,vibrate:false});
 assert.deepEqual(feedbackPolicy({soundEnabled:false,vibrationEnabled:true}),{sound:false,vibrate:true});
 assert.deepEqual(feedbackPolicy({stealth:true},false),{sound:false,vibrate:false});
 assert.deepEqual(feedbackPolicy({stealth:true},true),{sound:false,vibrate:true});
 assert.deepEqual(feedbackPolicy({silent:true,stealth:true},true),{sound:false,vibrate:false});
});
test('Seven-day count graph includes empty days and ignores older history',()=>{
 const now=new Date(2026,8,28,12),at=days=>{const d=new Date(now);d.setDate(d.getDate()-days);return d.toISOString();};
 const week=weekCounts([{at:at(0)},{at:at(0)},{at:at(2)},{at:at(7)}],now);
 assert.deepEqual(week.map(d=>d.count),[0,0,0,0,1,0,2]);
});
