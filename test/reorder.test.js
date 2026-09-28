import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enableReorder} from '../web/reorder.js';
const classes=()=>({add(){},remove(){}});
function fixture(ids=['a','b']){
 const commits=[],listeners={},drawer={scrollTop:0,getBoundingClientRect:()=>({top:0,bottom:600})};
 const group=top=>({children:[],getBoundingClientRect:()=>({top,bottom:top+150}),querySelectorAll(){return this.children;},replaceChildren(...children){for(const row of this.children)row.parentElement=null;this.children=[];for(const row of children)this.insertBefore(row,null);},insertBefore(row,before){if(row.parentElement){const old=row.parentElement.children;old.splice(old.indexOf(row),1);}let i=this.children.indexOf(before);if(i<0)i=this.children.length;this.children.splice(i,0,row);row.parentElement=this;}});
 const top=group(0),bottom=group(200);
 const rows=ids.map(id=>{const row={dataset:{rowId:id},classList:classes(),getBoundingClientRect(){return {top:this.parentElement.getBoundingClientRect().top+this.parentElement.children.indexOf(this)*40,height:40};}};row.grip={closest:()=>row,setPointerCapture(){},releasePointerCapture(){}};top.insertBefore(row,null);return row;});
 const root={classList:classes(),querySelectorAll:()=>[top,bottom],closest:()=>drawer,addEventListener:(type,fn)=>listeners[type]=fn};
 enableReorder(root,(...args)=>commits.push(args));
 const down=row=>listeners.pointerdown({target:{closest:()=>row.grip},button:0,pointerId:1,clientX:10,clientY:20});
 const move=y=>listeners.pointermove({pointerId:1,clientX:10,clientY:y,preventDefault(){}});
 return {commits,listeners,top,bottom,rows,down,move};
}
test('Long hold moves a dhikr below the divider and commits remaining cycle order',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.down(f.rows[0]);t.mock.timers.tick(350);f.move(250);f.listeners.pointerup();assert.deepEqual(f.commits,[[['b','a'],['b']]]);
});
test('Short taps and movement before the hold do not reorder',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.down(f.rows[0]);f.listeners.pointerup();assert.equal(f.commits.length,0);f.down(f.rows[0]);f.move(100);t.mock.timers.tick(500);f.listeners.pointerup();assert.deepEqual(f.top.children.map(r=>r.dataset.rowId),['a','b']);assert.equal(f.commits.length,0);
});
test('Cancelled drags restore the order and the last selected dhikr cannot leave the cycle',t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval']});const f=fixture();f.down(f.rows[0]);t.mock.timers.tick(350);f.move(250);f.listeners.pointercancel();assert.deepEqual(f.top.children.map(r=>r.dataset.rowId),['a','b']);assert.equal(f.commits.length,0);
 const single=fixture(['a']);single.down(single.rows[0]);t.mock.timers.tick(350);single.move(250);single.listeners.pointerup();assert.equal(single.top.children.length,1);assert.equal(single.commits.length,0);
});
