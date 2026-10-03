import {nextReminder} from './reminders.js';
import {createAppAdmin} from './app-admin.js';
import {createBroadcasts} from './broadcasts.js';
import {cycleIds} from '../web/model.js';
import {screen,zikrKeyboard} from './ui.js';
import {randomUUID} from 'node:crypto';
import {createPublications} from './publications.js';

/** Transport is injected so all buttons can be tested without messaging real users. */
export function createHandler(store,transport,{publicUrl='',now=()=>new Date(),adminIds=[],saveMedia}={}){
  const api=async(method,body)=>{const result=await transport(method,body);if(body.chat_id&&method.startsWith('send')){const ids=(Array.isArray(result)?result:[result]).map(r=>r?.message_id).filter(Number.isInteger);if(ids.length){const old=store.profile(body.chat_id).settings.botMessages||[];store.configure(body.chat_id,{botMessages:[...new Set([...old,...ids])].slice(-100)});}}return result;};
  const appAdmin=createAppAdmin(store,api,{adminIds,saveMedia});
  const broadcasts=createBroadcasts(store,api,{adminIds});
  const publications=createPublications(store,api,{adminIds,saveMedia});
  return async update=>{
    const query=update.callback_query,m=query?.message||update.message,from=query?.from||m?.from;
    if(!m||m.chat?.type!=='private'||!from||String(m.chat.id)!==String(from.id))return;
    store.profile(from.id,from.first_name);
    const freshStart=!query&&/^\/start(?:@[a-zA-Z0-9_]+)?(?:\s|$)/.test(m.text||'');
    if(freshStart){const s=store.profile(from.id).settings;const ids=[...new Set([...(s.botMessages||[]),s.panelMessage,s.keyboardMessage,s.newsMessage].filter(id=>Number.isInteger(id)&&id>0))];for(let i=0;i<ids.length;i+=100)await api('deleteMessages',{chat_id:m.chat.id,message_ids:ids.slice(i,i+100)}).catch(()=>{});store.configure(from.id,{botMessages:[],panelMessage:0,newsMessage:0});}
    const connect=!query&&/^\/start(?:@[a-zA-Z0-9_]+)? connect_([a-f0-9]{24})$/.exec(m.text||'');
    if(connect){const ok=store.approveDevice(connect[1],from.id);await api('sendMessage',{chat_id:m.chat.id,text:ok?'✓ Устройство подключено. Вернитесь в ZikriLLah — прогресс синхронизируется.':'Ссылка уже использована или истекла. Повторите подключение из приложения.'});}
    const oldOffset=store.profile(from.id).settings.utcOffset;
    let zikrs=store.catalog(from.id);
    let page='home',forceClear=false,isTap=false;
    const send=body=>api('sendMessage',{chat_id:m.chat.id,...body});
    const remove=async id=>{if(id)await api('deleteMessage',{chat_id:m.chat.id,message_id:id}).catch(()=>{});};
    const clearKeyboard=async()=>{const old=store.profile(from.id).settings.keyboardMessage;const result=await send({text:'Прогресс сохранён.',reply_markup:{remove_keyboard:true}});store.configure(from.id,{tasbihActive:false,keyboardZikr:'',keyboardMessage:0});await remove(old);await remove(result?.message_id);};
    if(await appAdmin(update))return;
    if(await broadcasts.handle(update))return;
    if((query&&!query.data?.startsWith('admin:'))||(!query&&m.text?.startsWith('/')&&!m.text.startsWith('/admin')))store.configure(from.id,{adminAwait:false,adminDraft:null});
    if(await publications(update)){if(store.profile(from.id).settings.tasbihActive)await clearKeyboard();return;}
    if(query){
      // Always remove Telegram's progress indicator, even for an expired/stale button.
      await api('answerCallbackQuery',{callback_query_id:query.id}).catch(()=>{});
      const data=query.data||'';
      store.configure(from.id,{inputMode:''});
      if(data==='newzikr'||data==='customgoal'){store.configure(from.id,{inputMode:data});if(store.profile(from.id).settings.tasbihActive)await clearKeyboard();await send({text:data==='newzikr'?'Отправьте свой зикр: название | арабский текст (необязательно) | перевод (необязательно). Название до 80 знаков, текст и перевод до 500. Для отмены /menu.':'Отправьте число повторений в круге от 1 до 100000. Для отмены /menu.'});return;}
      const [action,value]=data.split(':');
      if(action==='tap'&&zikrs.some(z=>z.id===value)){store.botTap(from.id,{id:`telegram-${update.update_id}`,zikr:value,at:now().toISOString()});page='tasbih';}
      else if(action==='select'&&zikrs.some(z=>z.id===value)){store.configure(from.id,{selected:value});page='tasbih';}
      else if(['manage','delete','remove','cycle','only','up','down'].includes(action)&&zikrs.some(z=>z.id===value)){
 const settings=store.profile(from.id).settings;
 if(action==='only')store.configure(from.id,{cycleZikrs:[value],selected:value,autoNext:true});
 if(action==='cycle'){const chosen=cycleIds(zikrs,settings.cycleZikrs??null);if(chosen.includes(value)){if(chosen.length>1)chosen.splice(chosen.indexOf(value),1);}else chosen.push(value);store.configure(from.id,{cycleZikrs:chosen,autoNext:true,selected:chosen.includes(settings.selected)?settings.selected:chosen[0]});}
 if(action==='up'||action==='down'){const order=zikrs.map(z=>z.id),index=order.indexOf(value),target=index+(action==='up'?-1:1);if(target>=0&&target<order.length){[order[index],order[target]]=[order[target],order[index]];store.configure(from.id,{zikrOrder:order});}}
 if(action==='remove'&&value.startsWith('custom-')){store.deleteZikrs(from.id,[value]);page='choose';}else page=(action==='delete'&&value.startsWith('custom-')?'delete:':'manage:')+value;
 zikrs=store.catalog(from.id);
 }
 else if(action==='goal'&&[33,99,100,1000].includes(Number(value))){store.configure(from.id,{goal:Number(value)});page='tasbih';}
      else if(action==='daily'&&[100,300,900,1000].includes(Number(value))){store.configure(from.id,{dailyGoal:Number(value)});page='settings';}
      else if(action==='zone'&&[0,180,300,360].includes(Number(value))){store.configure(from.id,{utcOffset:Number(value)});page='settings';}
      else if(['auto','text','participate'].includes(action)&&['0','1'].includes(value)){
        if(action==='participate')store.participation(from.id,value==='1');else store.configure(from.id,{[action==='auto'?'autoNext':'showText']:value==='1'});page=action==='participate'?'privacy':'settings';
      }else if(/^choose:\d{1,3}$/.test(data))page=data;
      else if(action==='remind'&&['on','off','420','720','1320'].includes(value)){store.configure(from.id,value==='on'||value==='off'?{botReminder:value==='on'}:{reminderMinute:Number(value),botReminder:true});const rs=store.profile(from.id).settings;store.db.exec('CREATE TABLE IF NOT EXISTS daily_reminders(user TEXT PRIMARY KEY,due INTEGER NOT NULL)');store.db.prepare('INSERT OR REPLACE INTO daily_reminders VALUES(?,?)').run(String(from.id),nextReminder(now().getTime(),rs.utcOffset,rs.reminderMinute??420));page='reminder';}
      else if(['reminder','home','tasbih','choose','goals','daily','timezone','settings','stats','help','privacy','link','rank:day','rank:week','rank:all'].includes(data))page=data;
      else page='help';
    }else{
      if(!m.text)return;
      const text=m.text.trim(),[raw,arg]=text.split(/\s+/),command=raw.split('@')[0].toLowerCase();
      const mode=store.profile(from.id).settings.inputMode;
      if(mode&&!text.startsWith('/')){
        if(mode==='customgoal'){const goal=Number(text);if(!Number.isInteger(goal)||goal<1||goal>100000){await send({text:'Введите целое число от 1 до 100000.'});return;}store.configure(from.id,{goal,inputMode:''});page='tasbih';}
        else {const parts=text.split('|').map(p=>p.trim());try{if(parts.length>3)throw Error();const id='custom-'+randomUUID();store.mergeZikrs(from.id,[{id,name:parts[0],arabic:parts[1]||'',meaning:parts[2]||''}]);store.configure(from.id,{selected:id,inputMode:''});zikrs=store.catalog(from.id);page='tasbih';}catch{await send({text:'Не удалось добавить. Проверьте длину полей (80/500/500) и лимит 200 своих зикров.'});return;}}
      }else if(text.startsWith('/'))store.configure(from.id,{inputMode:''});
      const names={'📿 Тасбих':'tasbih','📊 Моя статистика':'stats','🏆 Рейтинг':'rank:day','⚙️ Настройки':'settings','🔗 Подключить устройство':'link','❔ Помощь':'help'};
      if(!mode||text.startsWith('/'))page=names[text]||({'/start':'home','/menu':'home','/stop':'home','/exit':'home','/stats':'stats','/rating':'rank:day','/settings':'settings','/link':'link','/help':'help','/tasbih':'tasbih'}[command])||'help';
      const zikr=zikrs.find(z=>`/${z.id}`===command);
      if(zikr){store.botTap(from.id,{id:`telegram-${update.update_id}`,zikr:zikr.id,at:new Date(m.date*1000).toISOString()});page='tasbih';}
      const keyboardZikr=store.profile(from.id).settings.keyboardZikr;
      const bottomZikr=(text==='📿 +1'?zikrs.find(z=>z.id===keyboardZikr):null)||zikrs.find(z=>z.id===keyboardZikr&&text===`📿 ${z.name}`)||zikrs.find(z=>text===`📿 ${z.name}`);
      if(bottomZikr){isTap=true;
        if(store.profile(from.id).settings.tasbihActive){store.botTap(from.id,{id:`telegram-${update.update_id}`,zikr:bottomZikr.id,at:new Date(m.date*1000).toISOString()});page='tasbih';}
        else{page='home';forceClear=true;}
      }
      if(command==='/daily'){
        const value=Number(arg);if(!Number.isInteger(value)||value<1||value>100000){await send({text:'Введите целое число: /daily 750 (от 1 до 100000)'});return;}
        store.configure(from.id,{dailyGoal:value});page='settings';
      }
      if(command==='/timezone'){
        const match=/^([+-])(\d{1,2})(?::([0-5]\d))?$/.exec(arg||'');const offset=match?(Number(match[2])*60+Number(match[3]||0))*(match[1]==='-'?-1:1):NaN;
        if(!Number.isInteger(offset)||offset < -720||offset>840){await send({text:'Укажите смещение: /timezone +5 или /timezone +5:30 (от −12 до +14)'});return;}
        store.configure(from.id,{utcOffset:offset});page='settings';
      }
      if(['/start','/menu','/stop','/exit'].includes(command))forceClear=true;
    }
    const settings=store.profile(from.id).settings;
    if(settings.utcOffset!==oldOffset){store.db.exec('CREATE TABLE IF NOT EXISTS daily_reminders(user TEXT PRIMARY KEY,due INTEGER NOT NULL)');store.db.prepare('INSERT OR REPLACE INTO daily_reminders VALUES(?,?)').run(String(from.id),nextReminder(now().getTime(),settings.utcOffset,settings.reminderMinute??420));}
    if(page==='tasbih'){
      if(!settings.tasbihActive||settings.keyboardZikr!==settings.selected||(settings.keyboardShowText??true)!==settings.showText||!settings.keyboardMessage){
        const oldKeyboard=settings.keyboardMessage;
        const keyboard=await send({text:settings.showText?'📿 '+zikrs.find(z=>z.id===settings.selected).name:'📿 +1',disable_notification:true,reply_markup:zikrKeyboard(settings.selected,zikrs,settings.showText)});
        store.configure(from.id,{tasbihActive:true,keyboardShowText:settings.showText,keyboardZikr:settings.selected,keyboardMessage:keyboard?.message_id||0});await remove(oldKeyboard);
      }
    }else if(settings.tasbihActive||forceClear){
      await clearKeyboard();
    }
    if(page==='link'){
      await send({text:`🔗 Подключить устройство\n\n${store.code(from.id)}\n\nКод действует 10 минут, один раз. Введите его в меню Android или веб-приложения. Не передавайте код другим людям. После привязки прогресс объединяется автоматически.`});return;
    }
    if(isTap)await remove(m.message_id);
    const body=screen(store,from.id,page,now(),publicUrl);
    if(adminIds.map(String).includes(String(from.id))&&page==='home')body.reply_markup.inline_keyboard.push([{text:'⚙ Админ-панель',callback_data:'admin:home'}]);
    const panelId=freshStart?0:query?.message.message_id||store.profile(from.id).settings.panelMessage;
    if(panelId){
      try{await api('editMessageText',{chat_id:m.chat.id,message_id:panelId,...body});store.configure(from.id,{panelMessage:panelId});return;}
      catch(e){if(e.description?.includes('message is not modified'))return;if(e.code!==400)throw e;}
    }
    const result=await send(body);if(result?.message_id)store.configure(from.id,{panelMessage:result.message_id});
  };
}
