package app.zikrillah;
import org.junit.Test;import static org.junit.Assert.*;import java.time.*;
public class SyncPolicyTest {
private final ZoneId zone=ZoneId.of("Asia/Karachi");
private long at(int day,int hour){return ZonedDateTime.of(2026,10,day,hour,0,0,0,zone).toInstant().toEpochMilli();}
@Test public void threeSlots(){assertEquals(at(3,7),SyncPolicy.next(at(3,6),zone,at(2,22)));assertEquals(at(3,12),SyncPolicy.next(at(3,7),zone,at(3,7)));assertEquals(at(3,22),SyncPolicy.next(at(3,12),zone,at(3,12)));assertEquals(at(4,7),SyncPolicy.next(at(3,22),zone,at(3,22)));}
@Test public void missedSlotsCoalesce(){assertEquals(at(3,15),SyncPolicy.next(at(3,15),zone,at(2,22)));assertEquals(at(3,12),SyncPolicy.slot(at(3,15),zone));assertEquals(at(2,22),SyncPolicy.slot(at(3,6),zone));}
@Test public void daylightSavingUsesLocalTime(){ZoneId berlin=ZoneId.of("Europe/Berlin");long now=ZonedDateTime.of(2026,10,24,23,0,0,0,berlin).toInstant().toEpochMilli();long next=SyncPolicy.next(now,berlin,SyncPolicy.slot(now,berlin));assertEquals(7,Instant.ofEpochMilli(next).atZone(berlin).getHour());assertEquals(25,Instant.ofEpochMilli(next).atZone(berlin).getDayOfMonth());}
}
