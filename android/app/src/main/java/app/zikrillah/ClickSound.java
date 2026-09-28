package app.zikrillah;
import android.content.Context;
import android.media.*;
import java.util.*;
public final class ClickSound {
 public static final String[] KEYS={"beads","water","rain","stones","soft"};
 private final SoundPool pool;private final Map<String,Integer> sounds=new HashMap<>();private final Set<Integer> ready=new HashSet<>();private final int round;
 public ClickSound(Context context){pool=new SoundPool.Builder().setMaxStreams(4).setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();pool.setOnLoadCompleteListener((p,id,status)->{if(status==0)ready.add(id);});for(String key:KEYS)sounds.put(key,load(context,key+".wav"));round=load(context,"round.wav");}
 private int load(Context c,String name){try(android.content.res.AssetFileDescriptor fd=c.getAssets().openFd(name)){return pool.load(fd,1);}catch(Exception e){return 0;}}
 public void play(boolean complete,String key){int id=sounds.getOrDefault(key,sounds.get("beads"));if(ready.contains(id))pool.play(id,.65f,.65f,1,0,1);}
 public void release(){pool.release();}
}
