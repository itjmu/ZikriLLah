package app.zikrillah;

/** Shared gate for touch and accessibility clicks; uses a monotonic clock. */
public final class TapGate {
    private long last;private boolean accepted;
    public boolean accept(long now,int interval){
        if(accepted&&now-last<interval)return false;
        last=now;accepted=true;return true;
    }
}
