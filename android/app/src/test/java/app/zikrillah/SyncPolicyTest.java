package app.zikrillah;
import org.junit.Test;import static org.junit.Assert.*;import java.time.*;
public class SyncPolicyTest {
private final ZoneId zone=ZoneId.of("Asia/Karachi");private long at(int day,int hour){return ZonedDateTime.of(2026,10,day,hour,0,0,0,zone).toInstant().toEpochMilli();}
@Test public void onceAfterSuccess(){long now=at(3,15);assertEquals(now,SyncPolicy.next(now,zone,"",0));assertEquals(at(4,0),SyncPolicy.next(now,zone,"2026-10-03",0));}
@Test public void failedAttemptRetriesWithoutLosingDay(){long now=at(3,15);assertEquals(now+900000,SyncPolicy.next(now,zone,"2026-10-02",now+900000));assertEquals(now,SyncPolicy.next(now,zone,"2026-10-02",0));}
@Test public void usesLocalDay(){assertEquals("2026-10-03",SyncPolicy.day(at(3,0),zone));assertEquals("2026-10-02",SyncPolicy.day(at(3,0),ZoneId.of("UTC")));}
}
