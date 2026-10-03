package app.zikrillah;
import java.time.*;
public final class SyncPolicy {
 public static String day(long now,ZoneId zone){return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().toString();}
 public static long next(long now,ZoneId zone,String successDay,long retryAt){if(day(now,zone).equals(successDay))return Instant.ofEpochMilli(now).atZone(zone).toLocalDate().plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli();return Math.max(now,retryAt);}
}
