package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
import java.time.*;

public class PracticeStatsTest {
    @Test public void calendarUsesDeviceTimezoneAndMonthBoundary(){
        PracticeStats s=new PracticeStats(33,LocalDate.of(2026,9,1),ZoneId.of("Asia/Karachi"));
        s.add(true,"2026-08-31T20:00:00Z");s.add(false,"2026-08-31T10:00:00Z");s.add(true,"2026-08-20T10:00:00Z");
        assertEquals(1,s.today);assertEquals(1,s.yesterday);assertEquals(1,s.month);assertEquals(3,s.total);assertEquals(2,s.selected);
    }
    @Test public void roundCompletesThenRestartsWithoutResettingTotal(){
        PracticeStats s=new PracticeStats(33,LocalDate.of(2026,9,1),ZoneId.of("UTC"));
        for(int i=0;i<33;i++)s.add(true,"2026-09-01T12:00:00Z");assertEquals(33,s.current());assertEquals(1,s.rounds());
        s.add(true,"2026-09-01T12:00:00Z");assertEquals(1,s.current());assertEquals(34,s.total);
    }
    @Test public void skippedDaysDoNotBecomeYesterday(){
        PracticeStats s=new PracticeStats(99,LocalDate.of(2026,9,5),ZoneId.of("UTC"));s.add(true,"2026-09-01T12:00:00Z");assertEquals(0,s.yesterday);assertEquals(0,s.today);assertEquals(1,s.month);
    }
}
