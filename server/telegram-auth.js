import {createHmac,timingSafeEqual} from 'node:crypto';

export function telegramUser(raw,botToken,now=Math.floor(Date.now()/1000)){
  if(typeof raw!=='string'||raw.length>16384||!botToken)throw Error('Invalid Telegram login');
  const params=new URLSearchParams(raw),seen=new Set();
  for(const [key] of params){if(seen.has(key))throw Error('Duplicate field');seen.add(key);}
  const hash=params.get('hash');if(!/^[a-f0-9]{64}$/.test(hash||''))throw Error('Invalid signature');
  params.delete('hash');
  const check=[...params].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>k+'='+v).join('\n');
  const key=createHmac('sha256','WebAppData').update(botToken).digest();
  const expected=createHmac('sha256',key).update(check).digest();
  if(!timingSafeEqual(expected,Buffer.from(hash,'hex')))throw Error('Invalid signature');
  const at=Number(params.get('auth_date'));if(!Number.isInteger(at)||at>now+30||now-at>3600)throw Error('Expired login');
  const user=JSON.parse(params.get('user')||'null');
  if(!user||!Number.isSafeInteger(user.id)||user.id<=0)throw Error('Invalid user');
  return user;
}
