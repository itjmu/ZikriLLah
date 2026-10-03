import {randomUUID} from 'node:crypto';
const markup=rows=>({inline_keyboard:rows.map(row=>row.map(([text,callback_data])=>({text,callback_data})))});
export function createBroadcasts(store,api,{adminIds=[],now=()=>Date.now()}={}){
 const admins=new Set(adminIds.map(String)),db=store.db;
 db.exec("CREATE TABLE IF NOT EXISTS broadcasts(id TEXT PRIMARY KEY,admin TEXT,source TEXT,messages TEXT,status TEXT,next_at INTEGER DEFAULT 0);CREATE TABLE IF NOT EXISTS broadcast_deliveries(job TEXT,user TEXT,status TEXT DEFAULT 'pending',PRIMARY KEY(job,user));");
 const set=(id,patch)=>store.configure(id,patch);
 const summary=id=>db.prepare('SELECT status,COUNT(*) AS n FROM broadcast_deliveries WHERE job=? GROUP BY status').all(id).map(r=>({pending:'В очереди',sending:'Отправляется',sent:'Доставлено',failed:'Не доставлено',uncertain:'Результат неизвестен',partial:'Частично'}[r.status]+': '+r.n)).join('\n');
 async function handle(update){
  const q=update.callback_query,m=q?.message||update.message,from=q?.from||m?.from;
  if(!m||m.chat?.type!=='private'||String(m.chat.id)!==String(from?.id))return false;
  const action=q?.data||'',s=store.profile(from.id).settings;
  if(q&&!action.startsWith('admin:b:')&&s.broadcastDraft){set(from.id,{broadcastDraft:null});return false;}
  if(!action.startsWith('admin:b:')&&!(s.broadcastDraft&&!q))return false;
  const send=body=>api('sendMessage',{chat_id:m.chat.id,...body});
  if(q)await api('answerCallbackQuery',{callback_query_id:q.id}).catch(()=>{});
  if(!admins.has(String(from.id))){await send({text:'Нет доступа к рассылке.'});return true;}
  const command=(m.text||'').split(/\s/)[0];
  if(!q&&['/admin','/cancel','/menu','/start'].includes(command)){set(from.id,{broadcastDraft:null});return false;}
  if(action==='admin:b:list'){
   const jobs=db.prepare('SELECT id,status FROM broadcasts WHERE admin=? ORDER BY rowid DESC LIMIT 5').all(String(from.id));
   await send({text:'Рассылки · последние отправки',reply_markup:markup([[['＋ Новая рассылка','admin:b:new']],...jobs.map(j=>[[j.id.slice(0,8)+' · '+j.status,'admin:b:status:'+j.id]]),[['← Админ-панель','admin:home']]])});return true;
  }
  if(action==='admin:b:new'){
   set(from.id,{adminAwait:false,adminDraft:null,broadcastDraft:{id:randomUUID(),ids:[],preview:null}});
   await send({text:'Отправьте или перешлите одно сообщение, альбом либо несколько сообщений (до 100). Оформление текста и подписи сохранятся. Затем нажмите «Предпросмотр». Рассылка начнётся только после подтверждения.',reply_markup:markup([[['Предпросмотр','admin:b:preview']],[['Отмена','admin:b:cancel']]])});return true;
  }
  if(action==='admin:b:cancel'){set(from.id,{broadcastDraft:null});await send({text:'Черновик рассылки отменён.'});return true;}
  if(action.startsWith('admin:b:status:')||action.startsWith('admin:b:stop:')){
   const id=action.split(':')[3],job=db.prepare('SELECT * FROM broadcasts WHERE id=? AND admin=?').get(id,String(from.id));
   if(!job){await send({text:'Рассылка не найдена.'});return true;}
   if(action.startsWith('admin:b:stop:'))db.prepare("UPDATE broadcasts SET status='cancelled' WHERE id=? AND status='running'").run(id);
   const status=db.prepare('SELECT status FROM broadcasts WHERE id=?').get(id).status;
   await send({text:'Рассылка: '+({running:'выполняется',done:'завершена',cancelled:'остановлена'}[status]||status)+'\n'+summary(id),reply_markup:markup([[['Обновить','admin:b:status:'+id]],...(status==='running'?[[['Остановить','admin:b:stop:'+id]]]:[])])});return true;
  }
  const draft=s.broadcastDraft;
  if(action.startsWith('admin:b:send:')){
   if(!draft?.preview||action.split(':')[3]!==draft.id){await send({text:'Этот предпросмотр устарел. Создайте новый.'});return true;}
   db.exec('BEGIN IMMEDIATE');try{
    const inserted=db.prepare("INSERT OR IGNORE INTO broadcasts(id,admin,source,messages,status) VALUES(?,?,?,?,'running')").run(draft.id,String(from.id),String(m.chat.id),JSON.stringify(draft.preview)).changes;
    if(inserted){db.prepare("INSERT OR IGNORE INTO broadcast_deliveries(job,user) SELECT ?,user FROM profiles").run(draft.id);db.prepare('INSERT OR IGNORE INTO broadcast_feed VALUES(?,?)').run(draft.id,JSON.stringify({at:now(),text:(draft.summaries||['Новая рассылка в Telegram']).join('\n\n').slice(0,16000),telegramOnly:true}));}
    set(from.id,{broadcastDraft:null});db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   await send({text:'Рассылка поставлена в очередь.\n'+summary(draft.id),reply_markup:markup([[['Статус','admin:b:status:'+draft.id],['Остановить','admin:b:stop:'+draft.id]]])});return true;
  }
  if(!draft){await send({text:'Сначала создайте рассылку в /admin.'});return true;}
  if(action==='admin:b:preview'){
   if(!draft.ids.length){await send({text:'Сначала отправьте содержимое рассылки.'});return true;}
   try{
    const copies=await api('copyMessages',{chat_id:m.chat.id,from_chat_id:m.chat.id,message_ids:[...draft.ids].sort((a,b)=>a-b)});
    if(copies.length!==draft.ids.length)throw Error('Unsupported messages');
    const next={...draft,id:randomUUID(),preview:copies.map(r=>r.message_id)};set(from.id,{broadcastDraft:next});
    const count=db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
    await send({text:'Предпросмотр выше. Сообщений: '+copies.length+'. Получателей сейчас: '+count+'. Отправить всем пользователям бота? Текст и подписи также появятся в подключённых APK и вебе; оригиналы и медиа останутся в Telegram.',reply_markup:markup([[['Отправить всем','admin:b:send:'+next.id]],[['Отмена','admin:b:cancel']]])});
   }catch{set(from.id,{broadcastDraft:{...draft,preview:null}});await send({text:'Telegram не разрешил скопировать всё содержимое. Защищённые/служебные сообщения, счета, платные медиа и розыгрыши могут быть недоступны. Создайте новый черновик с обычными сообщениями.',reply_markup:markup([[['Новый черновик','admin:b:new']],[['Отмена','admin:b:cancel']]])});}
   return true;
  }
  if(!q){
   if(m.has_protected_content||m.invoice||m.paid_media||m.giveaway||m.giveaway_winners||!['text','photo','video','animation','audio','voice','video_note','document','sticker','contact','location','venue','poll','dice','game'].some(key=>m[key])){await send({text:'Этот тип сообщения нельзя использовать в рассылке.'});return true;}
   if(draft.ids.includes(m.message_id))return true;
   if(draft.ids.length>=100){await send({text:'Лимит черновика — 100 сообщений.'});return true;}
   set(from.id,{broadcastDraft:{...draft,ids:[...draft.ids,m.message_id],summaries:[...(draft.summaries||[]),(m.text||m.caption||"Медиа / сообщение — открыть в Telegram").slice(0,2000)],preview:null}});
   // Album parts arrive separately; the explicit Preview button finalizes the collection.
   if(!m.media_group_id)await send({text:'Добавлено в черновик: '+(draft.ids.length+1),reply_markup:markup([[['Предпросмотр','admin:b:preview']],[['Отмена','admin:b:cancel']]])});
   return true;
  }
  return true;
 }
 let busy=false;
 async function tick(){
  if(busy||Number(db.prepare('SELECT value FROM meta WHERE key=?').get('broadcast_next_at')?.value||0)>now())return;busy=true;
  try{
   const job=db.prepare("SELECT * FROM broadcasts WHERE status='running' AND next_at<=? ORDER BY rowid LIMIT 1").get(now());if(!job)return;
   const row=db.prepare("SELECT user FROM broadcast_deliveries WHERE job=? AND status='pending' ORDER BY rowid LIMIT 1").get(job.id);
   if(!row){db.prepare("UPDATE broadcasts SET status='done' WHERE id=?").run(job.id);await api('sendMessage',{chat_id:job.admin,text:'Рассылка завершена.\n'+summary(job.id)}).catch(()=>{});return;}
   const ids=JSON.parse(job.messages);
   db.prepare("UPDATE broadcast_deliveries SET status='sending' WHERE job=? AND user=?").run(job.id,row.user);
   db.prepare('UPDATE broadcasts SET next_at=? WHERE id=?').run(now()+Math.max(1000,ids.length*80),job.id);
   db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('broadcast_next_at',String(now()+Math.max(1000,ids.length*80)));
   let status='sent';
   try{const result=await api('copyMessages',{chat_id:row.user,from_chat_id:job.source,message_ids:ids});if(result.length!==ids.length)status='partial';}
   catch(e){if(e.code===429){status='pending';db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('broadcast_next_at',String(now()+(Math.max(1,Number(e.retryAfter)||30)+1)*1000));db.prepare('UPDATE broadcasts SET next_at=? WHERE id=?').run(now()+(Math.max(1,Number(e.retryAfter)||30)+1)*1000,job.id);}else status=[400,403].includes(e.code)?'failed':'uncertain';}
   db.prepare('UPDATE broadcast_deliveries SET status=? WHERE job=? AND user=?').run(status,job.id,row.user);
  }finally{busy=false;}
 }
 function recover(){db.prepare("UPDATE broadcast_deliveries SET status='uncertain' WHERE status='sending'").run();}
 return {handle,tick,recover};
}
