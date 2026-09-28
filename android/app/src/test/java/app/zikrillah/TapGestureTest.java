package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
public class TapGestureTest {
    @Test public void normalTapCountsExactlyOnce(){TapGesture g=new TapGesture();g.down(10,10,0,false);assertTrue(g.up(11,10,100,8));assertFalse(g.up(11,10,101,8));}
    @Test public void menuSwipeLongPressAndMultitouchDoNotCount(){TapGesture g=new TapGesture();g.down(10,10,0,true);assertFalse(g.up(10,10,100,8));g.down(10,10,0,false);g.move(50,10,8);assertFalse(g.up(10,10,100,8));g.down(10,10,0,false);assertFalse(g.up(10,10,900,8));g.down(10,10,0,false);g.cancel();assertFalse(g.up(10,10,100,8));}
}
