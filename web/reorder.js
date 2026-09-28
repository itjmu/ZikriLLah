// Hold the grip to move between groups. The rest of the list remains scrollable.
export function enableReorder(root,commit){
 let drag=null;
 const groups=()=>[...root.querySelectorAll('.zikr-group')];
 function restore(){if(!drag)return;for(const [group,children] of drag.snapshot)group.replaceChildren(...children);}
 function finish(cancel=false){
  if(!drag)return;clearTimeout(drag.timer);clearInterval(drag.scrollTimer);const current=drag;drag=null;
  try{if(current.grip.hasPointerCapture?.(current.pointer))current.grip.releasePointerCapture(current.pointer);}catch{}
  current.row.classList.remove('dragging');root.classList.remove('reordering');
  if(!current.active)return;
  const [selected,rest]=groups().map(group=>[...group.querySelectorAll('[data-row-id]')].map(row=>row.dataset.rowId));
  if(cancel||!selected.length){for(const [group,children] of current.snapshot)group.replaceChildren(...children);return;}
  commit([...selected,...rest],selected);
 }
 root.addEventListener('pointerdown',e=>{
  const grip=e.target.closest('.drag-grip');if(!grip||e.button!==0||drag)return;
  const row=grip.closest('[data-row-id]');
  drag={row,grip,pointer:e.pointerId,x:e.clientX,y:e.clientY,active:false,snapshot:groups().map(group=>[group,[...group.children]])};
  grip.setPointerCapture(e.pointerId);
  drag.timer=setTimeout(()=>{if(!drag)return;drag.active=true;row.classList.add('dragging');root.classList.add('reordering');drag.scrollTimer=setInterval(()=>{if(!drag)return;const drawer=root.closest('dialog'),r=drawer.getBoundingClientRect();if(drag.y<r.top+90)drawer.scrollTop-=14;else if(drag.y>r.bottom-90)drawer.scrollTop+=14;},40);},350);
 });
 root.addEventListener('pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  if(!drag.active){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>12)finish(true);return;}
  e.preventDefault();drag.y=e.clientY;
  const group=groups().find(group=>{const r=group.getBoundingClientRect();return e.clientY>=r.top&&e.clientY<=r.bottom;});
  if(group){const before=[...group.querySelectorAll('[data-row-id]')].find(row=>row!==drag.row&&e.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);group.insertBefore(drag.row,before||null);}
  const drawer=root.closest('dialog'),r=drawer.getBoundingClientRect();if(e.clientY<r.top+90)drawer.scrollTop-=18;if(e.clientY>r.bottom-90)drawer.scrollTop+=18;
 });
 root.addEventListener('pointerup',()=>finish());
 root.addEventListener('pointercancel',()=>finish(true));
 root.addEventListener('lostpointercapture',()=>finish(true));
 root.addEventListener('contextmenu',e=>{if(e.target.closest('.drag-grip'))e.preventDefault();});
 root.addEventListener('keydown',e=>{
  if(!e.target.matches('.drag-grip')||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.key))return;
  if(e.key==='Escape'){finish(true);return;}e.preventDefault();
  const row=e.target.closest('[data-row-id]'),[top,bottom]=groups(),group=row.parentElement;
  if(e.key==='ArrowUp'&&row.previousElementSibling)group.insertBefore(row,row.previousElementSibling);
  if(e.key==='ArrowDown'&&row.nextElementSibling)group.insertBefore(row.nextElementSibling,row);
  if(e.key==='ArrowLeft')top.append(row);
  if(e.key==='ArrowRight'&&(group!==top||top.children.length>1))bottom.append(row);
  const chosen=[...top.children].map(r=>r.dataset.rowId),order=[...top.children,...bottom.children].map(r=>r.dataset.rowId);commit(order,chosen);
 });
}
