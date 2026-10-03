import {randomUUID} from 'node:crypto';
import {readExperience,saveExperience,themeFromText,builtInThemes,validBackground} from '../server/experience.js';
const keyboard=rows=>({inline_keyboard:rows.map(row=>row.map(([text,callback_data])=>({text,callback_data})))});
export function createAppAdmin(store,api,{adminIds=[],saveMedia,now=()=>Date.now()}={}){
 const admins=new Set(adminIds.map(String));
 return async update=>{
  const q=update.callback_query,m=q?.message||update.message,from=q?.from||m?.from;if(!m||m.chat?.type!=='private'||String(from?.id)!==String(m.chat.id))return false;
  const action=q?.data||'',settings=store.profile(from.id).settings;
  if(q&&!action.startsWith('admin:app:')&&settings.appAwait){store.configure(from.id,{appAwait:null,appDraft:null});return false;}
  if(!q&&/^\/(admin|start|menu|cancel)(\s|$)/.test(m.text||'')){store.configure(from.id,{appAwait:null,appDraft:null});return false;}
  if(!action.startsWith('admin:app:')&&!(settings.appAwait&&!q))return false;
  const send=body=>api('sendMessage',{chat_id:m.chat.id,...body});
  if(q)await api('answerCallbackQuery',{callback_query_id:q.id}).catch(()=>{});
  if(!admins.has(String(from.id))){await send({text:'Нет доступа.'});return true;}
  if(action.startsWith('admin:app:'))store.configure(from.id,{broadcastDraft:null,adminAwait:false,adminDraft:null});
  const set=patch=>store.configure(from.id,patch),value=readExperience(store),home=()=>send({text:'Управление APK и вебом. Изменения получат подключённые устройства при следующем обмене. Уведомления APK приходят при фоновой проверке, не мгновенно.',reply_markup:keyboard([[['🔔 Уведомление APK','admin:app:notice']],[['🎨 Темы','admin:app:themes']],[['♫ Добавить звук WAV','admin:app:sound']],[['📿 Зикр для всех','admin:app:zikr']],[['Фото главного экрана','admin:app:bg-main']],[['Фото бокового меню','admin:app:bg-menu']],[['Убрать фон главного','admin:app:clear-main'],['Убрать фон меню','admin:app:clear-menu']],[['Отменить временную тему','admin:app:reset']],[['← Админ-панель','admin:home']]])});
  if(action==='admin:app:home'||action==='admin:app:cancel'){set({appAwait:null,appDraft:null});await home();return true;}
  if(action==='admin:app:sound'||action==='admin:app:zikr'){const kind=action.split(':')[2];set({appAwait:kind,appDraft:null,adminAwait:false,broadcastDraft:null});await send({text:kind==='sound'?'Пришлите короткий звук WAV (до 1 МБ), как документ. Подпись — название до 40 символов. Рекомендуется PCM WAV до 2 секунд.':'Пришлите: название | арабский текст | перевод. Зикр появится у всех после синхронизации.',reply_markup:keyboard([[['Отмена','admin:app:cancel']]])});return true;}
  if(action==='admin:app:notice'){set({appAwait:'notice',appDraft:null,adminAwait:false,broadcastDraft:null});await send({text:'Отправьте текст уведомления APK, до 1000 символов. Потом покажу подтверждение.',reply_markup:keyboard([[['Отмена','admin:app:cancel']]])});return true;}
  if(action==='admin:app:themes'){
   await send({text:'Выберите тему для временного оформления всех подключённых устройств или добавьте новую.',reply_markup:keyboard([...builtInThemes.map((id,i)=>[[['Изумрудная','Светлая','Тёмная','Чёрная'][i],'admin:app:theme:'+id]]),...value.themes.map(t=>[[t.name,'admin:app:theme:'+t.id]]),[['＋ Новая тема','admin:app:new-theme']],[['← Назад','admin:app:home']]])});return true;
  }
  if(action==='admin:app:new-theme'){set({appAwait:'theme',appDraft:null,adminAwait:false,broadcastDraft:null});await send({text:'Отправьте: название | фон | карточки | акцент | текст\nЦвета в формате #RRGGBB. Например:\nНочь | #101820 | #1C2833 | #A9DFBF | #FFFFFF\nПроверяется контраст текста. Максимум 20 дополнительных тем.',reply_markup:keyboard([[['Отмена','admin:app:cancel']]])});return true;}
  if(action.startsWith('admin:app:theme:')){
   const id=action.split(':')[3];if(![...builtInThemes,...value.themes.map(t=>t.id)].includes(id))return true;
   await send({text:'На какой срок применить тему ко всем? Затем автоматически вернутся личные темы пользователей.',reply_markup:keyboard([[['1 час','admin:app:apply:'+id+':1'],['24 часа','admin:app:apply:'+id+':24'],['7 дней','admin:app:apply:'+id+':168']],[['Отмена','admin:app:home']]])});return true;
  }
  if(action.startsWith('admin:app:apply:')){
   const [, , ,id,hours]=action.split(':');if(![1,24,168].includes(Number(hours))||![...builtInThemes,...value.themes.map(t=>t.id)].includes(id))return true;
   value.active={id,expiresAt:now()+Number(hours)*3600000};saveExperience(store,value);await send({text:'Временная тема применена на '+hours+' ч. Обновление при следующем подключении.'});return true;
  }
  if(action==='admin:app:reset'){value.active=null;saveExperience(store,value);await home();return true;}
  if(action.startsWith('admin:app:clear-')){const target=action.slice('admin:app:clear-'.length);if(['main','menu'].includes(target)){value.backgrounds[target]='';saveExperience(store,value);}await home();return true;}
  if(action==='admin:app:bg-main'||action==='admin:app:bg-menu'){set({appAwait:action.endsWith('main')?'main':'menu',appDraft:null,adminAwait:false,broadcastDraft:null});await send({text:'Отправьте фото для фона (до 5 МБ). Текст останется поверх затемнённого изображения.',reply_markup:keyboard([[['Отмена','admin:app:cancel']]])});return true;}
  if(action.startsWith('admin:app:publish:')){
   const draft=settings.appDraft;if(!draft||draft.id!==action.split(':')[3]){await send({text:'Предпросмотр устарел.'});return true;}
   if(draft.kind==='sound'){if(value.sounds.length>=20){await send({text:'Лимит 20 звуков.'});return true;}value.sounds.push(draft.sound);}
   if(draft.kind==='zikr'){if(value.zikrs.length>=200){await send({text:'Лимит 200 общих зикров.'});return true;}value.zikrs.push(draft.zikr);}
   if(draft.kind==='notice')value.notifications=[...value.notifications.filter(n=>n.expiresAt>now()),{id:draft.id,text:draft.text,at:now(),expiresAt:now()+86400000}].slice(-20);
   if(draft.kind==='theme'){if(value.themes.length>=20){await send({text:'Достигнут лимит 20 тем.'});return true;}value.themes.push(draft.theme);}
   if(['main','menu'].includes(draft.kind)&&validBackground(draft.media))value.backgrounds[draft.kind]=draft.media;
   saveExperience(store,value);set({appAwait:null,appDraft:null});await send({text:'Сохранено. Подключённые приложения получат изменение при следующей проверке.'});return true;
  }
  if(!q&&settings.appAwait){
   let draft={id:randomUUID(),kind:settings.appAwait};
   try{
    if(draft.kind==='notice'){const text=(m.text||'').trim();if(!text||text.length>1000)throw Error();draft.text=text;}
    else if(draft.kind==='sound'){const sound=m.document||m.audio;if(!sound||!saveMedia||sound.file_size>1024*1024||value.sounds.length>=20)throw Error();const path=await saveMedia(sound);if(!/^\/media\/[a-f0-9-]{36}[.]wav$/.test(path))throw Error();draft.sound={id:'sound-'+draft.id,name:(m.caption||sound.file_name||'Звук').slice(0,40),path};}
    else if(draft.kind==='zikr'){const parts=(m.text||'').split('|').map(x=>x.trim());if(!parts[0]||parts.length>3||parts[0].length>80||(parts[1]||'').length>500||(parts[2]||'').length>500||value.zikrs.length>=200)throw Error();draft.zikr={id:'global-'+draft.id,name:parts[0],arabic:parts[1]||'',meaning:parts[2]||''};}
    else if(draft.kind==='theme'){if(value.themes.length>=20)throw Error();draft.theme=themeFromText(m.text,'theme-'+randomUUID().slice(0,8));}
    else{const photo=m.photo?.at(-1);if(!photo||photo.file_size>5*1024*1024||!saveMedia)throw Error();draft.media=await saveMedia(photo);if(!validBackground(draft.media))throw Error();await api('sendPhoto',{chat_id:m.chat.id,photo:photo.file_id,caption:'Предпросмотр фона'});}
    set({appAwait:null,appDraft:draft});await send({text:draft.kind==='sound'?'Добавить всем звук «'+draft.sound.name+'»?':draft.kind==='zikr'?'Добавить всем зикр «'+draft.zikr.name+'»?':draft.kind==='notice'?'Уведомление APK:\n'+draft.text:draft.kind==='theme'?'Добавить тему «'+draft.theme.name+'»?\n'+[draft.theme.background,draft.theme.surface,draft.theme.accent,draft.theme.text].join(' · '):'Установить этот фон для всех подключённых приложений?',reply_markup:keyboard([[['Подтвердить','admin:app:publish:'+draft.id]],[['Отмена','admin:app:cancel']]])});
   }catch{await send({text:'Не удалось подготовить. Проверьте формат, размер фото или контраст цветов темы.'});}
   return true;
  }
  return true;
 };
}
