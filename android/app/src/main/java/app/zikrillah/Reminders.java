package app.zikrillah;
import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.time.ZoneId;
public final class Reminders extends BroadcastReceiver {
 static final String DAILY="app.zikrillah.DAILY";
 public static void channels(Context c){NotificationManager n=c.getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel("daily","Ежедневный зикр",NotificationManager.IMPORTANCE_DEFAULT));n.createNotificationChannel(new NotificationChannel("news","Объявления ZikriLLah",NotificationManager.IMPORTANCE_DEFAULT));}
 public static boolean notify(Context c,String channel,int id,String title,String body){
  channels(c);NotificationManager n=c.getSystemService(NotificationManager.class);if(!n.areNotificationsEnabled())return false;
  PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  try{n.notify(id,new Notification.Builder(c,channel).setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build());return true;}catch(SecurityException e){return false;}
 }
 public static void schedule(Context c){
  channels(c);ZikrStore s=ZikrStore.get(c);AlarmManager a=c.getSystemService(AlarmManager.class);
  PendingIntent intent=PendingIntent.getBroadcast(c,700,new Intent(c,Reminders.class).setAction(DAILY),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  a.cancel(intent);if(!s.enabled("dailyReminder",true))return;
  long at=ReminderTime.next(System.currentTimeMillis(),ZoneId.systemDefault(),s.number("reminderHour",7),s.number("reminderMinute",0));
  try { if(Build.VERSION.SDK_INT<31||a.canScheduleExactAlarms())a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent);else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent); } catch(SecurityException denied){a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent);}
 }
 @Override public void onReceive(Context c,Intent intent){ZikrStore s=ZikrStore.get(c);if(DAILY.equals(intent.getAction())&&s.enabled("dailyReminder",true)){boolean en="en".equals(s.value("language","ru"));notify(c,"daily",700,"ZikriLLah",en?"A quiet moment for dhikr. Open your counter.":"Время для зикра. Уделите несколько минут поминанию Аллаха.");}schedule(c);SyncJobs.schedule(c,true);}
 private static final java.util.concurrent.atomic.AtomicBoolean CHECKING=new java.util.concurrent.atomic.AtomicBoolean();
 private static volatile long nextCheck;
 public static void checkOnline(Context context){
  if(System.currentTimeMillis()<nextCheck||!SyncEngine.online(context)||!CHECKING.compareAndSet(false,true))return;
  nextCheck=System.currentTimeMillis()+30000;Context app=context.getApplicationContext();
  new Thread(()->{java.net.HttpURLConnection connection=null;try{
   String base=ZikrStore.get(app).value("base","");java.net.URI uri=java.net.URI.create(base);
   if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!(uri.getPath()==null||uri.getPath().isEmpty()))return;
   connection=(java.net.HttpURLConnection)new java.net.URL(base+"/api/content").openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(10000);
   if(connection.getResponseCode()!=200)return;java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
   try(java.io.InputStream input=connection.getInputStream()){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1){if(bytes.size()+count>2*1024*1024)return;bytes.write(buffer,0,count);}}
   news(app,new JSONObject(bytes.toString("UTF-8")).optJSONObject("experience"));
  }catch(Exception ignored){}finally{if(connection!=null)connection.disconnect();CHECKING.set(false);}},"zikr-notices").start();
 }
 public static synchronized void news(Context c,JSONObject experience){
  if(experience==null)return;ZikrStore s=ZikrStore.get(c);JSONArray items=experience.optJSONArray("notifications");if(items==null)return;
  try{JSONArray seen=new JSONArray(s.value("seenNotices","[]"));java.util.Set<String> ids=new java.util.HashSet<>();for(int i=0;i<seen.length();i++)ids.add(seen.optString(i));JSONArray keep=new JSONArray(seen.toString());
   for(int i=0;i<items.length();i++){JSONObject item=items.optJSONObject(i);if(item==null)continue;String id=item.optString("id");long at=item.optLong("at"),expires=item.optLong("expiresAt");boolean delivered=ids.contains(id);
    if(!delivered&&at<=System.currentTimeMillis()&&(expires==0||expires>System.currentTimeMillis())&&s.enabled("adminNotifications",true))delivered=notify(c,"news",id.hashCode(),"ZikriLLah",item.optString("text"));
    if(delivered&&!ids.contains(id)){keep.put(id);ids.add(id);}
   }s.put("seenNotices",keep.toString());
  }catch(JSONException ignored){}
 }
}
