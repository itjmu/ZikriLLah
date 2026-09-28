package app.zikrillah;
import java.time.*;
public final class ReminderTime {
 public static long next(long now,ZoneId zone,int hour,int minute){ZonedDateTime time=Instant.ofEpochMilli(now).atZone(zone);ZonedDateTime next=time.toLocalDate().atTime(hour,minute).atZone(zone);if(!next.isAfter(time))next=time.toLocalDate().plusDays(1).atTime(hour,minute).atZone(zone);return next.toInstant().toEpochMilli();}
}
