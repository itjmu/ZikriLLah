// Local-time daily reminders; persistent claims prevent duplicates after restart.
export function nextReminder(now,offset=300,minute=420){
 const local=new Date(now+offset*60000);local.setUTCHours(0,minute,0,0);
 let due=local.getTime()-offset*60000;if(due<=now)due+=86400000;return due;
}
export function createReminders(store,api,{now=()=>Date.now()}={}){
 const db=store.db;db.exec('CREATE TABLE IF NOT EXISTS daily_reminders(user TEXT PRIMARY KEY,due INTEGER NOT NULL)');let busy=false,refresh=0;
 return {async tick(){if(busy)return;busy=true;try{
 const clock=now();if(clock>=refresh){for(const {user} of db.prepare('SELECT user FROM profiles').all()){const s=store.profile(user).settings;db.prepare('INSERT OR IGNORE INTO daily_reminders VALUES(?,?)').run(user,nextReminder(clock,s.utcOffset,s.reminderMinute??420));}refresh=clock+60000;}
 const row=db.prepare('SELECT * FROM daily_reminders WHERE due<=? ORDER BY due LIMIT 1').get(clock);if(!row)return;
 const s=store.profile(row.user).settings;db.prepare('UPDATE daily_reminders SET due=? WHERE user=?').run(nextReminder(clock,s.utcOffset,s.reminderMinute??420),row.user);
 if(s.botReminder===false||clock-row.due>3600000)return;
 try{await api('sendMessage',{chat_id:row.user,text:'🔔 Время для зикра. Уделите несколько минут поминанию Аллаха.',reply_markup:{inline_keyboard:[[{text:'📿 Начать зикр',callback_data:'tasbih',style:'success'}],[{text:'⚙️ Напоминание',callback_data:'reminder'}]]}});}
 catch(e){if(e.code===429)db.prepare('UPDATE daily_reminders SET due=? WHERE user=?').run(clock+(Math.max(1,Number(e.retryAfter)||30)+1)*1000,row.user);}
 }finally{busy=false;}}};
}
