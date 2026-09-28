package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
public class FeedbackPolicyTest {
 @Test public void separateControls(){assertTrue(FeedbackPolicy.sound(true,false,false));assertFalse(FeedbackPolicy.vibration(false,false,false,false));assertFalse(FeedbackPolicy.sound(false,false,false));assertTrue(FeedbackPolicy.vibration(true,false,false,false));}
 @Test public void discreetOnlyVibratesAtRoundEnd(){assertFalse(FeedbackPolicy.sound(true,false,true));assertFalse(FeedbackPolicy.vibration(true,false,true,false));assertTrue(FeedbackPolicy.vibration(false,false,true,true));}
 @Test public void silenceOverridesEverything(){assertFalse(FeedbackPolicy.sound(true,true,false));assertFalse(FeedbackPolicy.vibration(true,true,true,true));}
}
