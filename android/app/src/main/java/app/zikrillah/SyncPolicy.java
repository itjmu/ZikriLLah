package app.zikrillah;
import java.time.*;
public final class SyncPolicy {
 public static long slot(long now,ZoneId zone){ZonedDateTime time=Instant.ofEpochMilli(now).atZone(zone);LocalDate day=time.toLocalDate();for(int hour:new int[]{22,12,7}){long at=day.atTime(hour,0).atZone(zone).toInstant().toEpochMilli();if(at<=now)return at;}return day.minusDays(1).atTime(22,0).atZone(zone).toInstant().toEpochMilli();}
 public static long next(long now,ZoneId zone,long completed){if(slot(now,zone)>completed)return now;LocalDate day=Instant.ofEpochMilli(now).atZone(zone).toLocalDate();for(int hour:new int[]{7,12,22}){long at=day.atTime(hour,0).atZone(zone).toInstant().toEpochMilli();if(at>now)return at;}return day.plusDays(1).atTime(7,0).atZone(zone).toInstant().toEpochMilli();}
}
