import {publicationButton} from '../web/links.js';
import {randomUUID} from 'node:crypto';
const buttons=rows=>({inline_keyboard:rows.map(row=>row.map(([text,callback_data])=>({text,callback_data})))});
export const publicContent=post=>post?{id:post.id,text:post.text,kind:post.kind,media:post.media||'',publishedAt:post.publishedAt,button:publicationButton(post.button)}:null;
export async function sendPublication(api,chat,post,extra={}){
  if(!post)return api('sendMessage',{chat_id:chat,text:'Пока нет новостей и объявлений.',...extra});
  const link=publicationButton(post.button);if(link)extra={...extra,reply_markup:{inline_keyboard:[[{text:link.text,url:link.url}],...(extra.reply_markup?.inline_keyboard||[])]}};
  if(post.kind==='text')return api('sendMessage',{chat_id:chat,text:post.text,...extra});
  const field={photo:'photo',video:'video',animation:'animation'}[post.kind];
  return api({photo:'sendPhoto',video:'sendVideo',animation:'sendAnimation'}[post.kind],{chat_id:chat,[field]:post.fileId,caption:post.text,...extra});
}
export function createPublications(store,api,{adminIds=[],saveMedia}={}){
  const admins=new Set(adminIds.map(String));
  return async (update)=>{
    const q=update.callback_query,m=q?.message||update.message,from=q?.from||m?.from;
    if(!m||m.chat?.type!=='private'||String(m.chat.id)!==String(from?.id))return false;
    const command=(m.text||'').trim().split(/\s/)[0].split('@')[0],action=q?.data||'',admin=admins.has(String(from.id));
    const send=body=>api('sendMessage',{chat_id:m.chat.id,...body});
    if(!q&&command==='/id'){await send({text:'Ваш Telegram ID: '+from.id});return true;}
    if(action==='news'||(!q&&command==='/news')){
      if(q)await api('answerCallbackQuery',{callback_query_id:q.id}).catch(()=>{});
      const old=store.profile(from.id).settings.newsMessage;
      const sent=await sendPublication(api,m.chat.id,store.content(),{reply_markup:buttons([[['← Меню','home']]])});
      if(sent?.message_id){store.configure(from.id,{newsMessage:sent.message_id});if(old)await api('deleteMessage',{chat_id:m.chat.id,message_id:old}).catch(()=>{});}return true;
    }
    const settings=store.profile(from.id).settings;
    if(!(action.startsWith('admin:')||(!q&&command==='/admin')||(!q&&settings.adminAwait&&admin&&!command.startsWith('/'))))return false;
    if(q)await api('answerCallbackQuery',{callback_query_id:q.id}).catch(()=>{});
    if(!admin){await send({text:'Нет доступа. Ваш ID: '+from.id+'. Владелец указывает администраторов в ADMIN_IDS.'});return true;}
    const preview=async draft=>sendPublication(api,m.chat.id,draft,{reply_markup:buttons([[['Опубликовать','admin:publish']],[['Название и ссылка кнопки','admin:button'],...(draft.button?[['Убрать кнопку','admin:no-button']]:[])],[['Отмена','admin:cancel']]])});
    if(action==='admin:edit'){
      const current=store.content();if(!current){await send({text:'Сначала создайте публикацию.'});return true;}
      const draft={...current,id:randomUUID()};store.configure(from.id,{adminDraft:draft,adminAwait:false});await preview(draft);return true;
    }
    if(action==='admin:button'){
      if(!settings.adminDraft){await send({text:'Сначала создайте публикацию.'});return true;}
      store.configure(from.id,{adminAwait:'button-title',adminButtonTitle:''});await send({text:'Как назвать кнопку? Отправьте название до 64 знаков.',reply_markup:buttons([[['Без кнопки','admin:no-button'],['Отмена','admin:cancel']]])});return true;
    }
    if(action==='admin:no-button'){
      if(!settings.adminDraft){await send({text:'Нет черновика. Создайте публикацию через /admin.'});return true;}
      const draft={...settings.adminDraft,button:null};store.configure(from.id,{adminDraft:draft,adminAwait:false,adminButtonTitle:''});await preview(draft);return true;
    }
    if(!q&&settings.adminAwait==='button-title'){
      const title=(m.text||'').trim();if(!title||title.length>64){await send({text:'Отправьте название кнопки от 1 до 64 знаков.'});return true;}
      store.configure(from.id,{adminButtonTitle:title,adminAwait:'button-url'});await send({text:'Теперь отправьте ссылку, начинающуюся с https://',reply_markup:buttons([[['Без кнопки','admin:no-button'],['Отмена','admin:cancel']]])});return true;
    }
    if(!q&&settings.adminAwait==='button-url'){
      const link=publicationButton({text:settings.adminButtonTitle,url:m.text||''});if(!link){await send({text:'Нужна корректная HTTPS-ссылка без логина и пароля, до 2048 знаков.'});return true;}
      if(!settings.adminDraft){store.configure(from.id,{adminAwait:false});await send({text:'Черновик уже закрыт. Откройте /admin.'});return true;}
      const draft={...settings.adminDraft,button:link};store.configure(from.id,{adminDraft:draft,adminAwait:false,adminButtonTitle:''});await preview(draft);return true;
    }
    if(action==='admin:new'){
      store.configure(from.id,{adminAwait:true,adminDraft:null});
      await send({text:'Отправьте текст (до 1000 знаков), фото, GIF или видео с подписью. Медиа — до 20 МБ, одно на публикацию. Затем покажу предпросмотр.',reply_markup:buttons([[['Отмена','admin:cancel']]])});return true;
    }
    if(action==='admin:publish'){
      const draft=settings.adminDraft;if(settings.adminAwait){await send({text:'Завершите ввод кнопки или выберите «Без кнопки».'});return true;}if(!draft){await send({text:'Нет черновика. Создайте публикацию через /admin.'});return true;}
      store.publish({...draft,publishedAt:new Date().toISOString()});store.configure(from.id,{adminDraft:null,adminAwait:false});
      await send({text:'Опубликовано. Карточка появится в боковом меню веба и подключённых APK, а в боте — в «Новости и объявления».',reply_markup:buttons([[['Админ-панель','admin:home']]])});return true;
    }
    if(action==='admin:remove'){
      await send({text:'Убрать текущую публикацию со всех трёх площадок?',reply_markup:buttons([[['Убрать','admin:remove-confirm'],['Отмена','admin:home']]])});return true;
    }
    if(action==='admin:remove-confirm'){store.publish(null);await send({text:'Публикация скрыта. Устройства обновят карточку при подключении.',reply_markup:buttons([[['Админ-панель','admin:home']]])});return true;}
    if(!q&&settings.adminAwait&&!command.startsWith('/')){
      const attachment=m.animation||m.video||m.photo?.at(-1),kind=m.animation?'animation':m.video?'video':m.photo?'photo':'text';
      const text=(m.caption||m.text||'').trim();
      if(text.length>1000||(!text&&!attachment)||m.document||m.media_group_id){await send({text:'Нужен текст до 1000 знаков или одно фото, GIF, видео с подписью. Альбомы и документы не поддерживаются.'});return true;}
      let media='';
      if(attachment){try{if(!saveMedia)throw Error();media=await saveMedia(attachment,kind);}catch{await send({text:'Не удалось подготовить медиа. Отправьте фото, GIF или MP4 до 20 МБ и попробуйте снова.'});return true;}}
      const draft={id:randomUUID(),text,kind,media,fileId:attachment?.file_id||''};store.configure(from.id,{adminDraft:draft,adminAwait:false});
      await preview(draft);return true;
    }
    store.configure(from.id,{adminAwait:false,adminDraft:null});
    await send({text:'Админ-панель · Новости и объявления\nОдна общая карточка для веба, APK и раздела новостей бота. Новая публикация заменяет предыдущую.',reply_markup:buttons([[['📱 APK: уведомления и оформление','admin:app:home']],[['📣 Рассылка','admin:b:list']],[['＋ Создать публикацию','admin:new']],[['Изменить текущую','admin:edit']],[['Посмотреть текущую','news'],['Убрать публикацию','admin:remove']],[['← Меню','home']]])});return true;
  };
}
