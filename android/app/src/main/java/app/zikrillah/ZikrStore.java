package app.zikrillah;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import org.json.*;
import java.time.*;
import java.util.*;

/** One transactional store shared by the UI and background jobs. */
public final class ZikrStore extends SQLiteOpenHelper {
    private final JSONArray builtin;
    private JSONArray catalogCache;
    private final Map<String,String> settingsCache=new HashMap<>();
    private static ZikrStore instance;
    public static synchronized ZikrStore get(Context context){
        if(instance==null){instance=new ZikrStore(context.getApplicationContext());instance.migrate(context.getApplicationContext());instance.prepareCounts();}
        return instance;
    }
    private ZikrStore(Context c){super(c,"zikrillah.db",null,1);setWriteAheadLoggingEnabled(true);try(java.io.InputStream in=c.getAssets().open("zikrs.json")){java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[4096];int n;while((n=in.read(chunk))!=-1)bytes.write(chunk,0,n);builtin=new JSONArray(bytes.toString("UTF-8"));}catch(Exception e){throw new IllegalStateException("Catalog unavailable",e);}}
    public synchronized JSONArray customZikrs(){try{return new JSONArray(value("customZikrs","[]"));}catch(JSONException e){throw new IllegalStateException(e);}}
    private List<String> ids(String key){List<String> result=new ArrayList<>();try{JSONArray values=new JSONArray(value(key,"[]"));for(int i=0;i<values.length();i++)result.add(values.optString(i));}catch(JSONException ignored){}return result;}
    public synchronized JSONArray deletedZikrs(){return new JSONArray(ids("deletedZikrs"));}
    public synchronized void mergeDeleted(JSONArray remote){List<String> ids=ids("deletedZikrs");for(int i=0;i<remote.length();i++){String id=remote.optString(i);if(id.startsWith("custom-")&&!ids.contains(id))ids.add(id);}put("deletedZikrs",new JSONArray(ids).toString());}
    public synchronized void deleteZikr(String id){if(!id.startsWith("custom-"))return;mergeDeleted(new JSONArray().put(id));}
    public synchronized JSONArray catalog(){if(catalogCache!=null)return catalogCache;
        Map<String,JSONObject> available=new LinkedHashMap<>();List<String> deleted=ids("deletedZikrs");
        for(int i=0;i<builtin.length();i++){JSONObject z=builtin.optJSONObject(i);available.put(z.optString("id"),z);}
        JSONArray shared=Experience.data(this).optJSONArray("zikrs");if(shared!=null)for(int i=0;i<shared.length();i++){JSONObject z=shared.optJSONObject(i);if(z!=null)available.put(z.optString("id"),z);}
        JSONArray custom=customZikrs();for(int i=0;i<custom.length();i++){JSONObject z=custom.optJSONObject(i);if(!deleted.contains(z.optString("id")))available.put(z.optString("id"),z);}
        JSONArray list=new JSONArray();for(String id:ids("zikrOrder")){JSONObject z=available.remove(id);if(z!=null)list.put(z);}for(JSONObject z:available.values())list.put(z);catalogCache=list;return list;
    }
    public synchronized List<String> cycle(){JSONArray list=catalog();List<String> chosen=ids("cycleZikrs"),result=new ArrayList<>();boolean all=value("cycleZikrs","").isEmpty();for(int i=0;i<list.length();i++){String id=list.optJSONObject(i).optString("id");if(all||chosen.contains(id))result.add(id);}if(result.isEmpty())result.add(list.optJSONObject(0).optString("id"));return result;}
    public synchronized void applyCycle(List<String> order,List<String> chosen){if(chosen.isEmpty())return;SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{put("zikrOrder",new JSONArray(order).toString());put("cycleZikrs",new JSONArray(chosen).toString());put("autoNext","true");if(!chosen.contains(value("selectedId","")))put("selectedId",chosen.get(0));db.setTransactionSuccessful();}finally{db.endTransaction();}}
    public synchronized void toggleCycle(String id){List<String> chosen=cycle();if(chosen.contains(id)){if(chosen.size()==1)return;chosen.remove(id);}else chosen.add(id);put("cycleZikrs",new JSONArray(chosen).toString());put("autoNext","true");if(!chosen.contains(value("selectedId","")))put("selectedId",chosen.get(0));}
    public synchronized void moveZikr(int index,int delta){JSONArray list=catalog();int target=index+delta;if(target<0||target>=list.length())return;List<String> order=new ArrayList<>();for(int i=0;i<list.length();i++)order.add(list.optJSONObject(i).optString("id"));Collections.swap(order,index,target);put("zikrOrder",new JSONArray(order).toString());}
    public synchronized int selectedIndex(){JSONArray list=catalog();String id=value("selectedId","");if(!id.isEmpty())for(int i=0;i<list.length();i++)if(id.equals(list.optJSONObject(i).optString("id")))return i;if(!id.isEmpty()){String next=cycle().get(0);put("selectedId",next);for(int i=0;i<list.length();i++)if(next.equals(list.optJSONObject(i).optString("id")))return i;}int index=Math.max(0,Math.min(number("selected",0),list.length()-1));put("selectedId",list.optJSONObject(index).optString("id"));return index;}
    public synchronized void select(int index){put("selected",String.valueOf(index));put("selectedId",zikr(index).optString("id"));}
    public synchronized JSONObject zikr(int index){JSONArray list=catalog();return list.optJSONObject(Math.max(0,Math.min(index,list.length()-1)));}
    public synchronized void mergeZikrs(JSONArray remote)throws JSONException{
        JSONArray local=customZikrs();Set<String> ids=new HashSet<>();for(int i=0;i<local.length();i++)ids.add(local.getJSONObject(i).getString("id"));
        for(int i=0;i<remote.length();i++){JSONObject item=remote.getJSONObject(i);if(ids.add(item.getString("id")))local.put(item);}put("customZikrs",local.toString());
    }
    public synchronized void createZikr(String name,String arabic,String meaning)throws JSONException{
        JSONArray list=customZikrs();if(list.length()>=200||name.trim().isEmpty()||name.length()>80||arabic.length()>500||meaning.length()>500)throw new IllegalArgumentException("Invalid dhikr");
        list.put(new JSONObject().put("id","custom-"+UUID.randomUUID()).put("name",name.trim()).put("arabic",arabic.trim()).put("meaning",meaning.trim()));
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{put("customZikrs",list.toString());put("selectedId",list.optJSONObject(list.length()-1).optString("id"));db.setTransactionSuccessful();}finally{db.endTransaction();}
    }
    @Override public void onCreate(SQLiteDatabase db){
        db.execSQL("CREATE TABLE events(id TEXT PRIMARY KEY, zikr TEXT NOT NULL, at TEXT NOT NULL, pending INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    }
    private synchronized void prepareCounts(){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{
        db.execSQL("CREATE INDEX IF NOT EXISTS events_pending ON events(pending)");
        db.execSQL("CREATE TABLE IF NOT EXISTS event_counts(zikr TEXT PRIMARY KEY,n INTEGER NOT NULL)");
        if(!"1".equals(value("countsReady",""))){db.execSQL("INSERT OR REPLACE INTO event_counts SELECT zikr,COUNT(*) FROM events GROUP BY zikr");put("countsReady","1");}
        db.execSQL("CREATE TRIGGER IF NOT EXISTS count_new_event AFTER INSERT ON events BEGIN INSERT OR IGNORE INTO event_counts(zikr,n) VALUES(NEW.zikr,0); UPDATE event_counts SET n=n+1 WHERE zikr=NEW.zikr; END");
        db.setTransactionSuccessful();
    }finally{db.endTransaction();}}
    public synchronized int total(){return (int)android.database.DatabaseUtils.longForQuery(getReadableDatabase(),"SELECT COALESCE(SUM(n),0) FROM event_counts",null);}
    public synchronized int countFor(int index){String id=zikr(index).optString("id");return (int)android.database.DatabaseUtils.longForQuery(getReadableDatabase(),"SELECT COALESCE((SELECT n FROM event_counts WHERE zikr=?),0)",new String[]{id});}
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion){}
    private synchronized void migrate(Context c){
        if("1".equals(value("migrated","")))return;
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try{
            JSONObject old=new JSONObject(c.getSharedPreferences("zikrillah",Context.MODE_PRIVATE).getString("state","{}"));
            JSONArray pending=old.optJSONArray("pending"),events=old.optJSONArray("events");
            Set<String> queued=new HashSet<>();if(pending!=null)for(int i=0;i<pending.length();i++)queued.add(pending.getJSONObject(i).getString("id"));
            if(events!=null)for(int i=0;i<events.length();i++){JSONObject e=events.getJSONObject(i);insert(db,e,queued.contains(e.getString("id"))?1:0);}
            if(pending!=null)for(int i=0;i<pending.length();i++)insert(db,pending.getJSONObject(i),1);
            for(String key:new String[]{"selected","goal","token","base"})if(old.has(key))put(key,old.get(key).toString());
            put("migrated","1");db.setTransactionSuccessful();
        }catch(JSONException e){throw new IllegalStateException("Старые данные не прочитаны. Они сохранены без изменений.",e);}
        finally{db.endTransaction();}
    }
    public synchronized String value(String key,String fallback){SQLiteDatabase db=getReadableDatabase();if(!db.inTransaction()&&settingsCache.containsKey(key))return settingsCache.get(key);try(Cursor c=db.rawQuery("SELECT value FROM settings WHERE key=?",new String[]{key})){if(!c.moveToFirst())return fallback;String result=c.getString(0);if(!db.inTransaction())settingsCache.put(key,result);return result;}}
    public synchronized int number(String key,int fallback){try{return Integer.parseInt(value(key,String.valueOf(fallback)));}catch(NumberFormatException e){return fallback;}}
    public synchronized boolean enabled(String key,boolean fallback){return Boolean.parseBoolean(value(key,String.valueOf(fallback)));}
    public synchronized void put(String key,String value){settingsCache.remove(key);if(key.equals("experience")||key.equals("customZikrs")||key.equals("zikrOrder")||key.equals("deletedZikrs"))catalogCache=null;ContentValues values=new ContentValues();values.put("key",key);values.put("value",value);getWritableDatabase().insertWithOnConflict("settings",null,values,SQLiteDatabase.CONFLICT_REPLACE);}
    public synchronized void bind(String base,String token){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{put("base",base);put("token",token);put("serverCursor","0");put("syncRetryAt","0");db.setTransactionSuccessful();}finally{db.endTransaction();}}
    public synchronized long nextSync(){long retry;try{retry=Long.parseLong(value("dailyRetryAt","0"));}catch(NumberFormatException e){retry=0;}return SyncPolicy.next(System.currentTimeMillis(),ZoneId.systemDefault(),value("dailySyncSuccess",""),retry);}
    public synchronized boolean claimSync(){return nextSync()<=System.currentTimeMillis();}
    public synchronized void requestSync(){put("syncRequested","true");}
    public synchronized boolean needsSync(){return enabled("syncRequested",false)||queued()>0;}
    public synchronized boolean linked(){return !value("token","").isEmpty();}
    private void insert(SQLiteDatabase db,JSONObject e,int pending)throws JSONException{
        ContentValues values=new ContentValues();values.put("id",e.getString("id"));values.put("zikr",e.getString("zikr"));values.put("at",e.getString("at"));values.put("pending",pending);
        db.insertWithOnConflict("events",null,values,SQLiteDatabase.CONFLICT_IGNORE);
    }
    public synchronized boolean add(int selected,int goal,boolean autoNext)throws JSONException{
        SQLiteDatabase db=getWritableDatabase();db.beginTransaction();
        try{
            JSONObject event=new JSONObject().put("id",UUID.randomUUID().toString()).put("zikr",zikr(selected).optString("id")).put("at",Instant.now().toString());insert(db,event,1);
            long count=countFor(selected);
            boolean completed=count%goal==0;if(completed&&autoNext){List<String> chosen=cycle();put("selectedId",chosen.get((chosen.indexOf(event.optString("zikr"))+1)%chosen.size()));}
            db.setTransactionSuccessful();return completed;
        }finally{db.endTransaction();}
    }
    public synchronized JSONArray pending()throws JSONException{
        JSONArray array=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT id,zikr,at FROM events WHERE pending=1 ORDER BY rowid LIMIT 5000",null)){while(c.moveToNext())array.put(new JSONObject().put("id",c.getString(0)).put("zikr",c.getString(1)).put("at",c.getString(2)));}return array;
    }
    public synchronized int queued(){return (int)android.database.DatabaseUtils.longForQuery(getReadableDatabase(),"SELECT COUNT(*) FROM events WHERE pending=1",null);}
    public void acknowledge(JSONArray sent,JSONArray remote)throws JSONException{
        // Short transactions allow foreground taps between incoming history chunks.
        for(int offset=0;offset<remote.length();offset+=250){synchronized(this){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{for(int i=offset;i<Math.min(remote.length(),offset+250);i++)insert(db,remote.getJSONObject(i),0);db.setTransactionSuccessful();}finally{db.endTransaction();}}}
        synchronized(this){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{for(int i=0;i<sent.length();i++)db.execSQL("UPDATE events SET pending=0 WHERE id=?",new Object[]{sent.getJSONObject(i).getString("id")});put("lastSync",Instant.now().toString());db.setTransactionSuccessful();}finally{db.endTransaction();}}
    }
    public synchronized PracticeStats stats(int selected,int goal){
        PracticeStats result=new PracticeStats(goal,LocalDate.now(),ZoneId.systemDefault());String selectedId=zikr(selected).optString("id");
        try(Cursor c=getReadableDatabase().rawQuery("SELECT zikr,at FROM events",null)){while(c.moveToNext())result.add(c.getString(0).equals(selectedId),c.getString(1));}return result;
    }
}
