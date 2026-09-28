package app.zikrillah;
public final class FeedbackPolicy {
 public static boolean sound(boolean enabled,boolean silent,boolean stealth){return enabled&&!silent&&!stealth;}
 public static boolean vibration(boolean enabled,boolean silent,boolean stealth,boolean complete){return !silent&&(stealth?complete:enabled);}
}
