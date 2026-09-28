package app.zikrillah;

/** A tap is one short stationary pointer; scrolling, menus and multitouch never count. */
public final class TapGesture {
    private float x,y;private long start;private boolean eligible;
    public void down(float x,float y,long time,boolean excluded){this.x=x;this.y=y;start=time;eligible=!excluded;}
    public void move(float x,float y,float slop){if(Math.hypot(x-this.x,y-this.y)>slop)eligible=false;}
    public void cancel(){eligible=false;}
    public boolean up(float x,float y,long time,float slop){move(x,y,slop);boolean result=eligible&&time-start<=500;eligible=false;return result;}
}
