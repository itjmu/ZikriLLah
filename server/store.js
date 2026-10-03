import {orderedCatalog,cycleIds,nextInCycle} from '../web/model.js';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import {builtinZikrs} from '../web/catalog.js';
export const zikrs=builtinZikrs.map(z=>z.id);
const hash = value => createHash('sha256').update(value).digest('hex');
export function createStore(dir) {
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(`${dir}/zikrillah.sqlite`);
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS events(user TEXT, id TEXT, zikr TEXT, at TEXT, PRIMARY KEY(user,id)); CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,user TEXT); CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY,user TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);`);
  db.exec(`PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS profiles(user TEXT PRIMARY KEY, name TEXT NOT NULL, public INTEGER NOT NULL DEFAULT 0, settings TEXT NOT NULL DEFAULT '{}'); CREATE INDEX IF NOT EXISTS events_at ON events(at);`);
  db.exec(`CREATE TABLE IF NOT EXISTS custom_zikrs(user TEXT,id TEXT,value TEXT,PRIMARY KEY(user,id));`);
  db.exec("CREATE TABLE IF NOT EXISTS deleted_zikrs(user TEXT,id TEXT,PRIMARY KEY(user,id));");
  db.exec('CREATE TABLE IF NOT EXISTS device_links(id TEXT PRIMARY KEY,secret_hash TEXT NOT NULL,user TEXT,expires INTEGER NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS broadcast_feed(id TEXT PRIMARY KEY,body TEXT NOT NULL)');
  return {
    db,
    sharedZikrs(){const r=db.prepare('SELECT value FROM meta WHERE key=?').get('app_experience');return r?(JSON.parse(r.value).zikrs||[]):[];},
    broadcastFeed(user){if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='broadcast_deliveries'").get())return [];return db.prepare("SELECT f.id,f.body FROM broadcast_feed f JOIN broadcast_deliveries d ON d.job=f.id WHERE d.user=? ORDER BY f.rowid DESC LIMIT 20").all(String(user)).map(r=>({id:r.id,...JSON.parse(r.body)}));},
    token(user){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO tokens VALUES(?,?)').run(hash(token),String(user));return token;},
    beginDevice(){
      db.prepare('DELETE FROM device_links WHERE expires<?').run(Date.now());
      if(db.prepare('SELECT COUNT(*) n FROM device_links').get().n>=1000)throw Error('Busy');
      const id=randomBytes(12).toString('hex'),secret=randomBytes(32).toString('hex');
      db.prepare('INSERT INTO device_links VALUES(?,?,NULL,?)').run(id,hash(secret),Date.now()+600000);return {id,secret};
    },
    approveDevice(id,user){return db.prepare('UPDATE device_links SET user=? WHERE id=? AND user IS NULL AND expires>?').run(String(user),id,Date.now()).changes===1;},
    pollDevice(id,secret){
      if(typeof secret!=='string'||!/^[a-f0-9]{64}$/.test(secret))return null;
      const row=db.prepare('SELECT * FROM device_links WHERE id=? AND secret_hash=? AND expires>?').get(id,hash(secret),Date.now());
      if(!row)return null;if(!row.user)return {pending:true};
      const token=hash('device-token:'+secret);db.prepare('INSERT OR IGNORE INTO tokens VALUES(?,?)').run(hash(token),row.user);return {token,account:String(row.user)};
    },
    catalog(user){const row=db.prepare('SELECT settings FROM profiles WHERE user=?').get(String(user));const settings=row?JSON.parse(row.settings):{};return orderedCatalog([...builtinZikrs,...this.sharedZikrs(),...this.customZikrs(user)],settings.zikrOrder||[],this.deletedZikrs(user));},
    deletedZikrs(user){return db.prepare('SELECT id FROM deleted_zikrs WHERE user=?').all(String(user)).map(r=>r.id);},
    deleteZikrs(user,ids=[]){if(!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||!/^custom-[a-f0-9-]{36}$/.test(id)))throw Error('Invalid deleted dhikr');
      const insert=db.prepare('INSERT OR IGNORE INTO deleted_zikrs VALUES(?,?)');for(const id of ids)insert.run(String(user),id);
    },
    customZikrs(user){return db.prepare('SELECT value FROM custom_zikrs WHERE user=? ORDER BY rowid').all(String(user)).map(r=>JSON.parse(r.value));},
    mergeZikrs(user,items=[]){
      if(!Array.isArray(items)||items.length>200)throw Error('Invalid custom dhikr');
      const cleaned=items.map(z=>{
        if(!z||!/^custom-[a-f0-9-]{36}$/.test(z.id)||typeof z.name!=='string'||!z.name.trim()||z.name.length>80||typeof z.arabic!=='string'||z.arabic.length>500||typeof z.meaning!=='string'||z.meaning.length>500)throw Error('Invalid custom dhikr');
        return {id:z.id,name:z.name.trim(),arabic:z.arabic,meaning:z.meaning};
      });
      const existing=this.customZikrs(user);if(new Set([...existing,...cleaned].map(z=>z.id)).size>200)throw Error('Too many custom dhikrs');
      for(const z of cleaned){const old=existing.find(x=>x.id===z.id);if(old&&JSON.stringify(old)!==JSON.stringify(z))throw Error('Conflicting dhikr');}
      const insert=db.prepare('INSERT OR IGNORE INTO custom_zikrs VALUES(?,?,?)');
      for(const z of cleaned)insert.run(String(user),z.id,JSON.stringify(z));
      return this.customZikrs(user);
    },
    content(){const row=db.prepare('SELECT value FROM meta WHERE key=?').get('publication');return row?JSON.parse(row.value):null;},
    publish(content){db.prepare('INSERT OR REPLACE INTO meta VALUES(?,?)').run('publication',JSON.stringify(content));},
    profile(user,name) {
      const id=String(user);
      const clean=String(name||'Участник').replace(/[\p{Cc}\p{Cf}]/gu,'').trim().slice(0,32)||'Участник';
      db.prepare('INSERT OR IGNORE INTO profiles(user,name) VALUES(?,?)').run(id,clean);
      if(name)db.prepare('UPDATE profiles SET name=? WHERE user=?').run(clean,id);
      const row=db.prepare('SELECT * FROM profiles WHERE user=?').get(id);
      const result={...row,settings:{selected:'subhanallah',goal:33,dailyGoal:900,autoNext:false,showText:true,utcOffset:300,...JSON.parse(row.settings)}};if(!this.catalog(user).some(z=>z.id===result.settings.selected))result.settings.selected=cycleIds(this.catalog(user),result.settings.cycleZikrs??null)[0];return result;
    },
    configure(user,patch) {
      const profile=this.profile(user);const next={...profile.settings,...patch};
      if(!this.catalog(user).some(z=>z.id===next.selected)||!Number.isInteger(next.goal)||next.goal<1||next.goal>100000||!Number.isInteger(next.dailyGoal)||next.dailyGoal<1||next.dailyGoal>100000||!Number.isInteger(next.utcOffset)||next.utcOffset < -720||next.utcOffset>840||typeof next.autoNext!=='boolean'||typeof next.showText!=='boolean')throw new Error('Invalid settings');
      db.prepare('UPDATE profiles SET settings=? WHERE user=?').run(JSON.stringify(next),String(user));return next;
    },
    participation(user,enabled){this.profile(user);db.prepare('UPDATE profiles SET public=? WHERE user=?').run(enabled?1:0,String(user));},
    botTap(user,event){
      const ids=this.catalog(user).map(z=>z.id);
      if(!ids.includes(event.zikr)||!Number.isFinite(Date.parse(event.at)))throw new Error('Invalid bot event');
      db.exec('BEGIN IMMEDIATE');
      try{
        const inserted=db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?)').run(String(user),event.id,event.zikr,event.at).changes;
        if(inserted){const settings=this.profile(user).settings;settings.selected=event.zikr;
          const count=db.prepare('SELECT COUNT(*) AS n FROM events WHERE user=? AND zikr=?').get(String(user),event.zikr).n;
          if(settings.autoNext&&count%settings.goal===0)settings.selected=nextInCycle(this.catalog(user),settings.cycleZikrs??null,event.zikr);
          this.configure(user,settings);
        }
        db.exec('COMMIT');return Boolean(inserted);
      }catch(e){db.exec('ROLLBACK');throw e;}
    },
    ranking(since,until){
      return db.prepare(`SELECT p.user,p.name,COUNT(*) AS count FROM events e JOIN profiles p ON p.user=e.user AND p.public=1 WHERE julianday(e.at)>=julianday(?) AND julianday(e.at)<=julianday(?) GROUP BY p.user,p.name ORDER BY count DESC,p.user ASC`).all(since,until);
    },
    code(user) {
      const code = randomBytes(12).toString('hex');
      db.prepare('DELETE FROM codes WHERE user=? OR expires<?').run(String(user), Date.now());
      db.prepare('INSERT INTO codes VALUES(?,?,?)').run(hash(code), String(user), Date.now()+600000);
      return code;
    },
    redeem(code) {
      const row = db.prepare('SELECT * FROM codes WHERE hash=? AND expires>?').get(hash(code), Date.now());
      if (!row) return null;
      const token = randomBytes(32).toString('hex');
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM codes WHERE hash=?').run(hash(code));
        db.prepare('INSERT INTO tokens VALUES(?,?)').run(hash(token), row.user);
        db.exec('COMMIT');
      } catch(e) { db.exec('ROLLBACK'); throw e; }
      return token;
    },
    user(token) { return db.prepare('SELECT user FROM tokens WHERE hash=?').get(hash(token))?.user; },
    cursor(user){return db.prepare("SELECT COALESCE(MAX(rowid),0) AS cursor FROM events WHERE user=?").get(String(user)).cursor;},
    sync(user, events, customZikrs=[],deletedZikrs=[],cursor=0) {
      if(!Number.isSafeInteger(cursor)||cursor<0)throw Error("Invalid cursor");
      this.mergeZikrs(user,customZikrs);this.deleteZikrs(user,deletedZikrs);
      const ids=[...builtinZikrs,...this.sharedZikrs(),...this.customZikrs(user)].map(z=>z.id);
      if (!Array.isArray(events) || events.length > 5000 || events.some(e => !e || typeof e.id !== 'string' || !/^[a-zA-Z0-9-]{8,100}$/.test(e.id) || !ids.includes(e.zikr) || typeof e.at !== 'string' || !Number.isFinite(Date.parse(e.at)))) throw new Error('Invalid events');
      const insert = db.prepare('INSERT OR IGNORE INTO events VALUES(?,?,?,?)');
      db.exec('BEGIN');
      try { for (const e of events) insert.run(String(user),e.id,e.zikr,e.at); db.exec('COMMIT'); }
      catch(e) { db.exec('ROLLBACK'); throw e; }
      return db.prepare('SELECT id,zikr,at FROM events WHERE user=? AND rowid>? ORDER BY at,id').all(String(user),cursor);
    }
  };
}
