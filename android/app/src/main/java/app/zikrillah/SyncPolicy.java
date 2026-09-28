package app.zikrillah;
import java.time.*;
public final class SyncPolicy {
 public static final int LIMIT=5;
 public static String day(long now,ZoneId zone){return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().toString();}
 public static long next(long now,ZoneId zone,String savedDay,int used,long lastAttempt){
  if(day(now,zone).equals(savedDay)&&used>=LIMIT)return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();
  return Math.max(now,lastAttempt+60_000);
 }
}
