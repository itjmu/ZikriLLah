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
  a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,intent);
 }
 @Override public void onReceive(Context c,Intent intent){ZikrStore s=ZikrStore.get(c);if(DAILY.equals(intent.getAction())&&s.enabled("dailyReminder",true)){boolean en="en".equals(s.value("language","ru"));notify(c,"daily",700,"ZikriLLah",en?"A quiet moment for dhikr. Open your counter.":"Время для зикра. Уделите несколько минут поминанию Аллаха.");}schedule(c);SyncJobs.schedule(c,true);}
 public static void news(Context c,JSONObject experience){
  if(experience==null)return;ZikrStore s=ZikrStore.get(c);JSONArray items=experience.optJSONArray("notifications");if(items==null)return;
  try{JSONArray seen=new JSONArray(s.value("seenNotices","[]"));java.util.Set<String> ids=new java.util.HashSet<>();for(int i=0;i<seen.length();i++)ids.add(seen.optString(i));JSONArray keep=new JSONArray();
   for(int i=0;i<items.length();i++){JSONObject item=items.optJSONObject(i);if(item==null)continue;String id=item.optString("id");long at=item.optLong("at"),expires=item.optLong("expiresAt");boolean delivered=ids.contains(id);
    if(!delivered&&at<=System.currentTimeMillis()&&expires>System.currentTimeMillis()&&s.enabled("adminNotifications",true))delivered=notify(c,"news",id.hashCode(),"ZikriLLah",item.optString("text"));
    if(delivered)keep.put(id);
   }s.put("seenNotices",keep.toString());
  }catch(JSONException ignored){}
 }
}
