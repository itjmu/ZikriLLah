import {telegramUser} from './telegram-auth.js';
import {publicExperience} from './experience.js';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {publicContent} from '../bot/publications.js';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
const files = { '/':'index.html', '/app.js':'app.js', '/model.js':'model.js', '/reorder.js':'reorder.js', '/experience.js':'experience.js', '/catalog.js':'catalog.js', '/publication.js':'publication.js', '/links.js':'links.js', '/haptics.js':'haptics.js', '/style.css':'style.css', '/sw.js':'sw.js', '/manifest.webmanifest':'manifest.webmanifest', '/icon.svg':'icon.svg' };
const mime = { html:'text/html; charset=utf-8', js:'text/javascript', css:'text/css', wav:'audio/wav', webmanifest:'application/manifest+json', svg:'image/svg+xml' };
export function createAppServer(store,dir='./data',auth={}){return http.createServer(async(req,res) => {
  const send = (status,data) => { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if(req.method==='GET'&&path==='/api/content')return send(200,{content:publicContent(store.content()),experience:publicExperience(store)});
    if(req.method==='GET'&&/^\/media\/[a-f0-9-]{36}\.(jpg|png|gif|webp|mp4)$/.test(path)){
      let data;try{data=await readFile(join(dir,path.slice(1)));}catch{return send(404,{error:'Не найдено'});}
      const type={jpg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',mp4:'video/mp4'}[path.split('.').pop()];
      const headers={'Content-Type':type,'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
      if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);const start=m?Number(m[1]):NaN,end=m&&m[2]?Math.min(Number(m[2]),data.length-1):data.length-1;
        if(!Number.isInteger(start)||start>end||start>=data.length){res.writeHead(416,{'Content-Range':'bytes */'+data.length});return res.end();}
        res.writeHead(206,{...headers,'Content-Range':'bytes '+start+'-'+end+'/'+data.length,'Content-Length':end-start+1});return res.end(data.subarray(start,end+1));}
      res.writeHead(200,{...headers,'Content-Length':data.length});return res.end(data);
    }
    if (req.method === 'POST' && ['/api/link','/api/sync','/api/auth/telegram','/api/auth/device','/api/auth/poll'].includes(path)) {
      let body='';
      for await (const chunk of req) { body+=chunk; if(Buffer.byteLength(body)>2000000) return send(413,{error:'Слишком большой запрос'}); }
      let data; try { data=JSON.parse(body); } catch { return send(400,{error:'Некорректный JSON'}); }
      if(path==='/api/auth/telegram'){
        let profile;try{profile=telegramUser(data?.initData,auth.botToken||process.env.BOT_TOKEN);}catch{return send(401,{error:'Telegram login invalid or expired'});}
        const previous=store.user((req.headers.authorization||'').replace(/^Bearer /,''));
        if(previous&&previous!==String(profile.id))return send(409,{error:'Другой Telegram-аккаунт уже подключён. Откройте приложение в отдельном профиле браузера.'});
        store.profile(profile.id,profile.first_name);return send(200,{token:previous?(req.headers.authorization||'').slice(7):store.token(profile.id)});
      }
      if(path==='/api/auth/device'){
        const username=auth.botUsername||process.env.BOT_USERNAME;
        if(!/^[a-zA-Z0-9_]{5,32}$/.test(username||''))return send(503,{error:'Bot is not configured'});
        try{const result=store.beginDevice();return send(200,{...result,url:'https://t.me/'+username+'?start=connect_'+result.id});}catch{return send(429,{error:'Try later'});}
      }
      if(path==='/api/auth/poll'){
        if(typeof data?.id!=='string'||!/^[a-f0-9]{24}$/.test(data.id))return send(400,{error:'Invalid request'});
        const result=store.pollDevice(data.id,data.secret);return result?send(200,result):send(410,{error:'Connection request expired'});
      }
      if(path==='/api/link') {
        if(typeof data?.code !== 'string' || !/^[a-f0-9]{24}$/.test(data.code)) return send(400,{error:'Некорректный код'});
        const token=store.redeem(data.code);
        return token ? send(200,{token}) : send(400,{error:'Код истёк или уже использован. Получите /link в боте.'});
      }
      const user=store.user((req.headers.authorization || '').replace(/^Bearer /,''));
      if(!user) return send(401,{error:'Привяжите устройство через /link в боте'});
      try { return send(200,{events:store.sync(user,data?.events,data?.customZikrs,data?.deletedZikrs,data?.cursor),cursor:store.cursor(user),customZikrs:store.customZikrs(user),deletedZikrs:store.deletedZikrs(user),content:publicContent(store.content()),experience:publicExperience(store)}); } catch { return send(400,{error:'Некорректные записи'}); }
    }
    if(/^\/sounds\/(beads|water|rain|stones|soft)\.wav$/.test(path))files[path]=path.slice(1);
    if(req.method!=='GET' || !files[path]) return send(404,{error:'Не найдено'});
    const file=files[path];
    res.writeHead(200,{'Content-Type':mime[file.split('.').pop()], 'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
    res.end(await readFile(fileURLToPath(new URL(`../web/${file}`,import.meta.url))));
  } catch { if(!res.headersSent) send(500,{error:'Ошибка сервера'}); else res.end(); }
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dir=process.env.DATA_DIR||'./data',store=createStore(dir);
  createAppServer(store,dir).listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('ZikriLLah: http://localhost:'+(process.env.PORT||3000)));
}
