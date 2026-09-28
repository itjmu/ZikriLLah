package app.zikrillah;
import org.junit.Test;
import static org.junit.Assert.*;
public class TapGateTest {
    @Test public void physicalAndPostedClickShareTheSameGate(){TapGate gate=new TapGate();assertTrue(gate.accept(1000,200));assertFalse(gate.accept(1001,200));assertFalse(gate.accept(1100,200));assertTrue(gate.accept(1200,200));}
    @Test public void intervalCanBeChangedWithoutResettingHistory(){TapGate gate=new TapGate();assertTrue(gate.accept(0,200));assertFalse(gate.accept(300,500));assertTrue(gate.accept(500,500));}
}
