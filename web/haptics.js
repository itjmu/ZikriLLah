export function createHaptics({navigator:nav=globalThis.navigator,telegram=()=>globalThis.Telegram?.WebApp,now=()=>Date.now()}={}){
  let holdUntil=0;
  return complete=>{
    if(!complete&&now()<holdUntil)return 'held';
    const tg=telegram();
    try{if(tg?.platform&&tg.platform!=='unknown'&&tg.isVersionAtLeast?.('6.1')&&tg.HapticFeedback){
      if(complete)tg.HapticFeedback.notificationOccurred('success');else tg.HapticFeedback.impactOccurred('medium');
      if(complete)holdUntil=now()+320;return 'telegram';
    }}catch{}
    try{if(nav?.vibrate?.(complete?320:75)){if(complete)holdUntil=now()+320;return 'browser';}}catch{}
    return 'unavailable';
  };
}
