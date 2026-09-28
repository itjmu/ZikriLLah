import {applyExperience} from './experience.js';
import {enableReorder} from './reorder.js';
import {createHaptics} from './haptics.js';
const haptic=createHaptics();
import {statistics,mergeSync,TapGate,orderedCatalog,cycleIds,nextInCycle,feedbackPolicy,weekCounts} from './model.js';
import {builtinZikrs} from './catalog.js';
import {renderPublication} from './publication.js';
let zikrs=[...builtinZikrs];
const $=id=>document.getElementById(id),storageKey='zikrillah-v1';
const translations={
  ru:{soundSection:'Звук и вибрация',soundOn:'🔊 Звук нажатия',chooseSound:'♫ Выбрать звук',silent:'🔇 Полная тишина',practice:'Счётчик',week:'📊 Последние 7 дней',clockTheme:'Часы',stealth:'Скрытый режим · часы',testVibration:'Проверить вибрацию',stealthHelp:'Чёрный экран с часами. Тапы без звука и вибрации. Только в конце круга — вибрация; «Полная тишина» отключает и её. Выход — ↩ сверху. Это не системная блокировка.',hapticMissing:'Браузер не поддерживает вибрацию. Попробуйте APK или откройте приложение внутри Telegram.',hapticSent:'Отправлен длинный сигнал. Если его не ощущаете, проверьте настройки вибрации телефона.',addCustom:'＋ Добавить свой зикр',customName:'Название',customArabic:'Арабский текст (необязательно)',customMeaning:'Перевод (необязательно)',customLimit:'Можно добавить до 200 своих зикров.',of:'из',inRound:'в круге',tap:'КОСНИТЕСЬ ЭКРАНА',settings:'Настройки',stats:'Статистика',zikrs:'Зикры',language:'Язык',theme:'Тема',roundTarget:'Повторений в круге',dailyTarget:'Дневная цель',save:'Сохранить',interval:'Интервал нажатий',today:'Сегодня',yesterday:'Вчера',month:'За этот месяц',total:'Всего',rounds:'Полных кругов',first:'Первая запись',last:'Последняя запись',roundNote:'Круги — для выбранного зикра и цели.',light:'Светлая',dark:'Тёмная',black:'Чёрная',emerald:'Изумрудная',connect:'Подключить Telegram',connected:'Telegram подключён',linkHelp:'Отправьте боту /link и введите код. Дальше прогресс объединяется автоматически.',code:'Одноразовый код',vibrate:'Вибрация',showText:'Текст зикра',autoNext:'Смена зикра после круга',on:'вкл',off:'выкл',local:'Сохранено на устройстве',pending:'Сохранено · отправится автоматически',syncing:'Объединяем прогресс…',synced:'Всё сохранено и синхронизировано',offline:'Офлайн · прогресс на устройстве',error:'Не удалось синхронизировать. Прогресс на устройстве.',storage:'Не удалось сохранить нажатие. Проверьте свободное место.',linkError:'Проверьте код и подключение к серверу.',menu:'Меню',close:'Закрыть',back:'Назад',add:'Добавить один зикр'},
  en:{soundSection:'Sound & vibration',soundOn:'🔊 Tap sound',chooseSound:'♫ Choose sound',silent:'🔇 Silent mode',practice:'Counter',week:'📊 Last 7 days',clockTheme:'Clock',stealth:'Discreet mode · clock',testVibration:'Test vibration',stealthHelp:'Black screen with a clock. No tap feedback. Only round-end vibration; Silent mode disables it too. Exit using ↩. This is not the system lock screen.',hapticMissing:'Vibration is unavailable in this browser. Try the APK or open the app inside Telegram.',hapticSent:'Long feedback requested. If you feel nothing, check your phone vibration settings.',addCustom:'＋ Add your own dhikr',customName:'Name',customArabic:'Arabic text (optional)',customMeaning:'Meaning (optional)',customLimit:'You can add up to 200 custom dhikrs.',of:'of',inRound:'in round',tap:'TAP TO COUNT',settings:'Settings',stats:'Statistics',zikrs:'Dhikr',language:'Language',theme:'Theme',roundTarget:'Repeats per round',dailyTarget:'Daily target',save:'Save',interval:'Tap interval',today:'Today',yesterday:'Yesterday',month:'This month',total:'Total',rounds:'Completed rounds',first:'First entry',last:'Last entry',roundNote:'Rounds use the selected dhikr and target.',light:'Light',dark:'Dark',black:'Black',emerald:'Emerald',connect:'Connect Telegram',connected:'Telegram connected',linkHelp:'Send /link to your bot and enter the code. Your progress will then sync automatically.',code:'One-time code',vibrate:'Vibration',showText:'Dhikr text',autoNext:'Next dhikr after each round',on:'on',off:'off',local:'Saved on this device',pending:'Saved · will sync automatically',syncing:'Syncing your progress…',synced:'Saved and synced',offline:'Offline · saved on this device',error:'Unable to sync. Progress is saved on this device.',storage:'Tap was not saved. Check available storage.',linkError:'Check the code and server connection.',menu:'Menu',close:'Close',back:'Back',add:'Add one dhikr'}
};
let state={events:[],pending:[],selected:'subhanallah',goal:33,dailyGoal:900,vibrate:true,showText:true,autoNext:false,token:'',theme:'emerald',stealth:false,language:'ru',tapInterval:200,customZikrs:[],deletedZikrs:[],zikrOrder:[],cycleZikrs:null,feedbackMode:0,clickSound:'beads',experience:null,onboarded:false,content:null};
try{state={...state,...JSON.parse(localStorage.getItem(storageKey)||'{}')};}catch{}
zikrs=[...builtinZikrs,...(state.customZikrs||[])];
if(!zikrs.some(z=>z.id===state.selected))state.selected=zikrs[0].id;
state.soundEnabled??=state.feedbackMode===0;state.vibrationEnabled??=state.feedbackMode<2;state.silent??=state.feedbackMode===2;
if(!translations[state.language])state.language='ru';
if(state.theme==='stealth'){state.stealth=true;state.theme=state.previousTheme&&state.previousTheme!=='stealth'?state.previousTheme:'emerald';}
let busy=false,linking=false,timer,page='home',statusKey='local';const tapGate=new TapGate();
const t=key=>translations[state.language][key]||key;
const localized=z=>state.language==='en'?[z.englishName||z.name,z.englishMeaning||z.meaning]:[z.name,z.meaning];
function save(){localStorage.setItem(storageKey,JSON.stringify(state));}
function setStatus(key){statusKey=key;$('status').textContent=t(key);}
function setPage(next){page=next;document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==page);$('menuBack').hidden=page==='home';$('panelTitle').classList.toggle('brand-title',page==='home');$('panelTitle').textContent=page==='home'?'✦ ZikriLLah':t(page);}
let countedEvents=null,countedLength=0;
const eventCounts=new Map();
function selectedCount(){
  if(countedEvents!==state.events||countedLength>state.events.length){eventCounts.clear();countedEvents=state.events;countedLength=0;}
  while(countedLength<state.events.length){const e=state.events[countedLength++];eventCounts.set(e.zikr,(eventCounts.get(e.zikr)||0)+1);}
  return eventCounts.get(state.selected)||0;
}
function render(){
  rebuildZikrs();
  const count=selectedCount(),stats=page==='stats'?statistics(state.events,state.selected,state.goal):{current:count===0?0:((count-1)%state.goal)+1},z=zikrs.find(z=>z.id===state.selected),[name,meaning]=localized(z);
  document.documentElement.lang=state.language;document.documentElement.dataset.theme=state.stealth?'stealth':state.theme;applyExperience(document,state);
  const discreet=state.stealth;$('stealthClock').hidden=!discreet;$('stealthToggle').textContent=t('stealth')+': '+t(discreet?'on':'off');$('stealthToggle').setAttribute('aria-pressed',discreet);updateClock();updateWakeLock();
  document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));
  $('menu').setAttribute('aria-label',t('menu'));$('menuBack').setAttribute('aria-label',t('back'));$('tap').setAttribute('aria-label',t('add'));document.querySelectorAll('[data-close]').forEach(b=>b.setAttribute('aria-label',t('close')));
  document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if(page==='stats')for(const key of ['today','total','rounds','yesterday','month'])$(key).textContent=stats[key].toLocaleString(state.language);
  $('count').textContent=stats.current;$('stealthCount').textContent=stats.current;$('count').classList.toggle('long-count',stats.current>999);$('goalLabel').textContent=state.goal;if(document.activeElement!==$('goal'))$('goal').value=state.goal;$('interval').value=state.tapInterval;
  $('arabic').textContent=z.arabic;$('zikrName').textContent=name;$('meaning').textContent=meaning;$('zikrText').classList.toggle('text-hidden',!state.showText);
  $('beadProgress').style.maskImage=`conic-gradient(from 90deg,#000 ${stats.current/state.goal*360}deg,transparent 0)`;
  $('textToggle').checked=state.showText;$('autoNext').checked=state.autoNext;
  for(const key of ['soundEnabled','vibrationEnabled','silent'])$(key).checked=state[key];
  for(const [id,key] of [['quickSound','soundEnabled'],['quickVibration','vibrationEnabled'],['quickSilent','silent']]){$(id).setAttribute('aria-pressed',Boolean(state[key]));$(id).classList.toggle('active',state[key]);}
  if(page==='stats'){const week=weekCounts(state.events),maximum=Math.max(1,...week.map(d=>d.count));$('weekChart').replaceChildren();for(const day of week){const bar=document.createElement('div'),number=document.createElement('strong'),fill=document.createElement('i'),label=document.createElement('small');number.textContent=day.count;fill.style.height=Math.max(3,100*day.count/maximum)+'px';label.textContent=day.date.toLocaleDateString(state.language,{day:'2-digit',month:'2-digit'});bar.append(number,fill,label);$('weekChart').append(bar);}}
  $('soundChoice').value=state.clickSound;
  renderPublication($('publication'),state.content,state.language);
  $('account').textContent=state.token?'✓ Telegram':'↗ Telegram';$('account').setAttribute('aria-label',t(state.token?'connected':'connect')); $('status').textContent=t(statusKey);
  for(const button of document.querySelectorAll('[data-zikr]')){const z=zikrs.find(z=>z.id===button.dataset.zikr);const [name,meaning]=localized(z);button.querySelector('span').textContent=name;button.querySelector('small').textContent=meaning;button.classList.toggle('active',z.id===state.selected);}
  $('cycleLanguage').textContent=state.language==='ru'?'RU':'ENG';$('cycleLanguage').setAttribute('aria-label',t('language'));
  const icons={light:'☀',dark:'☾',black:'●',emerald:'✦'};$('cycleTheme').textContent=icons[state.theme]||'✦';$('cycleTheme').setAttribute('aria-label',t('theme')+': '+t(state.theme));$('cycleTheme').title=t('theme')+': '+t(state.theme);
  $('quickStealth').setAttribute('aria-pressed',Boolean(state.stealth));$('quickStealth').setAttribute('aria-label',t('stealth'));$('menu').textContent=state.stealth?'↩':'☰';$('menu').setAttribute('aria-label',state.stealth?(state.language==='ru'?'Выйти из скрытого режима':'Exit discreet mode'):t('menu'));setPage(page);
}
const soundPlayers=new Map();
function clickSound(){try{const key=['beads','water','rain','stones','soft'].includes(state.clickSound)?state.clickSound:'beads';let player=soundPlayers.get(key);if(!player){player=new Audio('/sounds/'+key+'.wav');player.volume=.65;soundPlayers.set(key,player);}player.currentTime=0;player.play().catch(()=>{});}catch{}}
let catalogSignature='';
function rebuildZikrs(){
  zikrs=orderedCatalog([...builtinZikrs,...state.customZikrs],state.zikrOrder,state.deletedZikrs);
  if(!zikrs.some(z=>z.id===state.selected))state.selected=cycleIds(zikrs,state.cycleZikrs)[0];
  const signature=JSON.stringify([zikrs.map(z=>z.id),state.cycleZikrs,state.language]);if(signature===catalogSignature)return;catalogSignature=signature;$('zikrOptions').replaceChildren();
  const hint=document.createElement('p');hint.className='muted';hint.textContent=state.language==='ru'?'Удерживайте ⠿ и перетаскивайте. Выше черты — зикры в цикле, ниже — остальные.':'Hold ⠿ and drag. Above the line: cycle; below: other dhikrs.';$('zikrOptions').append(hint);
  const chosen=cycleIds(zikrs,state.cycleZikrs);
  const top=document.createElement('div'),bottom=document.createElement('div');top.className=bottom.className='zikr-group';
  const heading=document.createElement('p');heading.className='cycle-heading';heading.textContent=state.language==='ru'?'В цикле · сверху вниз':'In cycle · top to bottom';
  const divider=document.createElement('div');divider.className='cycle-divider';divider.textContent=state.language==='ru'?'Остальные · перетащите выше для добавления':'Others · drag above to include';
  $('zikrOptions').append(heading,top,divider,bottom);
  zikrs.forEach(z=>{
    const row=document.createElement('div');row.className='zikr-row';row.dataset.rowId=z.id;
    const grip=document.createElement('button');grip.className='drag-grip';grip.textContent='⠿';grip.setAttribute('aria-label',(state.language==='ru'?'Переместить: ':'Move: ')+localized(z)[0]);
    const button=document.createElement('button');button.className='wide zikr-option';button.dataset.zikr=z.id;button.append(document.createElement('span'),document.createElement('small'));button.onclick=()=>{state.selected=z.id;save();render();};
    row.append(grip,button);
    if(z.id.startsWith('custom-')){const remove=document.createElement('button');remove.className='remove-zikr';remove.textContent='🗑';remove.setAttribute('aria-label',(state.language==='ru'?'Удалить: ':'Delete: ')+z.name);remove.onclick=()=>{if(!confirm(state.language==='ru'?'Удалить «'+z.name+'»? История счёта сохранится.':'Delete “'+z.name+'”? Count history will be kept.'))return;state.deletedZikrs=[...new Set([...state.deletedZikrs,z.id])];save();render();sync();};row.append(remove);}
    (chosen.includes(z.id)?top:bottom).append(row);
  });

}
enableReorder($('zikrOptions'),(order,chosen)=>{state.zikrOrder=order;state.cycleZikrs=chosen;state.autoNext=true;if(!chosen.includes(state.selected))state.selected=chosen[0];save();render();});
$('customZikrForm').onsubmit=e=>{e.preventDefault();if(state.customZikrs.length>=200){$('customError').textContent=t('customLimit');return;}
  const name=$('customName').value.trim();if(!name)return;
  const z={id:'custom-'+crypto.randomUUID(),name,arabic:$('customArabic').value.trim(),meaning:$('customMeaning').value.trim()};
  state.customZikrs.push(z);const previous=state.selected;state.selected=z.id;
  try{save();}catch{state.customZikrs.pop();state.selected=previous;alert(t('storage'));return;}
  $('customZikrForm').reset();$('customError').textContent='';render();sync();
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{setPage(b.dataset.page);render();});
$('menu').onclick=()=>{if(state.stealth){state.stealth=false;save();render();return;}setPage('home');render();$('drawer').showModal();};$('menuBack').onclick=()=>setPage('home');
$('soundChoice').onchange=e=>{state.clickSound=e.target.value;save();clickSound(false);};
for(const [id,key] of [['quickSound','soundEnabled'],['quickVibration','vibrationEnabled'],['quickSilent','silent']])$(id).onclick=()=>{state[key]=!state[key];save();render();};
for(const key of ['soundEnabled','vibrationEnabled','silent'])$(key).onchange=e=>{state[key]=e.target.checked;save();render();};
$('cycleLanguage').onclick=()=>{state.language=state.language==='ru'?'en':'ru';save();render();};
$('cycleTheme').onclick=()=>{const themes=['emerald','light','dark','black',...(state.experience?.themes||[]).map(t=>t.id)];state.theme=themes[(themes.indexOf(state.theme)+1)%themes.length];save();render();};
$('quickStealth').onclick=()=>{state.stealth=!state.stealth;save();$('drawer').close();render();};
$('account').onclick=()=>{if(state.token)return;$('drawer').close();$('linkDialog').showModal();};
$('testVibration').onclick=()=>{$('hapticStatus').textContent=t(haptic(true)==='unavailable'?'hapticMissing':'hapticSent');};
$('stealthToggle').onclick=()=>{state.stealth=!state.stealth;save();$('drawer').close();render();};
function updateClock(){if(!state.stealth)return;const date=new Date();$('clockTime').textContent=date.toLocaleTimeString(state.language,{hour:'2-digit',minute:'2-digit',hour12:false});$('clockDate').textContent=date.toLocaleDateString(state.language,{weekday:'long',day:'numeric',month:'long'});$('stealthClock').style.transform='translate('+((date.getMinutes()%3-1)*4)+'px,'+((Math.floor(date.getMinutes()/3)%3-1)*4)+'px)';}
let wakeLock=null,wakePending=false;
async function updateWakeLock(){const needed=state.stealth&&document.visibilityState==='visible';if(!needed){if(wakeLock){const lock=wakeLock;wakeLock=null;await lock.release().catch(()=>{});}return;}if(wakeLock||wakePending||!navigator.wakeLock)return;wakePending=true;try{const lock=await navigator.wakeLock.request('screen');if(!state.stealth||document.visibilityState!=='visible'){await lock.release();return;}wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;});}catch{}finally{wakePending=false;}}
setInterval(updateClock,1000);
function addZikr(){
  if(!tapGate.accept(performance.now(),state.tapInterval))return;
  const event={id:crypto.randomUUID(),zikr:state.selected,at:new Date().toISOString()},previousSelected=state.selected;
  state.events.push(event);state.pending.push(event);const complete=selectedCount()%state.goal===0;
  if(complete&&state.autoNext)state.selected=nextInCycle(zikrs,state.cycleZikrs,state.selected);
  try{save();}catch{state.events.pop();state.pending.pop();countedEvents=null;state.selected=previousSelected;setStatus('storage');alert(t('storage'));return;}
  const feedback=feedbackPolicy(state,complete);if(feedback.sound)clickSound();if(feedback.vibrate)haptic(complete);setStatus(state.token?'pending':'local');render();
  if(!timer)timer=setTimeout(()=>{timer=null;sync();},2500);
}
// Physical taps use only pointerup; the browser's subsequent click never counts again.
let pointer=null;
const excluded=e=>document.querySelector('dialog[open]')||e.target.closest('dialog')||(e.target.closest('button')&&e.target.closest('button').id!=='tap');
$('surface').addEventListener('pointerdown',e=>{if(pointer){pointer.valid=false;return;}pointer={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),valid:e.isPrimary&&e.button===0&&!excluded(e)};});
$('surface').addEventListener('pointermove',e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>10)pointer.valid=false;});
$('surface').addEventListener('pointercancel',()=>{pointer=null;});
$('surface').addEventListener('pointerup',e=>{const p=pointer;pointer=null;if(p?.valid&&p.id===e.pointerId&&performance.now()-p.start<=500&&!excluded(e))addZikr();});
$('tap').addEventListener('click',e=>{e.preventDefault();if(e.detail===0&&!document.querySelector('dialog[open]'))addZikr();});
$('surface').addEventListener('dblclick',e=>e.preventDefault());
$('goal').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>100000){e.target.value=state.goal;return;}state.goal=n;save();render();};$('interval').onchange=e=>{state.tapInterval=Number(e.target.value);save();};
for(const [id,key] of [['textToggle','showText'],['autoNext','autoNext']])$(id).onchange=e=>{state[key]=e.target.checked;save();render();};
async function post(path,body){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Sync failed');return data;}
async function sync(){if(busy||!state.token||!navigator.onLine)return;busy=true;setStatus('syncing');try{do{const batch=state.pending.slice(0,5000),data=await post('/api/sync',{events:batch,customZikrs:state.customZikrs,deletedZikrs:state.deletedZikrs});const customZikrs=[...new Map([...(data.customZikrs||[]),...state.customZikrs].map(z=>[z.id,z])).values()];const next={...state,customZikrs,deletedZikrs:[...new Set([...state.deletedZikrs,...(data.deletedZikrs||[])])],content:data.content??null,experience:data.experience??state.experience,...mergeSync(state.pending,batch,data.events)};localStorage.setItem(storageKey,JSON.stringify(next));state=next;render();}while(state.pending.length);setStatus('synced');}catch{setStatus(navigator.onLine?'error':'offline');}finally{busy=false;}}
$('linkForm').onsubmit=async e=>{e.preventDefault();if(state.token||linking)return;linking=true;$('linkSubmit').disabled=true;try{const data=await post('/api/link',{code:$('code').value.trim()});state.token=data.token;save();$('linkDialog').close();render();await sync();}catch{$('linkStatus').textContent=t('linkError');}finally{linking=false;$('linkSubmit').disabled=false;}};
window.addEventListener('online',()=>{sync();refreshContent();});window.addEventListener('offline',()=>setStatus('offline'));
document.addEventListener('visibilitychange',()=>{pointer=null;updateWakeLock();if(document.visibilityState==='visible'){render();sync();}else sync();});
window.addEventListener('storage',e=>{if(e.key===storageKey&&e.newValue){state={...state,...JSON.parse(e.newValue)};render();}});
async function refreshContent(){if(!navigator.onLine)return;try{const r=await fetch('/api/content',{signal:AbortSignal.timeout(15000)});if(!r.ok)return;const data=await r.json();state.content=data.content;state.experience=data.experience??null;save();render();}catch{}}
setInterval(()=>{render();sync();refreshContent();},30000);refreshContent();if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});render();sync();

function finishWelcome(){state.onboarded=true;save();$('welcome').close();}
$('welcomeSkip').onclick=finishWelcome;
$('welcomeConnect').onclick=()=>{finishWelcome();$('linkDialog').showModal();};
$('welcome').addEventListener('cancel',()=>{state.onboarded=true;save();});
if(!state.onboarded&&!state.token&&!state.events.length)$('welcome').showModal();
