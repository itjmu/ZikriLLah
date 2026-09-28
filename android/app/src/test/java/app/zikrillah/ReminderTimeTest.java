package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;
public class ReminderTimeTest {
 @Test public void nextMorningAndAfterSeven(){ZoneId zone=ZoneId.of("Asia/Karachi");long before=ZonedDateTime.of(2026,9,28,6,0,0,0,zone).toInstant().toEpochMilli();assertEquals(ZonedDateTime.of(2026,9,28,7,0,0,0,zone).toInstant().toEpochMilli(),ReminderTime.next(before,zone,7,0));assertEquals(ZonedDateTime.of(2026,9,29,7,0,0,0,zone).toInstant().toEpochMilli(),ReminderTime.next(before+3600000,zone,7,0));}
 @Test public void followsLocalTimeAcrossDaylightSaving(){ZoneId zone=ZoneId.of("Europe/Berlin");long now=ZonedDateTime.of(2026,3,28,12,0,0,0,zone).toInstant().toEpochMilli();assertEquals(ZonedDateTime.of(2026,3,29,7,0,0,0,zone).toInstant().toEpochMilli(),ReminderTime.next(now,zone,7,0));}
}
