const hex=/^#[0-9a-f]{6}$/i;
const path=/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/;
export const builtInThemes=['emerald','light','dark','black'];
export function validBackground(value){return value===''||(typeof value==='string'&&path.test(value));}
function luminance(color){return color.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function themeFromText(text,id){
 const [name,...colors]=String(text).split('|').map(x=>x.trim());
 if(!name||name.length>40||colors.length!==4||!colors.every(x=>hex.test(x)))throw Error('Format');
 const [background,surface,accent,foreground]=colors;
 if(contrast(foreground,background)<4.5||contrast(foreground,surface)<4.5||contrast(accent,background)<3)throw Error('Contrast');
 return {id,name,background,surface,accent,text:foreground};
}
export function readExperience(store){
 const row=store.db.prepare('SELECT value FROM meta WHERE key=?').get('app_experience');return row?JSON.parse(row.value):{themes:[],active:null,backgrounds:{main:'',menu:''},notifications:[]};
}
export function saveExperience(store,value){store.db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('app_experience',JSON.stringify(value));}
export function publicExperience(store,now=Date.now()){
 const value=readExperience(store);return {...value,active:value.active&&value.active.expiresAt>now?value.active:null,notifications:value.notifications.filter(n=>n.expiresAt>now).slice(-20)};
}
