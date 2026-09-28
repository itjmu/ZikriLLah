package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;
public class SyncPolicyTest {
 @Test public void fiveExchangesThenMidnight(){ZoneId zone=ZoneId.of("Asia/Karachi");long now=ZonedDateTime.of(2026,9,28,20,0,0,0,zone).toInstant().toEpochMilli();String day=SyncPolicy.day(now,zone);for(int used=0;used<5;used++)assertEquals(now,SyncPolicy.next(now,zone,day,used,0));assertEquals(ZonedDateTime.of(2026,9,29,0,0,0,0,zone).toInstant().toEpochMilli(),SyncPolicy.next(now,zone,day,5,0));}
 @Test public void staleDayResetsQuotaAndFastReentryWaits(){ZoneId zone=ZoneId.of("UTC");long now=Instant.parse("2026-09-29T12:00:00Z").toEpochMilli();assertEquals(now,SyncPolicy.next(now,zone,"2026-09-28",5,0));assertEquals(now+59000,SyncPolicy.next(now,zone,"2026-09-29",1,now-1000));}
}
