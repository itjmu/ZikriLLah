import {createReminders} from './reminders.js';
import {createAppServer} from '../server/index.js';
import {createBroadcasts} from './broadcasts.js';
import {createStore} from '../server/store.js';
import {createHandler} from './handler.js';
import {mediaSaver} from './media.js';
const token=process.env.BOT_TOKEN;
if(!token){console.error('Добавьте BOT_TOKEN в .env');process.exit(1);}
try{const identity=await api('getMe',{});process.env.BOT_USERNAME=identity.username;process.env.BOT_ID=String(identity.id);}catch{console.error('Telegram connection failed during startup. Check token and network.');process.exit(1);}
const store=createStore(process.env.DATA_DIR||'./data');
if(process.env.BOT_API_ENABLED!=='0'){const server=createAppServer(store,process.env.DATA_DIR||'./data');try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',resolve);});console.log('Бот + API: http://localhost:'+(process.env.PORT||3000));}catch(e){console.error(e.code==='EADDRINUSE'?'Порт API занят. Остановите старый сервер и запустите бот снова.':'API не запустился.');process.exit(1);}}
async function api(method,body){
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});
  const result=await response.json();
  if(!result.ok){const error=new Error('Telegram API request failed');error.code=result.error_code;error.description=result.description;error.retryAfter=result.parameters?.retry_after;throw error;}
  return result.result;
}
const handle=createHandler(store,api,{publicUrl:process.env.PUBLIC_URL||'',adminIds:(process.env.ADMIN_IDS||'').split(',').map(s=>s.trim()).filter(s=>/^\d+$/.test(s)),saveMedia:mediaSaver(api,token,process.env.DATA_DIR||'./data')});
const broadcastWorker=createBroadcasts(store,api,{adminIds:(process.env.ADMIN_IDS||'').split(',').map(s=>s.trim())});broadcastWorker.recover();setInterval(()=>broadcastWorker.tick().catch(()=>console.error('Рассылка: ошибка очереди, повтор проверки позже.')),1000);
const reminderWorker=createReminders(store,api);setInterval(()=>reminderWorker.tick().catch(()=>console.error("Daily reminder queue failed")),1000);
let offset=Number(store.db.prepare('SELECT value FROM meta WHERE key=?').get('bot_offset')?.value||0);
console.log('ZikriLLah bot v0.16 started');
while(true){
  try{
    for(const update of await api('getUpdates',{offset,timeout:25,allowed_updates:['message','callback_query']})){
      try{await handle(update);}catch(e){if(![400,403].includes(e.code))throw e;console.error(`Сообщение недоступно (Telegram ${e.code}); продолжаем.`);}
      offset=update.update_id+1;store.db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('bot_offset',String(offset));
    }
  }catch(e){const seconds=Math.max(5,Math.min(3600,Number(e.retryAfter)||5));console.error(`Бот: соединение недоступно или лимит Telegram. Повтор через ${seconds} с.`);await new Promise(r=>setTimeout(r,seconds*1000));}
}
