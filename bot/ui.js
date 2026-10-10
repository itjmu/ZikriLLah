import {cycleIds} from '../web/model.js';
import {report,rankRange,localTime} from './stats.js';
export {builtinZikrs as zikrs} from '../web/catalog.js';
import {builtinZikrs} from '../web/catalog.js';
const button=(text,data)=>({text,callback_data:data,...(data==='tasbih'?{style:'success'}:(data.startsWith('remove:')||data.startsWith('resetstats:'))?{style:'danger'}:['settings','stats','reminder'].includes(data)?{style:'primary'}:{})});
const back=[button('← Меню','home')];
const f=n=>n.toLocaleString('ru-RU');
export const zikrKeyboard=(id,zikrs=builtinZikrs,showText=true)=>({keyboard:[[{text:showText?`📿 ${zikrs.find(z=>z.id===id).name}`:'📿 +1'}]],resize_keyboard:false,is_persistent:true,one_time_keyboard:false,input_field_placeholder:'Нажмите большую кнопку для зикра'});
const view=(text,rows)=>({text,entities:[...text.matchAll(/\d(?:[\d \u00a0\u202f]*\d)?/g)].map(m=>({type:'bold',offset:m.index,length:m[0].length})),reply_markup:{inline_keyboard:rows}});
export function screen(store,user,page='home',now=new Date(),publicUrl=''){
  const profile=store.profile(user),s=profile.settings,zikrs=store.catalog(user);
  const events=store.sync(user,[]),r=report(events,s.utcOffset,now);
  const zone=`UTC${s.utcOffset>=0?'+':'−'}${Math.abs(s.utcOffset)/60}`;
  if(page==='tasbih'){
    const z=zikrs.find(z=>z.id===s.selected),n=r.byZikr[z.id]||0,current=n===0?0:(n-1)%s.goal+1;
    const body=view(`Счёт: ${f(current)} / ${f(s.goal)}\nКругов: ${Math.floor(n/s.goal)}\nСегодня: ${f(r.today)}`,[[button('← Выйти','home'),button('⚙️ Настройки','settings')]]);
    if(s.showText){const label=z.name+(z.arabic?'\n'+z.arabic:'');const offset=body.text.length+2;body.text+='\n\n'+label;body.entities.push({type:'bold',offset,length:label.length});}return body;
  }
  if(page.startsWith('manage:')||page.startsWith('delete:')){
 const id=page.slice(page.indexOf(':')+1),z=zikrs.find(z=>z.id===id);if(!z)return screen(store,user,'choose',now,publicUrl);
 if(page.startsWith('delete:'))return view('Удалить «'+z.name+'»? История счёта сохранится.',[[button('Удалить','remove:'+id)],[button('Отмена','manage:'+id)]]);
 const chosen=cycleIds(zikrs,s.cycleZikrs??null),rows=[[button('✎ Изменить текст','editzikr:'+id)],[button('Только этот','only:'+id)],[button(chosen.includes(id)?'☑ В цикле':'☐ Добавить в цикл','cycle:'+id)],[button('↑ Выше','up:'+id),button('↓ Ниже','down:'+id)]];
 if(id.startsWith('custom-'))rows.push([button('🗑 Удалить свой зикр','delete:'+id)]);
 return view(z.name+'\n\nГалочка включает зикр в цикл. Хотя бы один зикр должен остаться. Стрелки меняют порядок.',rows.concat([[button('← Список','choose')]]));
 }
 if(page==='choose'||page.startsWith('choose:')){
    const offset=Math.max(0,Number(page.split(':')[1])||0),rows=zikrs.slice(offset,offset+12).map(z=>[button((s.selected===z.id?'✓ ':'')+z.name,'select:'+z.id),button('⚙','manage:'+z.id)]);
    const nav=[];if(offset>0)nav.push(button('←','choose:'+Math.max(0,offset-12)));if(offset+12<zikrs.length)nav.push(button('→','choose:'+(offset+12)));if(nav.length)rows.push(nav);
    return view('📿 Выберите зикр',rows.concat([[button('＋ Свой зикр','newzikr')],[button('← Тасбих','tasbih')]]));
  }
  if(page==='goals')return view('🎯 Повторений в круге\nИстория при изменении цели сохраняется.',[[33,99,100,1000].map(n=>button(String(n),`goal:${n}`)),[button('Другое количество','customgoal')],[button('← Тасбих','tasbih')]]);
  if(page==='daily')return view('☀ Дневная цель\nМожно также отправить /daily 750 со своим числом.',[[100,300,900,1000].map(n=>button(String(n),`daily:${n}`)),[button('← Настройки','settings')]]);
  if(page==='timezone')return view('🕒 Часовой пояс личной статистики\nДля другого смещения: /timezone +5:30\nРейтинги для всех считаются по UTC.',[[0,180,300,360].map(n=>button(`UTC+${n/60}`,`zone:${n}`)),[button('← Настройки','settings')]]);
  if(page==='reminder'){const minute=s.reminderMinute??420;return view('🔔 Ежедневное напоминание\n\n'+(s.botReminder===false?'Выключено':'Включено')+' · '+String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0')+' · '+zone+'\n\nAPK напоминает отдельно, без интернета. Его время меняется в настройках приложения.',[[button(s.botReminder===false?'Включить':'Выключить','remind:'+(s.botReminder===false?'on':'off'))],[button('07:00','remind:420'),button('12:00','remind:720'),button('22:00','remind:1320')],[button('🕒 Часовой пояс','timezone')],[button('← Настройки','settings')]]);}
  if(page==='settings')return view(`⚙️ Настройки бота\n\nПовторений в круге: ${s.goal}\nЧасовой пояс: ${zone}\n\nНастройки практики отдельные для каждого устройства. Общая история объединяется.`,[[button('📿 Вернуться к счёту','tasbih')],[button('Выбрать зикры / цикл','choose')],[button('🔔 Напоминание','reminder')],[button('Повторений в круге','goals')],[button(`Смена зикра: ${s.autoNext?'вкл':'выкл'}`,`auto:${s.autoNext?0:1}`)],[button(`Текст зикра: ${s.showText?'виден':'скрыт'}`,`text:${s.showText?0:1}`)],[button('Часовой пояс','timezone'),button('Участие в рейтинге','privacy')],back]);
  if(page==='stats'){
    const max=Math.max(1,...r.week.map(d=>d.count));const days=r.week.map(d=>`${d.day.slice(5)}  ${'▰'.repeat(Math.round(d.count/max*8))||'·'} ${f(d.count)}`).join('\n');
    return view(`📊 Ваш прогресс · ${zone}\n\nСегодня: ${f(r.today)}\nВчера: ${f(r.yesterday)}\nЗа 7 дней: ${f(r.week.reduce((n,d)=>n+d.count,0))}\nЗа месяц: ${f(r.month)}\nЗа всё время: ${f(r.total)}\n\nСерия: ${r.streak} дн.\nАктивных дней: ${r.activeDays}\nЛучший день: ${r.best?`${r.best[0]} · ${f(r.best[1])}`:'—'}\n\n${zikrs.slice(0,12).map(z=>`${z.name}: ${f(r.byZikr[z.id]||0)}`).join('\n')}${zikrs.length>12?'\nСвои зикры: '+f(zikrs.slice(12).reduce((n,z)=>n+(r.byZikr[z.id]||0),0)):''}\n\nПоследние 7 дней\n${days}\n\nПервая запись: ${localTime(r.first,s.utcOffset)}\nПоследняя запись: ${localTime(r.last,s.utcOffset)}\n\nУчитываются записи бота и синхронизированных устройств.`,[[button('Обновить','stats'),button('🏆 Рейтинг','rank:day')],[button('Сбросить сегодня','resetstats:1'),button('Сбросить 7 дней','resetstats:7')],back]);
  }
  if(page.startsWith('rank:')){
    const period=page.split(':')[1];if(!['day','week','all'].includes(period))return screen(store,user,'home',now,publicUrl);
    const range=rankRange(period,now),rank=store.ranking(range.since,range.until);let place=0,lastCount=-1;
    const ranked=rank.map((entry,index)=>{if(entry.count!==lastCount){place=index+1;lastCount=entry.count;}return {...entry,place};});
    const mine=ranked.find(p=>p.user===String(user));
    const heading={day:'сегодня',week:'последние 7 дней',all:'всё время'}[period];
    return view(`🏆 Рейтинг · ${heading}\nПериоды по UTC · обновлено ${localTime(now,0)}\n\n${ranked.slice(0,10).map(p=>`${p.place}. ${p.name} — ${f(p.count)}`).join('\n')||'Пока нет участников с записями за этот период.'}\n\n${profile.public?mine?`Ваше место: ${mine.place} · ${f(mine.count)} зикров`:'Вы участвуете. Пока нет записей за период.':'Вы не участвуете. Подключиться можно по кнопке ниже.'}\n\nТолько добровольные участники. Результаты основаны на синхронизированных записях.`,[[button('Сегодня','rank:day'),button('7 дней','rank:week'),button('Всё время','rank:all')],[button('Участие в рейтинге','privacy')],back]);
  }
  if(page==='privacy')return view(`🏆 Участие в рейтинге\n\n${profile.public?'Вы участвуете.':'Вы пока не участвуете.'}\nПри включении другим участникам будет видно ваше имя Telegram «${profile.name}» и количество зикров за выбранный период, включая прошлые синхронизированные записи. Точное время вашей активности и подробная личная статистика не публикуются.\n\nМожно выйти в любой момент. История сохранится; ранее отправленные сообщения с рейтингом могут остаться у получателей.`,[[button(profile.public?'Выйти из рейтинга':'Участвовать',profile.public?'participate:0':'participate:1')],back]);
  if(page==='help')return view('❔ Как пользоваться\n\n📿 Начать зикр → большая кнопка с названием зикра внизу считает нажатие. При выходе она исчезает.\nВыбор зикра, цель и автоматическая смена — в настройках.\n📊 Статистика объединяет бот, Android и веб.\n🔗 Подключить устройство выдаёт одноразовый код на 10 минут.\n🏆 Рейтинг — по желанию, участие включается отдельно.\n\n/timezone +5:30 — часовой пояс\n/link — привязка устройства\n/stats — статистика\n/rating — рейтинг\n\nВибрация и касания всего экрана настраиваются в приложении: Telegram-бот не управляет этими функциями телефона.',[back]);
  const rows=[[button('📿 Начать зикр','tasbih')],[button('📊 Моя статистика','stats'),button('🏆 Рейтинг','rank:day')],[button('⚙️ Настройки','settings'),button('🔗 Устройство','link')],[button('📰 Новости и объявления','news')],[button('❔ Помощь','help')]];
  if(publicUrl.startsWith('https://'))rows.push([{text:'Открыть веб-приложение',web_app:{url:publicUrl}}]);
  return view(`Ассаляму алейкум!\n\n✦ ZikriLLah\nВаше пространство зикра.\n\nСегодня: ${f(r.today)}\nВсего: ${f(r.total)}\n\nВыберите действие ниже.`,rows);
}
