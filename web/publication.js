import {publicationButton} from './links.js';
export function renderPublication(container,post,language='ru'){
  const signature=JSON.stringify([post,language]);if(container.dataset.signature===signature)return;container.dataset.signature=signature;container.replaceChildren();
  const title=document.createElement('h3');title.textContent=language==='en'?'News & announcements':'Новости и объявления';container.append(title);
  if(!post){const text=document.createElement('p');text.className='muted';text.textContent=language==='en'?'Updates will appear here.':'Здесь появятся новости и объявления.';container.append(text);return;}
  if(/^\/media\/[a-f0-9-]{36}\.(jpg|png|gif|webp|mp4)$/.test(post.media||'')){
    const video=post.media.endsWith('.mp4'),media=document.createElement(video?'video':'img');media.src=post.media;
    if(video){media.controls=true;media.playsInline=true;media.preload='none';media.loop=post.kind==='animation';}else{media.alt=language==='en'?'Publication image':'Изображение публикации';media.loading='lazy';}
    container.append(media);
  }
  const text=document.createElement('p');text.textContent=post.text;container.append(text);
  const button=publicationButton(post.button);if(button){const link=document.createElement('a');link.className='publication-link';link.textContent=button.text;link.href=button.url;link.target='_blank';link.rel='noopener noreferrer';container.append(link); }
}
