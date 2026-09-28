export function publicationButton(value){
  if(!value||typeof value.text!=='string'||typeof value.url!=='string')return null;
  const text=value.text.trim(),raw=value.url.trim();if(!text||text.length>64||raw.length>2048)return null;
  try{const url=new URL(raw);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)return null;return {text,url:url.href};}catch{return null;}
}
