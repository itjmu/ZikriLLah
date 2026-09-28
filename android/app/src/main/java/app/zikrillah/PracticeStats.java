package app.zikrillah;
import java.time.*;

public final class PracticeStats {
    public int total,today,yesterday,month,selected;
    public final int[] week=new int[7];
    public Instant first,last;
    private final int goal;
    private final LocalDate date;
    private final ZoneId zone;
    public PracticeStats(int goal,LocalDate date,ZoneId zone){this.goal=goal;this.date=date;this.zone=zone;}
    public void add(boolean matches,String at){
        Instant instant=Instant.parse(at);LocalDate local=instant.atZone(zone).toLocalDate();total++;if(matches)selected++;long days=java.time.temporal.ChronoUnit.DAYS.between(local,date);if(days>=0&&days<7)week[6-(int)days]++;
        if(local.equals(date))today++;if(local.equals(date.minusDays(1)))yesterday++;
        if(local.getYear()==date.getYear()&&local.getMonth()==date.getMonth())month++;
        if(first==null||instant.isBefore(first))first=instant;if(last==null||instant.isAfter(last))last=instant;
    }
    public int current(){return selected==0?0:(selected-1)%goal+1;}
    public int rounds(){return selected/goal;}
    public int milestone(){for(int target:new int[]{3500,7000,14000,30000,50000})if(total<target)return target;return 50000;}
}
