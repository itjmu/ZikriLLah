export function effectiveTheme(preferred,experience,now=Date.now()){const active=experience?.active;return active&&Number(active.expiresAt)>now?active.id:preferred;}
export function backgroundPath(value){return typeof value==='string'&&/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(value)?value:'';}
export function applyExperience(document,state){
 const root=document.documentElement,config=state.experience||{},theme=effectiveTheme(state.theme,config);
 root.dataset.theme=state.stealth?'stealth':theme;
 const custom=!state.stealth&&config.themes?.find(t=>t.id===theme);
 for(const [property,key] of [['--bg','background'],['--surface','surface'],['--accent','accent'],['--text','text'],['--muted','text']]){if(custom&&/^#[0-9a-f]{6}$/i.test(custom[key]))root.style.setProperty(property,custom[key]);else root.style.removeProperty(property);}
 for(const [id,target] of [['surface','main'],['drawer','menu']]){const path=state.stealth?'':backgroundPath(config.backgrounds?.[target]),element=document.getElementById(id);element.style.backgroundImage=path?'linear-gradient(color-mix(in srgb,var(--bg) 82%,transparent),color-mix(in srgb,var(--bg) 82%,transparent)),url("'+path+'")':'';element.style.backgroundSize='cover';element.style.backgroundPosition='center';}
}
