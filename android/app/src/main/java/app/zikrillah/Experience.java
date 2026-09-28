package app.zikrillah;
import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.*;
import org.json.*;
import java.io.*;
import java.net.*;
public final class Experience {
 private static String cachedRaw="";private static JSONObject cachedData=new JSONObject();
 public static synchronized JSONObject data(ZikrStore s){String raw=s.value("experience","{}");if(!raw.equals(cachedRaw)){try{cachedData=new JSONObject(raw);}catch(Exception e){cachedData=new JSONObject();}cachedRaw=raw;}return cachedData;}
 public static JSONArray themes(ZikrStore s){JSONArray list=data(s).optJSONArray("themes");return list==null?new JSONArray():list;}
 public static String themeId(ZikrStore s){JSONObject active=data(s).optJSONObject("active");return active!=null&&active.optLong("expiresAt")>System.currentTimeMillis()?active.optString("id",s.value("theme","emerald")):s.value("theme","emerald");}
 public static JSONObject theme(ZikrStore s){String id=themeId(s);JSONArray list=themes(s);for(int i=0;i<list.length();i++){JSONObject item=list.optJSONObject(i);if(item!=null&&id.equals(item.optString("id")))return item;}return null;}
 public static String path(ZikrStore s,String target){JSONObject bg=data(s).optJSONObject("backgrounds");String path=bg==null?"":bg.optString(target);return path.matches("/media/[a-f0-9-]{36}[.](jpg|png|webp)")?path:"";}
 private static File file(Context c,String path){return new File(c.getCacheDir(),"background-"+path.substring(path.lastIndexOf('/')+1));}
 public static String signature(Context c,ZikrStore s){String main=path(s,"main"),menu=path(s,"menu");return themeId(s)+":"+String.valueOf(theme(s))+":"+main+":"+menu+":"+(!main.isEmpty()&&file(c,main).exists())+":"+(!menu.isEmpty()&&file(c,menu).exists());}
 public static Drawable background(Context c,ZikrStore s,String target,int color){
  String path=path(s,target);if(path.isEmpty()||!file(c,path).exists())return new ColorDrawable(color);
  BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeFile(file(c,path).getPath(),bounds);if(bounds.outWidth<=0)return new ColorDrawable(color);
  BitmapFactory.Options options=new BitmapFactory.Options();options.inSampleSize=1;while(Math.max(bounds.outWidth,bounds.outHeight)/options.inSampleSize>1600)options.inSampleSize*=2;
  Bitmap image=BitmapFactory.decodeFile(file(c,path).getPath(),options);if(image==null)return new ColorDrawable(color);BitmapDrawable photo=new BitmapDrawable(c.getResources(),image);photo.setGravity(android.view.Gravity.FILL);
  return new LayerDrawable(new Drawable[]{photo,new ColorDrawable((color&0x00ffffff)|0xc8000000)});
 }
 public static void accept(Context c,ZikrStore s,JSONObject config){if(config==null)return;s.put("experience",config.toString());Reminders.news(c,config);
  for(String target:new String[]{"main","menu"}){String path=path(s,target);if(path.isEmpty())continue;File output=file(c,path);if(output.exists())continue;
   try{URI base=URI.create(s.value("base",""));if(!"https".equals(base.getScheme())||base.getHost()==null||base.getUserInfo()!=null)continue;
    HttpURLConnection connection=(HttpURLConnection)new URL(base+path).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
    try{if(connection.getResponseCode()!=200)continue;ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1){if(bytes.size()+count>5*1024*1024)throw new IOException("Image too large");bytes.write(buffer,0,count);}}
     byte[] data=bytes.toByteArray();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(data,0,data.length,bounds);if(bounds.outWidth<=0||bounds.outHeight<=0)continue;File temp=new File(output.getPath()+".tmp");try(FileOutputStream out=new FileOutputStream(temp)){out.write(data);}if(!temp.renameTo(output))temp.delete();
    }finally{connection.disconnect();}
   }catch(Exception ignored){}
  }
 }
}
