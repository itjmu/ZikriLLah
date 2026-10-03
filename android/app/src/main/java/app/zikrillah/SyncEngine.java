package app.zikrillah;

import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

public final class SyncEngine {
    private static final ExecutorService EXECUTOR=Executors.newSingleThreadExecutor();
    private static final AtomicBoolean RUNNING=new AtomicBoolean();
    public static volatile boolean needsLogin;
    public static volatile String status="Прогресс сохраняется на устройстве";
    public interface Completion {void finish(boolean retry);}
    public static void start(Context context,Completion done){start(context,false,done);}
    public static void start(Context context,boolean manual,Completion done){
        Context app=context.getApplicationContext();ZikrStore store=ZikrStore.get(app);
        if(!store.linked()||!online(context)){if(!manual&&store.linked())store.put("dailyRetryAt",String.valueOf(System.currentTimeMillis()+900000));status="Нет сети или Telegram не подключён · прогресс сохранён";if(done!=null)done.finish(false);return;}
        if(!RUNNING.compareAndSet(false,true)){if(done!=null)done.finish(true);return;}
        EXECUTOR.execute(()->{
            boolean retry=false;
            try{
                if(!manual&&!store.claimSync()){status="Прогресс сохранён · обмен позже";return;}
                
                store.put("syncRequested","false");
                needsLogin=false;status="Объединяем прогресс…";
                // Drain durable batches, including records added while the request was running.
                do{
                    JSONArray batch=store.pending();
                    JSONObject response=request(store.value("base",""),"/api/sync",new JSONObject().put("events",batch).put("customZikrs",store.customZikrs()).put("deletedZikrs",store.deletedZikrs()).put("cursor",Long.parseLong(store.value("serverCursor","0"))),store.value("token",""));
                    store.mergeZikrs(response.optJSONArray("customZikrs")==null?new JSONArray():response.getJSONArray("customZikrs"));
                    store.mergeDeleted(response.optJSONArray("deletedZikrs")==null?new JSONArray():response.optJSONArray("deletedZikrs"));
                    store.acknowledge(batch,response.getJSONArray("events"));
                    store.put("serverCursor",String.valueOf(response.optLong("cursor",0)));store.put("syncRetryAt","0");
                    Experience.accept(app,store,response.optJSONObject("experience"));
                    store.put("publication",response.isNull("content")?"null":response.optString("content","null"));
                    store.put("broadcasts",response.optJSONArray("broadcasts")==null?"[]":response.optJSONArray("broadcasts").toString());
                    store.put("account",response.optString("account",""));store.put("botUsername",response.optString("botUsername",""));

                }while(store.queued()>0);
                if(!manual)store.put("dailySyncSuccess",SyncPolicy.day(System.currentTimeMillis(),java.time.ZoneId.systemDefault()));store.put("dailyRetryAt","0");
                retry=store.queued()>0;if(retry)store.requestSync();status=retry?"Прогресс сохранён · отправляем очередь":"Всё сохранено и синхронизировано";
            }catch(Exception e){needsLogin=e instanceof AuthException;store.requestSync();if(!manual)store.put("dailyRetryAt",String.valueOf(System.currentTimeMillis()+15*60*1000L));retry=true;status=e instanceof AuthException?"Привязка недействительна · проверьте аккаунт":"Офлайн или сервер недоступен · прогресс на устройстве";}
            finally{RUNNING.set(false);SyncJobs.schedule(app,true);if(done!=null)done.finish(retry);}
        });
    }
    public static boolean online(Context c){android.net.ConnectivityManager m=c.getSystemService(android.net.ConnectivityManager.class);android.net.NetworkCapabilities caps=m.getNetworkCapabilities(m.getActiveNetwork());return caps!=null&&caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED);}
    public static JSONObject request(String base,String path,JSONObject body,String token)throws Exception{
        URI uri=URI.create(base);if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!(uri.getPath()==null||uri.getPath().isEmpty()))throw new IOException("Нужен HTTPS-адрес сервера без пути");
        HttpURLConnection c=(HttpURLConnection)new URL(base+path).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(15000);c.setRequestMethod("POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.setRequestProperty("Authorization","Bearer "+token);
        try{try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}
            int code=c.getResponseCode();if(code==401)throw new AuthException();if(code!=200)throw new IOException("Проверьте адрес сервера и одноразовый код");
            try(InputStream in=c.getInputStream();ByteArrayOutputStream buffer=new ByteArrayOutputStream()){byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1)buffer.write(bytes,0,n);return new JSONObject(buffer.toString("UTF-8"));}
        }finally{c.disconnect();}
    }
    private static final class AuthException extends IOException {}
}
